var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');

var SCRIPTS_ROOT = path.resolve(__dirname, '../test_scripts');
var DETAIL = 0;
var VERTICES = [
    12,
    42  ,
    162  ,
    642  ,
    2562  ,
    10242  ,
    40962  ,
    163842
];
var SECTOR_COUNTS = [
    3,
    6,
    15,
    45,
    153,
    561,
    2145
];

var SECTOR_COUNT = SECTOR_COUNTS[DETAIL];

/**
 * testing execution of scripts with no errors.
 */

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {

            tap.test('ico-data', {timeout: 1000 * 100, skip: false }, function (suite) {

                suite.test('loading points', function (lp_test) {

                    manager.load_points(0, function (err, data) {
                        var response = _.pluck(data, 'response');

                        manager.load_points(1, function (err, data) {
                           // console.log('done loading points.... %s', util.inspect(data, true, 5));

                            var responses = _.pluck(data, 'response');

                            responses.forEach(function(response){
                                lp_test.equal(response.points.length, 6, 'six points at level one sectors');
                                var sector_counts = response.points.reduce(function(out, point){
                                    if (out[point.s.length]){
                                        ++out[point.s.length];
                                    } else {
                                        out[point.s.length] = 1;
                                    }
                                    return out;
                                }, []);

                                lp_test.equal(sector_counts[2], 3, 'three two-sector points');
                                lp_test.equal(sector_counts[5], 3, 'three five-sector points');

                            });

                            manager.shut_down(function () {
                                cluster.disconnect(function () {
                                    lp_test.end();
                                });

                            });
                        })
                    }, true);

                });

                suite.end();

            });

        }
    );

} else {
    icod.init_child();
}
