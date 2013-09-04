var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

/* ------------ CLOSURE --------------- */

/*function _points_to_sectors(response) {
    return response.reduce(function (out, sector_points) {
        var pd = sector_points.response.points.map(function (ro) {
            return {ro: ro, s: sector_points.response.sector};
        });

        return out.concat(pd);
    }, []);
}

function _points_at_border(points){
    var grouped = _.groupBy(points, 'ro');
    var points_at_border = [];

    _.each(grouped, function (points, ro) {
        if (points.length > 1) {
            points_at_border.push({ro: points[0].ro, sectors: _.pluck(points, 's')})
        }
    });
}

*//**
 *
 * @param detail {int}
 * @param response [ [{point}...{point}], []..[]]
 * @param self {Manager}
 * @param callback {function}
 *
 * @private
 *//*
function _add_borders(detail, response, self, callback) {

    var points = _points_to_sectors(response);

    var points_at_border = _points_at_border(points);

    var bg = points_at_border.reduce(function (out, border_pt) {
        border_pt.sectors.forEach(function (s) {
            out[s].push(border_pt);
        })
        return out;
    }, _.range(0, 20).map(function () {
        return [];
    }));

    // console.log('points_at_border: %s', util.inspect(bg, true, 5));

    var queue = async.queue(function (data, callback) {
        self.set_borders(detail, data.sector, data.points, callback);
    }, 20);

    queue.drain = callback;

    queue.push(bg.map(function (points, sector) {
        //     console.log('pushing border points: %s', util.inspect(points));
        return {points: points, sector: sector};
    }));
}*/

/** ********************
 * Purpose: to load the point data at a given resolution
 * @return void
 */

function load_points(detail, callback) {
    var self = this;
    this.send('all', 'load points', detail, callback)
}

/* -------------- EXPORT --------------- */

module.exports = load_points;