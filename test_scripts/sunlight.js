var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var THREE = require('three');

/* ------------ CLOSURE --------------- */

/** ********************
 * figure the cosine for each point
 *
 *
 * Purpose: to calculate the angle of incidence of the sun to every point on the sphere
 * @return void
 */

function sunlight(input, client, callback) {
   // console.log('sunlight script input: %s', util.inspect(input));
    var detail = input.data.detail;

    client.point_script(function(point){

        var sun_point = [input.data.sun.x, input.data.sun.y, input.data.sun.z];

        var dist_squared = point.c.reduce(function(out, n, i){
            var d = sun_point[i] - n;
            return out + (d * d);
        }, 0);

        var cos = (2 - dist_squared)/2;

        client.queue_point_data('sun_cos', detail, point.ro, cos, input.data.time);

    }, detail, function(){
        console.log('sent point data for time %s, sector %s', input.data.time, client.sector);
       client.save_point_data_queue ('sun_cos', detail, callback)
    });
}

/* -------------- EXPORT --------------- */

module.exports = sunlight;