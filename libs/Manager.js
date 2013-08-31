var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var zmq = require('zmq');
var config = require('./../config.json');
var events = require('events');

var _DEBUG_LISTEN = false;
var _DEBUG_SEND = false;
var _DEBUG_LO = false;

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

    this.client_feedback_listeners = [];
}

var _script_id = 0;

util.inherits(Manager, events.EventEmitter);

_.extend(Manager.prototype, {

    client_ready: function (sector_id) {
        var id = parseInt(sector_id);
        this.ready[id] = arguments.length > 1 ? arguments[1] : true;

        //console.log('sector %s ready: total ready %s', sector_id, this.ready_sectors());
        if (this.ready_sectors() == 20) {
            this.emit('sectors::ready');
        }
    },

    do: function (script_path, detail, callback) {
        var script_id = ++_script_id;

        this.collect_client_feedback(script_id, callback);
        this.send('all', 'do', {
            script_id: script_id,
            detail: detail,
            script: script_path
        });
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

    collect_client_feedback: function (type, callback) {
        this.client_feedback_listeners.push({type: type, values: [], feedback: [], responses: 0, callback: callback});
    },

    set_time: function(time, callback){
        this.collect_client_feedback()
        this.send('all', 'set time', time);

    },

    /**
     * @TODO: use event emitters
     * @param data {object}
     */
    update_listeners: function (data) {

        //   console.log('listeners: %s', util.inspect(this.client_feedback_listeners));

        var listeners = this.client_feedback_listeners.filter(function (cfl) {
            return (cfl.type == data.type) && (!cfl.done);
        });

        if (listeners.length) {

            if (!data.hasOwnProperty('sector')) {
                throw new Error('listener response has no sector: ' + util.inspect(data));
            }
            if (_.isString(data.sector) && data.sector) {
                if (!/^[\d]{1,2}$/.test(data.sector)) {
                    throw new Error('bad sector for data: ' + util.inspect(data));
                }
                data.sector = parseInt(data.sector);
            }

            if (_.isNaN(data.sector)){
                throw new Error('bad sector for data: ' + util.inspect(data));
            }

            listeners.forEach(function (cfl) {

                if (!cfl.feedback[data.sector]) {
                    if (_DEBUG_LO)  console.log('data for cfl %s', data.type, util.inspect(data.data.value));

                    cfl.values[data.sector] = data.data.value;
                    cfl.feedback[data.sector] = true;
                    ++cfl.responses;

                    if (cfl.responses >= 20) {
                        cfl.done = true;
                        cfl.callback(null, cfl.values);
                    }
                }
            });

            this.client_feedback_listeners = _.reject(this.client_feedback_listeners, function (cfl) {
                return cfl.done;
            });
        }

        return listeners.length;
    },

    listen: function (envelope, msg) {
        msg = msg.toString();
        if (_DEBUG_LISTEN)  console.log('manager got %s from %s', util.inspect(msg), envelope);

        var data;
        try {
            data = JSON.parse(msg);
        } catch (err) {
            console.log('cannot parse %s: err', msg, err);
            return;
        }

        var update_count = this.update_listeners(data);

        switch (data.type) {
            case 'ready':
                this.client_ready(data.sector);
                break;

            case 'points loaded':
                var detail = parseInt(data.data.detail);
                var lpsd = this.load_point_state[detail];

                lpsd.push(data);
                if (this.load_point_state[detail].length >= 20) {
                    this.emit('sectors::points loaded', data.data.detail, this.load_point_state[detail]);
                }
                break;

            case 'shut down':
                this.client_ready(data.sector, false);

                if (this.ready_sectors() < 1) {
                    this.emit('sectors::shut down');
                }
                break;

            case 'error':
                console.log('error: %s --- %s', data.error, util.inspect(data));
                break;

            default:
                if (!update_count) {
                    console.log('got unknown type %s', data.type);
                }
        }
    },

    send: function (sector_id, msg, data) {
        if (data) {
            msg = JSON.stringify({type: msg, value: data});
        }
        if (_DEBUG_SEND)  console.log('manager sending %s to ', msg, sector_id);
        this.publisher.send(util.format('%s %s', sector_id, msg));
    },

    shut_down: function () {
        this.send('all', 'shut down', true);
    }
});

module.exports = Manager;