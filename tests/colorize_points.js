var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');
var ico = require('icosahedron');

var connection = "mongodb://localhost/test_ico_data_" + Math.floor(Math.random() * 100000);
var SCRIPTS_ROOT = path.resolve(__dirname, '../test_scripts');1

var MAX_TIME = 30;
var DETAIL = 4;
var sector_colors = path.resolve(SCRIPTS_ROOT, 'sector_colors.js');
var async = require('async');
var mongoose = require('mongoose');

var Colors = require(path.resolve(SCRIPTS_ROOT, 'colors_model.js'))();
/**
 * testing execution of scripts with no errors.
 */

if (cluster.isMaster) {

    icod.init_manager(function (err, manager) {
            manager.connect(connection, function () {
                tap.test('ico-data', {timeout: 1000 * 1000, skip: false }, function (suite) {
                    suite.test('rationalize and map reduce', {timeout: 1000 * 1000, skip: false }, function (lp_test) {

                        manager.load_points(DETAIL, function () {
                            function done() {
                                Colors.make_movie(function () {

                                    manager.shut_down(function () {
                                        cluster.disconnect(function () {
                                            console.log('done with colorize_points for %s', connection);
                                            mongoose.connection.close();
                                            lp_test.end();
                                        })
                                    });
                                });
                            }

                            function do_sector_colors(time) {

                                function summarize_colors_to_sectors() {
                                    manager.map_reduce_sector_data(0, {
                                        field: 'color', detail: DETAIL, time: time, output_collection: 'colors', 'sector': 'all'
                                    }, function () {
                                        Colors.draw_sector_colors(time, DETAIL, function () {
                                            if (time < MAX_TIME) {
                                                do_sector_colors(time + 1);
                                            } else {
                                                done();
                                            }
                                        });

                                    });
                                }

                                manager.set_time(time, function () {
                                    manager.do(sector_colors, function (err, results) {
                                        manager.rationalize_multiple_values('all', {
                                            field: 'color',
                                            detail: DETAIL,
                                            'comp_value': path.resolve(SCRIPTS_ROOT, 'average_color_value.js'),
                                            time: time
                                        }, summarize_colors_to_sectors);
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
