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
 * Testing receipt of errors from scripts
 */

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {

        tap.test('ico-data', {timeout: 1000 * 100, skip: false }, function (suite) {

            suite.test('set param', {timeout: 1000 * 100, skip: false }, function (param_test) {
                manager.set_param('foo', 3, function (err, feedback) {
                    param_test.deepEqual(_.pluck(feedback, 'value'), [
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 },
                        { name: 'foo', value: 3 }
                    ], 'value set feedback');

                    param_test.test('script error test', function (script_test) {

                        manager.do(path.resolve(SCRIPTS_ROOT, 'error_gen.js'), function (err, feedback) {
                            script_test.deepEqual(err, [ { sector: 3, error: 'Error in sector 3' },
                                { sector: 6, error: 'Error in sector 6' } ], 'received errors');
                            feedback.forEach(function(value, sector){
                                switch(sector){
                                    case 3:
                                        case 6:
                                        script_test.ok(!value, 'no value for 3 and 6');
                                        break;

                                    default:
                                        script_test.equal(value, 2 * sector, 'value for ' + sector + ' is 2 x sector');
                                }
                            });

                            manager.shut_down(function () {
                                cluster.disconnect(function () {
                                    script_test.end();
                                });

                            });
                        });
                    });
                    param_test.end();
                })

            });

            suite.end();

        });

    });

} else {
    icod.init_child();
}
