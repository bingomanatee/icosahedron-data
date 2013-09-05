var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var zeromq = require('zmq');
var config = require('./../config.json');
var events = require('events');
var mongoose = require('mongoose');
var async = require('async');

var Client_Message = require('./Client_Message.js');

var _DEBUG_DO = false;
var _DEBUG_FEEDBACK = false;
var _DEBUG_PARAM = false;
var _DEBUG_WORKER = false;
var _DEBUG_MESSAGE = false;

var pd = require('./Point_Data');
var Point_Data = pd();

/**
 * Creates a listener that does work on planetary data
 *
 * Processes a single sector.
 *
 * @param sector {int} 0..19
 * @param noZero {boolean} do not use Zero -- for mocking purposes
 * @constructor
 */


function Client(sector, noZero) {
    this.sector = parseInt(sector);
    this.noZero = !!noZero;
    this.data_queue = [];
    this.ro_indexes = [];
    this.params = {};
    if (!noZero) {
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
            this.send({type: 'ready', value: true});
        } catch (err) {
            console.log('error sending: %s', err);
        }
    },

    load_points: function (message) {
        var detail = parseInt(message.value());
        var ico = require('icosahedron');
        var self = this;
        ico.io.points(function (err, points) {
            self.point_data[detail] = points;
            message.respond_with({sector: self.sector, points: points});
        }, detail, this.sector);
    },

    map_reduce_sector_data: require('./Client/map_reduce_sector_data'),

    rationalize_overlap_values: require('./Client/rationalize_multple_values.js'),

    /**
     * sends a message object to the manager
     *
     * @param message {object}
     * @param callback
     */
    send: function (message, callback) {
        if (!_.isObject(message)) {
            message = {
                value: message
            }
        }

        message.sector = this.sector;
        var m_string;

        try {
            m_string = JSON.stringify(message);
        } catch (err) {
            console.log('error stringifying %s: %s', util.inspect(message), err);
        }

        if (m_string) {
            if (this.noZero) {
                if (callback) callback(null, m_string);
            } else {
                this.responder.send(m_string)
            }
        }
    },

    /**
     * connect to a mongoose URL.
     *
     * Note, there is no direct feedback/callback from mongo/mongoose.
     * Its expected that the feedback comes from attempts to do mongo activity.
     *
     * @param message
     */
    mongo_connect: function (message) {
        mongoose.connect(message.value());

        this.once('shut down', function () {
            mongoose.connection.close();
        })
        message.feedback();
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
        if (!_.isFunction(callback)) {
            return this.error('set_point_data requires a callback function', args);
        }
        var query = {ro: ro, field: field, detail: detail, sector: this.sector, time: this.time};
        var data = _.extend({value: value}, query);
        new Point_Data(data).save(callback);
        // a safer update        Point_Data.update(query, {$set: data}, {upsert: true, safe: true}, callback);
    },

    index_ros: function (detail) {
        if (!this.ro_indexes[detail]) {
            this.ro_indexes[detail] = _.sortBy(_.pluck(this.point_data[detail], 'ro'), _.identity);
        }
        return this.ro_indexes[detail];
    },

    point_script: require('./Client/point_script'),

    queue_point_data: function (field, detail, ro, value, time) {
        if (!time) time = this.time;
        if (!this.data_queue[detail]) this.data_queue[detail] = {};
        if (!this.data_queue[detail][field]) this.data_queue[detail][field] = [];
        var info = {time: time, ro: ro, value: value};
        // console.log('pushing %s into field %s, detail %s', util.inspect(info), field, detail);
        this.data_queue[detail][field].push(info);
    },

    save_point_data_queue: require('./Client/save_point_data_queue'),

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
        Point_Data.findOne(query, function (err, record) {
            callback(null, record.value);
        })
    },

    get_sector_data: function (callback, field, detail) {
        var query = {field: field, sector: this.sector, detail: detail, time: this.time};
        //   console.log('gsd: %s', util.inspect(query));
        //@TODO: check queue!
        Point_Data.find(query, function (err, data) {

            //    console.log('data found for %s: %s',util.inspect(query), util.inspect(data).substr(0, 100));

            var summary = data.map(function (item) {
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
    do: function (message) {
        //@TODO : ensure point data exists
        //  if (_DEBUG_DO) console.log('sector %s doing %s', this.sector, util.inspect(data));
        var self = this;

        if (!message.value('script')) {
            message.error('no script found');
        } else {
            var script;
            try {
                script = require(message.value('script'));
            } catch (err) {
                return  message.error(util.format('problem requiring script: %s', err))
            }

            if (!_.isFunction(script)) {
                message.error('script is not a function');
            } else {
                try {
                    script(message.value(), this, function (err, value) {
                        if (err) {
                            if (_DEBUG_DO) console.log('!!! ....... CLIENT sector %s ERROR with %s: value %s', self.sector, message.value('script'), util.inspect(value).substr(0, 100));
                            message.error(err);
                        } else {
                            if (_DEBUG_DO) console.log('....... CLIENT sector %s done with %s: value %s', self.sector, message.value('script'), util.inspect(value).substr(0, 100));
                            message.feedback(message.response(value));
                        }
                    });
                } catch (err) {
                    console.log('client script error: %s', err);
                    message.error(err);
                }
            }
        }
    },

    set_param: function (message) {
        var value = message.value();
        if (!(value.hasOwnProperty('name') && value.hasOwnProperty('value'))) {
            message.error('does not have name and value property');
        }
        var name = value.name;
        var param_value = value.value;

        if (_DEBUG_PARAM) console.log('setting parameter of sector %s: %s = %s', this.sector, name, param_value);
        this.params[name] = param_value;
        message.feedback();
    },

    send_feedback: function (data) {
        if (!data.message_id) return;
        if (_DEBUG_FEEDBACK)  console.log('sending feedback for message_id %s', util.inspect(data));
        this.send('feedback', {message_id: data.message_id, value: data.value});
    },

    points: function (detail) {
        return this.point_data[detail];
    },

    set_border_points: function (message) {
        var value = message.value();

        var detail = value.detail;
        var sector_points = value.points;

        var points = this.points(detail);

        if (!points) {
            return message.error('cannot get points at detail ' + detail);
        }

        var self = this;
        points.forEach(function (point) {
            var sector_point = _.find(sector_points, function (sp) {
                return point.ro == sp.ro;
            });
          //  console.log('point %s sector point %s', util.inspect(point), util.inspect(sector_point));
            point.s = sector_point ? sector_point.sectors : [self.sector];
        });

      //  console.log('........ border points set for sector %s: %s', this.sector, util.inspect(points, 1, 3));

        message.feedback();
    },

    shut_down: function (message) {
        this.emit('shut down');
        var cluster = require('cluster');

        if (cluster.isWorker) {
            if (_DEBUG_WORKER)  console.log('shutting down worker #' + cluster.worker.id);
            message.feedback();
            process.nextTick(function () {
                cluster.worker.kill();
            });
        }
    },

    message: function (m) {
        if (!_.isString(m)) m = m.toString().replace(/^(all|[\d]+) /, '');
        if (_DEBUG_MESSAGE) console.log('sector %s recieved %s', this.sector, m);
        try {
            var data = JSON.parse(m);
        } catch (err) {
            console.log('cannot parse %s', m);
            //@TODO: send to manager
        }

        if (!(data.hasOwnProperty('type') && data.type && data.hasOwnProperty('value'))) {
            return this.error('badly formed message', m);
        }

        var message = new Client_Message(this, m);

        switch (message.type()) {
            case 'detail':
                var detail = data.value;
                if (!_.isNumber(detail) && (detail < 0 && detail > 6)) {
                    return this.error('invalid detail must be integer 0..6', m);
                }
                this.load_points(data.value);
                send_feedback = false;
                break;

            case 'border points':
                this.set_border_points(message);
                break;

            case 'map reduce sector data':
                this.map_reduce_sector_data(message);
                break;

            case 'mongo connect':
                this.mongo_connect(message);
                break;

            case 'rationalize multiple values':
                this.rationalize_overlap_values(message);
                break;

            case 'set time':
                this.time = data.value;
                this.emit('time', data.value);
                message.feedback();
                break;

            case 'set param':
                this.set_param(message);
                break;

            case 'do':
                this.do(message);
                break;

            case 'load points':
                this.load_points(message);
                break;

            case 'shut down':
                this.shut_down(message);
                break;

            default:
                console.log('cannot understand type ' + message.type(), m);

        }
    }
});

module.exports = Client;