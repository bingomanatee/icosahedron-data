var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var zmq = require('zmq');
var config = require('./../config.json');
var events = require('events');

function Manager() {

    this.publisher = zmq.socket('pub');
    this.publisher.identity = 'manager';
    this.publisher.bindSync(config.publish_port);

    this.listener = zmq.socket('router');
    this.listener.identity = 'manager-validator';
    this.listener.bindSync(config.respond_port);
    this.listener.on('message', _.bind(this.listen, this));
}

util.inherits(Manager, events.EventEmitter);

_.extend(Manager.prototype, {

    listen: function(envelope, message){
        console.log('manager got %s from %s', message, envelope);
    },

    send: function(sector_id, message){
        console.log('manager sending %s to ', message, sector_id);
        this.publisher.send(util.format('%s %s', sector_id, message));
    }
});

module.exports = Manager;