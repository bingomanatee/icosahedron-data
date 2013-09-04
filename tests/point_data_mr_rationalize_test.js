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

var DETAIL = 2;
var sxt = path.resolve(SCRIPTS_ROOT, 'sector_x_time.js');
var async = require('async');
var mongoose = require('mongoose');
var po = require('./../libs/Point_Data.js');
var Point_Data = po();

/**
 * testing execution of scripts with no errors.
 */

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {
            manager.connect(connection, function () {

                var SXT = mongoose.model('sxts', {_id: 'string', value: {
                    sector: 'number',
                    time: 'number',
                    detail: 'number',
                    data: [{
                        ro: 'number',
                        value: 'number'
                    }]
                }});

                tap.test('ico-data', {timeout: 1000 * 1000, skip: false }, function (suite) {

                    suite.test('rationalize and map reduce', {timeout: 1000 * 1000, skip: false }, function (lp_test) {

                        manager.load_points(DETAIL, function () {

                            function done() {
                                Point_Data.find().count(function(err, count){
                                    console.log('%s points', count);
                                });

                                setTimeout(function () {

                                    SXT.find({}).sort({'value.time': 1, 'value.sector': 1}).exec( function (err, records) {
                                    //    console.log('err: %s, records: %s', err, records.length);

                                        records.forEach(function (record) {
                                            console.log('--- time %s sector %s --- ', record.value.time, record.value.sector);
                                            record.value.data.forEach(function (ro) {
                                                console.log('%s: %s', ro.ro, ro.value);
                                            });

                                        });

                                        manager.shut_down(function () {
                                            cluster.disconnect(function () {
                                                console.log('done with SXT for %s', connection);
                                                lp_test.end();
                                            })
                                        });

                                    });
                                }, 5000);
                            }

                            function do_sxt(time) {
                                manager.set_time(time, function () {

                                    manager.do(sxt, function (err, results) {
                                        manager.rationalize_multiple_values('all', {
                                            field: 'sxt',
                                            detail: DETAIL,
                                            time: time
                                        }, function (err, result) {

                                            manager.map_reduce_sector_data(0, {
                                                field: 'sxt', detail: DETAIL, time: time, output_collection: 'sxts', 'sector': 'all'
                                            }, function () {
                                                if (time < MAX_TIME) {
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

        }
    )
    ;

} else {
    icod.init_child();
}
