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
 * @param data {object}
 * @param client {Client}
 * @param callback {function}
 */

function latitude(data, client, callback) {
    var detail = data.data;
    var latitudes = [];
    client.point_script(function(point, done){
        var v_extent = point.uv[1];
        var degree = 90 - Math.round(180 * v_extent);
        client.queue_point_data('latitude', detail, point.ro, degree);
        latitudes.push({ro: point.ro, value: degree});
        done();
    }, detail, function(err, result){
     //   console.log('result of point_script: %s, %s', util.inspect(err), util.inspect(result));
        if (err) callback(err);
        callback(null, latitudes);
    })
}

/* -------------- EXPORT --------------- */

module.exports = latitude;