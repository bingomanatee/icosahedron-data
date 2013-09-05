var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var zmq = require('zmq');
var config = require('./../config.json');
var events = require('events');
var Gate = require('gate');

var Manager_Message = require('./Manager_Message.js');
var mongoose = require('mongoose');
var async = require('async');

var _DEBUG_LISTEN = false;
var _DEBUG_SEND = false;

function Manager() {
    this.ready = _.range(0, 20).map(function () {
        return false;
    });

//    The publisher communicates to sector workers.
    this.publisher = zmq.socket('pub');
    this.publisher.identity = 'manager';
    this.publisher.bindSync(config.publish_port);
//     The listener listens to feedback from sectors.
    this.listener = zmq.socket('router');
    this.listener.identity = 'manager-validator';
    this.listener.bindSync(config.respond_port);
    this.listener.on('message', _.bind(this.listen, this));

    var self = this;
    this.on('sectors::shut down', function () {
        self.listener.close();
        self.publisher.close();
    });

    this.sent_messages = [];
}

var _script_id = 0;

util.inherits(Manager, events.EventEmitter);

_.extend(Manager.prototype, {

    client_ready: function (sector) {
        var id = parseInt(sector);
        this.ready[id] = arguments.length > 1 ? arguments[1] : true;

        //   console.log('sector %s ready: total ready %s', sector, this.ready_sectors());
        if (this.ready_sectors() == 20) {
            this.emit('sectors::ready');
        }
    },

    do: function (script_path, callback, data) {
        var done = 0;
        this.send('all', 'do', {
            data: data,
            script: script_path
        }, function (err, results) {
            ++done;
            if (done > 1) throw new Error('overdoing it');
            callback(err, _.pluck(results, 'response'));
        });
    },

    set_param: function (name, value, callback) {
        this.send('all', 'set param', {name: name, value: value}, callback);
    },

    ready_sectors: function () {
        return  this.ready.reduce(function (out, v) {
            return v ? out + 1 : out;
        }, 0);
    },

    set_borders: function (detail, sector, points, done) {
        this.send(sector, 'border points', {detail: detail, points: points}, done);
    },

    load_points: require('./Manager/load_points'),

    /**
     * tell clients to connect to mongo.
     * @param connection {string}
     * @param callback {function}
     */
    connect: function (connection, callback) {
        mongoose.connect(connection);
        this.send('all', 'mongo connect', connection, callback);

    },

    set_time: function (time, callback) {
        this.send('all', 'set time', time, callback);

    },

    /**
     * Tell sectors to average (or otherwise rationalize) contradictory data for sector edge values.
     *
     * @param sector {int} -- the sector that will update the collection.
     * @param params {object}
     *      field {string}
     *      time {int|'all'}  - which time to dump out
     *      sector {int|'all'} - You can dump all the fields from a request to a single sector, or only its own data.
     *      detail {int|'all'} - the level of detail of data to export
     *
     * @param callback {function}
     */

    rationalize_multiple_values: function (sector, params, callback) {
        if (!_.isFunction(callback)) throw new Error('no callback to rmv');
        this.send(sector, 'rationalize multiple values', params, callback);
    },

    /**
     * send a map reduce imperative to dump a field to a collection.
     * note that this is an update reduce -- it will repeatedly add to the same collection.
     * note that one sector can call a map reduce to update its own data, or the entire dataset;
     * its more efficient to call map reduce once on all the points' fields.
     *
     * @param sector {int} -- the sector that will update the collection.
     * @param params {object}
     *      field {string}
     *      time {int|'all'}  - which time to dump out
     *      sector {int|'all'} - You can dump all the fields from a request to a single sector, or only its own data.
     *      detail {int|'all'} - the level of detail of data to export
     *      comp_value {string} [optional] - a script to reduce multiple point values into a single (average) value.
     *      output_collection {string} - the collection to save data into.
     *
     * @param callback
     */
    map_reduce_sector_data: function (sector, params, callback) {
        this.send(sector, 'map reduce sector data', params, callback);
    },

    listen: function (envelope, msg) {
        msg = msg.toString();
        if (_DEBUG_LISTEN)  console.log('manager got %s from %s', util.inspect(msg), envelope);

        var responded = _.find(this.sent_messages, function (message) {
            return message.respond(msg);
        });

        if (_DEBUG_LISTEN) console.log('responded: %s', util.inspect(responded, true, 0));

        if (!responded) {
            try {
                var msg_json = JSON.parse(msg);

                if (!msg_json.type) return console.log('error: message JSON has no type .. ' + msg);

                switch (msg_json.type) {

                    case 'ready':
                        this.client_ready(msg_json.sector);
                        break;


                }
            } catch (err) {
                console.log('error parsing message: %s %s', msg, err);
            }
        }
    },

    send: function (target, type, data, callback, delay) {

        if (!delay) delay = 40 * 1000;
        var t = setTimeout(function () {
            console.log('hanging action: %s, %s %s', target, type, util.inspect(data));
        }, delay);

        var message = new Manager_Message(target, type, data, function (err, result) {
            clearTimeout(t);
            callback(err, result);
        });
        this.sent_messages.push(message);
        var out = message.output();
        if (_DEBUG_SEND) console.log('sending %s', out);
        this.publisher.send(out);
    },

    shut_down: function (callback) {
        var self = this;
        this.send('all', 'shut down', true, function () {
            self.emit('sectors::shut down');
            callback();
        });
    }
})
;

module.exports = Manager;