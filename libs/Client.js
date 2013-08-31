var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var zeromq = require('zmq');
var config = require('./../config.json');
var events = require('events');
var mongoose = require('mongoose');
var pd = require('./Point_Data');
var _DEBUG_DO = false;

var Point_Data = pd();

/**
 * Creates a listener that does work on planetary data
 *
 * Processes a single sector.
 *
 * @param sector {posint 0..19}
 * @param noZero {boolean} do not use Zero -- for mocking purposes
 * @constructor
 */


function Client(sector, noZero) {
    this.sector = parseInt(sector);
    this.noZero = !! noZero;
    this.data_queue = [];
    this.ro_indexes = [];
    if (!noZero){
        this.listener = zeromq.socket('sub');
        this.listener.identity = 'sector-' + sector;
        this.listener.connect(config.publish_port);
        this.listener.subscribe(sector);
        this.listener.subscribe('all');
        this.listener.on('message', _.bind(this.message, this));

        this.responder = zeromq.socket('dealer');
        this.responder.identity = 'sector-r-' + sector;
        this.responder.connect(config.respond_port);
    }
    this.time = 0;

    this.point_data = [];

    var self = this;
    process.nextTick(function () {
        self.ready();
    });

    this.pid = process.pid;
}

util.inherits(Client, events.EventEmitter);

_.extend(Client.prototype, {

    ready: function () {
        try {
            this.send('ready', this.sector);
        } catch (err) {
            console.log('error sending: %s', err);
        }
    },

    load_points: function (detail) {
        var ico = require('icosahedron');
        var self = this;
        ico.io.points(function (err, points) {
            self.point_data[detail] = points;
            self.send('points loaded', {detail: detail, points: points.length});
        }, detail, this.sector);
    },

    send: function (type, data, callback) {
        var data = JSON.stringify({
            type: type,
            sector: this.sector,
            data: data
        });

        if (this.noZero) {
           if (callback) callback(null, data);
        } else {
            this.responder.send(data)
        }
    },

    error: function (error, data) {
        if (_.isObject(error)) error = error.toString();
        this.send('error', {
            error: error,
            data: data
        });
    },

    mongo_connect: function (conn) {
        mongoose.connect(conn);
        this.send('mongo connect', true);
        this.once('shut down', function () {
            mongoose.connection.close();
        })
    },

    /**
     *
     * @param callback { function} called when data is saved
     * @param field {string} the name of the field
     * @param detail {int} the detail level at which the data is stored.
     * @param ro {int} the real order of the point
     * @param value {any} the value to set
     */

    set_point_data: function (callback, field, detail, ro, value) {
        var args = _.toArray(arguments);
        if (!_.isFunction(callback)){
            return this.error('set_point_data requires a callback function', args);
        }
        var query = {ro: ro, field: field, detail: detail, sector: this.sector, time: this.time};
        var data = _.extend({value: value}, query);
        new Point_Data(data).save(callback);
        // a safer update        Point_Data.update(query, {$set: data}, {upsert: true, safe: true}, callback);
    },

    index_ros: function(detail){
          if (!this.ro_indexes[detail]){
              this.ro_indexes[detail] = _.sortBy(_.pluck(this.point_data[detail], 'ro'),_.identity);
          }
        return this.ro_indexes[detail];
    },

    queue_point_data: function(field, detail, ro, value){
        this.index_ros(detail);
        if (!this.data_queue[detail]) this.data_queue[detail] = {};
        if (!this.data_queue[detail][field]) this.data_queue[detail][field] = [];
        var index = _.indexOf(this.ro_indexes[detail], ro, true);
      //  console.log('index of %s: %s', ro, index);
        this.data_queue[detail][field][index] = value;
    },

    save_point_data_queue: function(field, detail, callback){
        data = this.data_queue[detail][field];
        ros = this.ro_indexes[detail];
        var time = this.time;
        var sector = this.sector;

        var records = data.reduce(function(out, value, index){
            var data = {
                ro: ros[index],
                detail: detail,
                field: field,
                time: time,
                sector: sector,
                value: value
            };

          //  console.log('pushing data %s', util.inspect(data));
            out.push(data);
            return out;
        }, []);

        var self = this;
        Point_Data.collection.insert(records, {multi: true}, function(){
            delete self.data_queue[detail][field];
            callback(null, records);
        });
    },

    /**
     * Returns data for a single point
     *
     * @param callback {function} accepts data
     * @param field {string} the name of the field to be polled
     * @param detail {posint} the level of detail to be polled
     * @param ro {posint} the point real order.
     */
    get_point_data: function (callback, field, detail, ro) {
        //@TODO: check queue!
        var query = {ro: ro, field: field, detail: detail, time: this.time};
      //  console.log( 'query: %s', util.inspect(query));
        Point_Data.findOne(query, function(err, record){
            callback(null, record.value);
        })
    },

    get_sector_data: function (callback, field, detail) {
        var query = {field: field, sector: this.sector, detail: detail, time: this.time};
     //   console.log('gsd: %s', util.inspect(query));
        //@TODO: check queue!
        Point_Data.find(query, function(err, data){

        //    console.log('data found for %s: %s',util.inspect(query), util.inspect(data).substr(0, 100));

            var summary = data.map(function(item){
              //  console.log('item: %s', util.inspect(item));
                return _.pick(item, 'ro', 'value');
            });

            callback(null, summary);
        });
    },

    /**
     * execute an external script
     * @param data
     */
    do: function (data) {
        //@TODO : ensure point data exists
        var self = this;
        if (!data.detail) {
            this.error('no detail level in data', data);
        } else if (!data.script) {
            this.error('no script to do', data);
        } else {
            var script;
            try {
                script = require(data.script);
            } catch (err) {
                return  this.error(err.toString(), data);
            }

            if (!_.isFunction(script)) {
                this.error('script is not function', data);
            } else {
                try {
                    script(data.detail, this, function (err, value) {
                        if (_DEBUG_DO) console.log('sector %s done with %s: value %s', self.sector, data.script, util.inspect(value).substr(0, 100));
                        self.send(data.script_id, {value: value});
                    });
                } catch (err) {
                    this.error('error in script ' + data.script, {
                        error: err.toString(),
                        stack: err.stack,
                        data: data
                    });
                }
            }
        }
    },

    message: function (m) {
        if (!_.isString(m)) m = m.toString().replace(/^(all|[\d]+) /, '');

        try {
            var data = JSON.parse(m);
        } catch (err) {
            return  this.error('cannot parse', m);
        }

        if (!(data.hasOwnProperty('type') && data.type && data.hasOwnProperty('value'))) {
            return this.error('badly formed message', m);
        }
        var self = this;

        switch (data.type) {
            case 'detail':
                var detail = data.value;
                if (!_.isNumber(detail) && (detail < 0 && detail > 6)) {
                    return this.error('invalid detail must be integer 0..6', m);
                }

                this.load_points(data.value);
                break;

            case 'mongo connect':
                this.mongo_connect(data.value);
                break;

            case 'set time':
                this.time = data.value;
                this.emit('time', data.value);
                this.set('set time', data.value);
                break;

            case 'do':
                this.do(data.value);
                break;

            case 'load points':
                this.load_points(data.value);
                break;

            case 'shut down':
                this.emit('shut down');

                this.send('shut down', true);
                break;

            default:
                return this.error('cannot understand type ' + data.type, m);

        }


    }
});

module.exports = Client;