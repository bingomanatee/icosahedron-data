var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var zeromq = require('zmq');
var config = require('./../config.json');
var events = require('events');

/**
 * Creates a listener that does work on planetary data
 *
 * Processes a single sector.
 *
 * @param sector {posint 0..19}
 * @constructor
 */

function Client(sector) {
    this.sector = sector;
    this.listener = zeromq.socket('sub');
    this.listener.identity = 'sector-' + sector;
    this.listener.connect(config.publish_port);
    this.listener.subscribe(sector);
    this.listener.subscribe('all');
    this.listener.on('message', _.bind(this.message, this));

    this.responder = zeromq.socket('dealer');
    this.responder.identity = 'sector-r-' + sector;
    this.responder.connect(config.respond_port);

    this.point_data = [];

    var self = this;
    process.nextTick(function () {
        self.ready();
    });
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

    send: function (type, data) {
        this.responder.send(JSON.stringify({
            type: type,
            sector: this.sector,
            data: data
        }))
    },

    error: function (error, message) {
        this.responder.send(JSON.stringify({
            type: 'error',
            error: error,
            message: message
        }));
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

        switch (data.type) {
            case 'detail':
                var detail = data.value;
                if (!_.isNumber(detail) && (detail < 0 && detail > 6)) {
                    return this.error('invalid detail nust be integer 0..6', m);
                }

                this.load_points(data.value);

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