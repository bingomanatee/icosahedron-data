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
 * @param detail {int}
 * @param client {Client}
 * @param callback {function}
 */

function latitude(detail, client, callback) {
    // console.log('loading lat lon for client %s', client.sector);
    var latitudes = [];
    var longitudes = [];

    var ro_index = client.index_ros(detail);
    /*
     var scripts = client.point_data[detail].map(function (point) {
     var index = _.indexOf(ro_index, point.ro);

     return function (done) {
     client.get_point_data(function (err, lat) {
     latitudes[index] = lat;
     client.get_point_data(function(err, lon){
     longitudes[index] = lon;
     //  console.log('loaded lat/lon (%s, %s) for point %s', lat, lon, point.ro);
     done();
     }, 'longitude', detail, point.ro);
     }, 'latitude', detail, point.ro);
     };
     });*/

    scripts = [
        function (done) {
            client.get_sector_data(function (err, lats) {
             //   console.log('lats in sector data: %s', util.inspect(lats).substr(0, 100));
                latitudes = lats.reduce(function (out, item) {
              //      console.log('lat value: %s', util.inspect(item));
                    var index = _.indexOf(ro_index, item.ro);
                    out[index] = item.value;
                    return out;
                }, []);
                done();
            }, 'latitude', detail);
        },
        function (done) {
            client.get_sector_data(function (err, lons) {
             //   console.log('lons in sector data: %s', util.inspect(lons).substr(0, 100));
                longitudes = lons.reduce(function (out, item) {
                //    console.log('lat value: %s', util.inspect(item));
                    var index = _.indexOf(ro_index, item.ro);
                    out[index] = item.value;
                    return out;
                }, []);
                done();
            }, 'longitude', detail);
        }
    ];

    async.parallel(scripts, function () {
          console.log('lat lon done for sector %s', client.sector);
        var data = ro_index.reduce(function (out, ro, index) {
            var item = {ro: ro, lat: latitudes[index], lon: longitudes[index]};
            out.push(item);
            return out;
        }, []);

        callback(null, data);
    });
}

/* -------------- EXPORT --------------- */

module.exports = latitude;