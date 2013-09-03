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
                    //console.log('done loading points.... %s', util.inspect(response));

                    lp_test.deepEqual(_.range(0, 20)
                        .map(function () {
                            return 3
                        }), response, 'three points loaded for each zero level sector');

                    manager.load_points(6, function (err, data) {
                        var response = _.pluck(data, 'response');

                        lp_test.deepEqual(_.range(0, 20)
                            .map(function () {
                                return 2145
                            }), response, '2145 points loaded for each 6 level sector');

                        manager.shut_down(function () {
                            cluster.disconnect(function () {
                                lp_test.end();
                            });

                        });
                    })
                });

            });

            suite.end();

        });

    });

} else {
    icod.init_child();
}
