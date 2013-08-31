var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: return the latitude for each point
 * @return void
 *
 * @param detail {posint}
 * @param client {Client}
 * @param callback {function}
 */

function latitude(detail, client, callback) {
    var latitudes = [];

    var scripts = client.point_data[detail].map(function (point) {
        return function (done) {
            var v_extent = point.uv[1];
            var degree = 90 - Math.round(180 * v_extent);
            client.queue_point_data('latitude', detail, point.ro, degree);
            latitudes.push({ro: point.ro, value: degree});
            done();
        }
    });

    async.parallel(scripts, function () {
        client.save_point_data_queue('latitude', detail, function(){
            callback(null, latitudes);
        });
    });
}

/* -------------- EXPORT --------------- */

module.exports = latitude;