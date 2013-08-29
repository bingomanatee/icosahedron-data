var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var zmq = require('zmq');
var config = require('./../config.json');
var events = require('events');

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
}

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

    ready_sectors: function () {
        return  this.ready.reduce(function (out, v) {  return v ? out + 1 : out;  }, 0);
    },

    listen: function (envelope, msg) {
        msg = msg.toString();
      if (_DEBUG_LISTEN)  console.log('manager got %s from %s', util.inspect(msg), envelope);

        try {
            var data = JSON.parse(msg);

        } catch (err) {
            console.log('cannot parse %s: err', msg, err);
            return;
        }

        switch (data.type) {
            case 'ready':
                this.client_ready(data.sector);
                break;

            case 'shut down':
                this.client_ready(data.sector, false);

                if(this.ready_sectors() < 1){
                    this.emit('sectors.::shut down');
                }
                break;

            default:
                console.log('got unknown type %s', data.type);

        };
    },

    send: function (sector_id, msg, data) {
        if (data){
            msg = JSON.stringify({type: msg, value: data});
        }
      if (_DEBUG_SEND)  console.log('manager sending %s to ', msg, sector_id);
        this.publisher.send(util.format('%s %s', sector_id, msg));
    },

    shut_down: function(){
        this.send('all', 'shut down', true);
    }
});

module.exports = Manager;