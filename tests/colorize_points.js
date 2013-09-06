var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');
var ico = require('icosahedron');

var connection = "mongodb://localhost/test_ico_data_" + Math.floor(Math.random() * 100000);
var SCRIPTS_ROOT = path.resolve(__dirname, '../test_scripts');
1

var MAX_TIME = 12;
var DETAIL = 5;
var MAKE_MOVIE = false;

var sector_colors = path.resolve(SCRIPTS_ROOT, 'sector_colors.js');
var async = require('async');
var mongoose = require('mongoose');

var Colors = require(path.resolve(SCRIPTS_ROOT, 'colors_model.js'))();
/**
 * testing execution of scripts with no errors.
 */

var benchmarks = {
    load_points: 0,
    connect: 0,
    map_reduce: [],
    rationalize: [],
    color_sectors: [],
    render_map: []
}

function _t(since) {
    var t = new Date().getTime();
    if (since) return t - since;
    return t;
}

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {
            manager.connect(connection, function () {
                tap.test('ico-data', {timeout: 1000 * 1000, skip: false }, function (suite) {
                    suite.test('rationalize and map reduce', {timeout: 1000 * 1000, skip: false }, function (lp_test) {

                        var lp_time = _t();
                        manager.load_points(DETAIL, function () {
                            benchmarks.load_points = _t(lp_time);


                            function shutdown(){
                                manager.shut_down(function () {
                                    cluster.disconnect(function () {
                                        console.log('done with colorize_points for %s', connection);
                                        console.log('benchmarks: %s', JSON.stringify(benchmarks, true, 4));
                                        mongoose.connection.close();
                                        lp_test.end();
                                    })
                                });
                            }

                            function done() {
                                if (MAKE_MOVIE) {
                                    Colors.make_movie(shutdown);
                                } else {
                                    shutdown();
                                }
                            }

                            function do_sector_colors(time) {

                                function summarize_colors_to_sectors() {
                                    var scs = _t();
                                    manager.map_reduce_sector_data(0, {
                                        field: 'color', detail: DETAIL, time: time, output_collection: 'colors', 'sector': 'all'
                                    }, function () {
                                        benchmarks.map_reduce.push(_t(scs));
                                        var d = _t();
                                        Colors.draw_sector_colors(time, DETAIL, function () {
                                            benchmarks.render_map.push(_t(d));
                                            if (time < MAX_TIME) {
                                                do_sector_colors(time + 1);
                                            } else {
                                                done();
                                            }
                                        });

                                    });
                                }

                                manager.set_time(time, function () {
                                    var sc_time = _t();
                                    manager.do(sector_colors, function (err, results) {
                                        benchmarks.color_sectors.push(_t(sc_time));
                                        var rmv = _t();
                                        manager.rationalize_multiple_values('all', {
                                            field: 'color',
                                            detail: DETAIL,
                                            'comp_value': path.resolve(SCRIPTS_ROOT, 'average_color_value.js'),
                                            time: time
                                        }, function () {
                                            benchmarks.rationalize.push(_t(rmv));
                                            summarize_colors_to_sectors();
                                        });
                                    }, {detail: DETAIL});

                                })

                            }

                            do_sector_colors(0);

                        });

                    });

                    suite.end();

                });

            })

        }
    )

} else {
    icod.init_child();
}
