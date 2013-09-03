var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');

var connection = "mongodb://localhost/test_ico_data_" + Math.floor(Math.random() * 100000);
var SCRIPTS_ROOT = path.resolve(__dirname, '../test_scripts');
var Sunlight_Sim = require(path.resolve(SCRIPTS_ROOT, 'Sunlight_Sim.js'));

var DETAIL = 0;
var sunlight_script = path.resolve(SCRIPTS_ROOT, 'sunlight.js');
var Gate = require('gate');

/**
 * testing execution of scripts with no errors.
 */

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {
        manager.connect(connection, function () {

            tap.test('ico-data', {timeout: 1000 * 1000, skip: false }, function (suite) {

                suite.test('sunlight sim', {timeout: 1000 * 1000, skip: false }, function (lp_test) {

                    manager.load_points(DETAIL, function () {

                        var sim = new Sunlight_Sim();

                        var gate = Gate.create();

                        _.range(0, 60).forEach(function (day) {
                            _.range(0, 24).forEach(function (hour) {
                                sim.set_time(day, hour);
                                var latch = gate.latch();
                                manager.do(sunlight_script, function(){
                                  if ((! (hour) && (!(day % 10))))  console.log('done day %s hour %s', day, hour);
                                    latch();
                                } , {time: 24 * day + hour, detail: DETAIL, sun: sim.sun_normal()});
                            })
                        });

                        gate.await(function () {

                            console.log('sunlight script run for conn %s', connection);
                            manager.shut_down(function () {
                                cluster.disconnect(function () {
                                    lp_test.end();
                                });

                            });
                        });

                    });

                });

                suite.end();

            });

        })

    });

} else {
    icod.init_child();
}
