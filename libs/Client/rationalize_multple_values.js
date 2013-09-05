var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var po = require('./../Point_Data.js');
var async = require('async');
var Point_Data = po();

/* ------------ CLOSURE --------------- */

function _average_point_value(point_data) {
    return _.pluck(point_data, 'value').reduce(function (out, value) {
        return out + value;
    }, 0) / point_data.length;
}

/**
 * replace data from each of the passed-in points with the average value.
 * WARNING: point data must be numeric.
 *
 * @param point_data [{Point_Data}]
 * @param callback {function}
 * @param comp_value {function} optional
 * @returns {void}
 */
function merge_point_data(point_data, callback, comp_value) {
    if (point_data[0].ro == 53) console.log('merge point data merging %s', util.inspect(point_data));

    var value = comp_value ? comp_value(point_data) : _average_point_value(point_data);

    var queue = async.queue(function (point, callback) {
        point.value = value;
        point.save(callback);
    });

    queue.drain = callback;

    queue.push(point_data);
}

/**
 * reconciles divergent points at borders of sectors
 *
 * @param message {Client_Message}
 * @returns {*}
 */
function rationalize_multiple_values(message) {

    var value = message.value();
    var field = value.field;
    var time = value.time || this.time;
    var detail = value.detail;
    var comp_value = false;

    if (value.hasOwnProperty('comp_value')) {
        comp_value = require(value.comp_value);
      //  console.log('comp_value: %s', util.inspect(comp_value));
    } else {
      //  console.log('no comp value in %s', util.inspect(value));
    }

    if (!field) return message.error('map reduce with no field');

    var self = this;

    // these are the point_datas that overlap other sectors, and for which this is the lowest sector number of the overlap.
    //  console.log('checking overlap for field %s at detail %s of sector %s at time %s', field, detail, this.sector, time);

    var overlap_points = this.points(detail).filter(function (point) {
        return point.s.length > 1 && _.min(point.s, _.identity) == self.sector;
    });

    if (!overlap_points.length) {

        return message.feedback();

    }

   // console.log(' ================ detail %s sector %s overlap points: %s - %s', detail, this.sector, overlap_points.length, _.pluck(overlap_points, 'ro').join(', '));

    /**
     * find the point data for each point that belongs to more than one neighbor.
     *
     * @type {*}
     */
    var q = async.queue(function (point, callback) {
        var query =  {detail: detail, ro: point.ro, time: time, field: field};
        Point_Data.find(query, function (err, point_data) {

            if (!point_data.length){
                console.log('cannot find points with query %s', util.inspect(query));
                callback(new Error('no points for field + field'));
            } else {
                merge_point_data(point_data, callback, comp_value);
            }
        });
    }, 10);

    q.push(overlap_points);

    q.drain = function () {
        //  console.log(' >>>>>> done with overlaps for sector %s, detail %s, time %s', self.sector, detail, time);
        message.feedback();
    };

}

/* -------------- EXPORT --------------- */

module.exports = rationalize_multiple_values;