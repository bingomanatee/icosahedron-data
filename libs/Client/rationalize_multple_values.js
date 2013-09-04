var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var po = require('./../Point_Data.js');
var async = require('async');
var Point_Data = po();

/* ------------ CLOSURE --------------- */

/**
 * replace data from each of the passed-in points with the average value.
 * WARNING: point data must be numeric.
 *
 * @param point_data [{Point_Data}]
 * @param callback {function}
 * @returns {void}
 */
function merge_point_data(point_data, callback) {
    if (point_data[0].ro == 53) console.log('merge point data merging %s', util.inspect(point_data));

    var value = _.pluck(point_data, 'value').reduce(function (out, value) {
        return out + value;
    }, 0);
    value /= point_data.length;
    if (point_data[0].ro == 53)   console.log('average value for points %s: %s', _.pluck(point_data, 'ro'), value);

    /**
     * save each point with the averaged value
     * @type {*}
     */
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

    // console.log(' ================ sector %s overlap points: %s', this.sector, util.inspect(overlap_points));

    /**
     * find the point data for each point that belongs to more than one neighbor.
     *
     * @type {*}
     */
    var q = async.queue(function (point, callback) {
        Point_Data.find({detail: detail, ro: point.ro, time: time, field: field}, function (err, point_data) {
            merge_point_data(point_data, callback);
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