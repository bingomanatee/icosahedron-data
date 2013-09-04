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

function sxd(data, client, callback) {
    //console.log('sxt value: %s', util.inspect(data));
    var detail = data.data.detail;
    client.point_script(function (point, done) {
        var sxt = client.sector * client.time;
        client.queue_point_data('sxt', detail, point.ro, sxt);
        //   console.log('set point %s of sector %s to %s at time %s', point.ro, client.sector, sxt, client.time);
        done();
    }, detail, function (err) {
        if (err) return callback(err);
        client.save_point_data_queue('sxt', detail, callback);

    })
}

/* -------------- EXPORT --------------- */

module.exports = sxd;