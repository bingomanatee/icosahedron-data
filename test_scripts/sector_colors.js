var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');
var Color = require('color');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: return the latitude for each point
 * @return void
 *
 * @param data {object}
 * @param client {Client}
 * @param callback {function}
 */
var colors = _.range(0, 20).map(function(sector){
    var c = Color().hsl(sector * 360/20, 100, 50);
    return c.rgbArray();
})

function sector_colors(data, client, callback) {
    var detail = data.data.detail;

    var latitudes = [];
    client.point_script(function (point, done) {
        var v_extent = point.uv[1];
        var degree = 90 - Math.round(180 * v_extent);
        var index = (client.sector + client.time) % 20;
        var color = colors[index];
      //  console.log('setting color of %s to %s', point.ro, color);
        client.queue_point_data('color', detail, point.ro, color);
        done();
    }, detail, function (err, result) {
        //   console.log('result of point_script: %s, %s', util.inspect(err), util.inspect(result));
        client.save_point_data_queue('color', detail, callback);
    })
}

/* -------------- EXPORT --------------- */

module.exports = sector_colors;