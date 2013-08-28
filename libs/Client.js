var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var zeromq = require('zmq');
var config = require('./../config.json');

/**
 * Creates a listener that does work on planetary data
 *
 * Processes a single sector.
 *
 * @param sector_id {posint 0..19}
 * @constructor
 */

function Client(sector_id) {
    this.sector_id = sector_id;
    this.listener = zeromq.socket('sub');
    this.listener.identity = 'sector-' + sector_id;
    this.listener.connect(config.publish_port);
    this.listener.subscribe(sector_id);
    this.listener.on('message', _.bind(this.message, this));

    this.responder = zeromq.socket('dealer');
    this.responder.identity = 'sector-r-' + sector_id;
    this.responder.connect(config.respond_port);

}

_.extend(Client.prototype, {

    message: function(m){
        console.log('client %s got %s', this.sector_id, m);
        this.responder.send(m);
    }
});

module.exports = Client;