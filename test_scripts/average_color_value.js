var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: average color values for border point
 * @return [int, int, int]
 */

function acv(point_data) {
    var value = _.pluck(point_data, 'value').reduce(function (out, value) {
        out[0] += value[0];
        out[1] += value[1];
        out[2] += value[2];

        return out;

    }, [0, 0, 0]);
    value[0] /= point_data.length;
    value[1] /= point_data.length;
    value[2] /= point_data.length;
    var avg =  value.map(function(v){
        return Math.round(v);
    });


 //   console.log('reduced %s to %s ', util.inspect(_.pluck(point_data, 'value')), avg);
    return avg;
}
/* -------------- EXPORT --------------- */

module.exports = acv;