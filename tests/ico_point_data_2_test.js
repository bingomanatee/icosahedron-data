var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');
var connection = "mongodb://localhost/test_ico_data_" + Math.floor(Math.random() * 100000);

var SCRIPTS_ROOT = path.resolve(__dirname, '../test_scripts');

/**
 * testing execution of scripts with no errors.
 */

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {
        manager.connect(connection, function () {

            tap.test('ico-data', {timeout: 1000 * 100, skip: false }, function (suite) {

                suite.test('loading points', function (lp_test) {

                    manager.load_points(0, function (err, data) {
                        var response = _.pluck(data, 'response');
                        //console.log('done loading points.... %s', util.inspect(response));

                        lp_test.deepEqual(_.range(0, 20)
                            .map(function () {
                                return 3
                            }), response, 'three points loaded for each zero level sector');

                        manager.do(path.resolve(SCRIPTS_ROOT, 'latitude.js'),
                            function (err, data) {

                             //   console.log('latitudes: %s, %s', util.inspect(err), util.inspect(data));

                                var latitudes = _.flatten(data).reduce(function (o, item) {
                                    o[item.ro] = item.value;
                                    return o;
                                }, []);

                                lp_test.deepEqual(latitudes,
                                    [ -58, -58, 58, 58, 32, -32, 32, -32, 0, 0, 0, 0 ],
                                    'latitudes');

                                manager.shut_down(function () {
                                    cluster.disconnect(function () {
                                        lp_test.end();
                                    });

                                });
                            }, 0)
                    });

                });

                suite.end();

            });

        })

    });

} else {
    icod.init_child();
}
