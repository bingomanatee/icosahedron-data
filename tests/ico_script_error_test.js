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

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {

        tap.test('ico-data', {timeout: 1000 * 100, skip: false }, function (suite) {

            suite.test('set param', {timeout: 1000 * 100, skip: false }, function (param_test) {
                manager.set_param('foo', 3, function (err, feedback) {
                    param_test.deepEqual(feedback, [
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
                            console.log('feedback error: %s', util.inspect(err));
                            script_test.deepEqual(feedback,
                                [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38 ],
                                'feedback from sectorx2');

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
