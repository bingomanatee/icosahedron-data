var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: return the longitude for each point
 * @return void
 *
 * @param detail {posint}
 * @param client {Client}
 * @param callback {function}
 */

function longitude(detail, client, callback) {
    var longitudes = [];

    var scripts = client.point_data[detail].map(function (point) {
        return function (done) {
            var h_extent = point.uv[0];
            var degree = Math.round(360 * h_extent) - 180;
            client.queue_point_data('longitude', detail, point.ro, degree);
            longitudes.push({ro: point.ro, value: degree});
            done();
        }
    });

    async.parallel(scripts, function () {
        client.save_point_data_queue('longitude', detail, function(){
            callback(null, longitudes);
        });
    });
}

/* -------------- EXPORT --------------- */

module.exports = longitude;