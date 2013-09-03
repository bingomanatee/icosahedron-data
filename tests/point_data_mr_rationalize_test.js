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
var sxt = path.resolve(SCRIPTS_ROOT, 'sector_x_time.js');
var async = require('async');

/**
 * testing execution of scripts with no errors.
 */

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {
        manager.connect(connection, function () {

            tap.test('ico-data', {timeout: 1000 * 1000, skip: false }, function (suite) {

                suite.test('sunlight sim', {timeout: 1000 * 1000, skip: false }, function (lp_test) {

                    manager.load_points(DETAIL, function () {

                        function done(){
                            console.log('done with SXT for %s', connection);
                            manager.shut_down(function () {
                                cluster.disconnect(function () {
                                    lp_test.end();
                                });

                            });
                        }

                        function do_sxt(time){
                           manager.set_time(time, function(){

                               manager.do(sxt, function(){
                                   console.log('rationalizing sxt for time %s', time);
                                   manager.rationalize_multiple_values('all', {
                                       field: 'sxt',
                                       detail: DETAIL,
                                       time: time
                                   }, function(){
                                       console.log('M/R for time %s', time);

                                       manager.map_reduce_sector_data(0, {
                                           field: 'sxt'
                                           , detail: DETAIL
                                           , time: time
                                           , output_collection: 'sxt'
                                           , 'sector': 'all'
                                       }, function(){
                                           if (time < MAX_TIME){
                                               do_sxt(time + 1);
                                           } else {
                                               done();
                                           }
                                       });
                                   })
                               }, {detail: DETAIL});

                           })

                        }

                        var MAX_TIME = 10;
                        do_sxt(0);

                    });

                });

                suite.end();

            });

        })

    });

} else {
    icod.init_child();
}
