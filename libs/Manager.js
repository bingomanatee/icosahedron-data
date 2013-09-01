var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var zmq = require('zmq');
var config = require('./../config.json');
var events = require('events');
var Gate = require('gate');

var Manager_Message = require('./Manager_Message.js');

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

    do: function (script_path, callback, detail) {
        var done = 0;
        this.send('all', 'do', {
            detail: detail,
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

    load_points: function (detail) {
        if (!this.load_point_state) {
            this.load_point_state = [];
        }
        this.load_point_state[detail] = [];
        this.send('all', 'load points', detail);
    },

    /**
     * tell clients to connect to mongo.
     * @param connection {string}
     * @param callback {function}
     */
    connect: function (connection, callback) {
        this.collect_client_feedback('mongo connect', callback);
        this.send('all', 'mongo connect', connection);
    },

    set_time: function (time, callback) {
        this.send('all', 'set time', time, callback);

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

                if (!msg_json.type) return console.log('error: message JSON has no type');

                switch(msg_json.type){

                    case 'ready':
                        this.client_ready(msg_json.sector);
                    break;


                }
            } catch (err) {
                console.log('error parsing message: %s %s', msg, err);
            }
        }
    },

    send: function (target, type, data, callback) {
        var message = new Manager_Message(target, type, data, callback);
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
});

module.exports = Manager;