var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');

var SCRIPTS_ROOT = path.resolve(__dirname, '../test_scripts');
var DETAIL = 3;
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

        var connection = "mongodb://localhost/test_ico_data_" + Math.floor(Math.random() * 100000);
        console.log('connected to %s', connection);

        tap.test('ico-data', {timeout: 1000 * 100000, skip: false }, function (suite) {

            suite.test('startup, load points and shutdown -- depth ' + DETAIL, {timeout: 1000 * 1000, skip: false }, function (init_test) {

                init_test.equal(manager.ready_sectors(), 20, '20 sectors are ready');

                manager.load_points(DETAIL);

                manager.once('sectors::points loaded', function (detail, data) {
                    //    console.log('points loaded at detail %s: %s', detail, util.inspect(data));

                    init_test.equal(data.length, 20);
                    init_test.deepEqual(
                        _.pluck(
                            _.pluck(data, 'data'), 'points'),
                        _.range(0, 20).map(function () {
                            return SECTOR_COUNT
                        }),
                        'all sectors have ' + SECTOR_COUNT + ' points'
                    );

                    manager.connect(connection, function () {

                        //   console.log('connected');

                        var time = new Date().getTime();
                        var lat_done = false;
                        var lon_done = false;

                        function check_done() {
                            //   console.log('check done: lat_done %s, lon_done: %s', lat_done, lon_done);
                            if (lat_done && lon_done) {

                                manager.do(path.resolve(SCRIPTS_ROOT, 'lat_lon.js'), DETAIL, function (err, results) {
                                    var done = new Date().getTime();

                                    //   console.log('lat lon run time %s ms', done - t2);
                                    init_test.ok(_.isArray(results), 'results are array');
                                    results.forEach(function (data) {
                                        init_test.equal(data.length, SECTOR_COUNT, 'results have ' + SECTOR_COUNT + ' values');
                                    });

                                    results = _.flatten(results);
                                    console.log('calculations: %s', results.length);
                                    console.log('results of lat/lon: %s', JSON.stringify(results, true).substr(0, 100));

                                    var t2 = new Date().getTime();
                                    console.log('total parallel execution time: %s secs', Math.round((t2 - time) / 1000));
                                    manager.shut_down();

                                    manager.on('sectors::shut down', function () {

                                        init_test.equal(manager.ready_sectors(), 0, 'no sectors are ready');
                                        init_test.end();
                                    });
                                });

                            }
                        }

                        manager.do(path.resolve(SCRIPTS_ROOT, 'latitude.js'), DETAIL, function (err, results) {
                            var done = new Date().getTime();

                            //    console.log('lat run time %s ms', done - time);
                            init_test.ok(_.isArray(results), 'results are array');
                            results.forEach(function (data) {
                                init_test.equal(data.length, SECTOR_COUNT, 'results have ' + SECTOR_COUNT + ' values');
                            });

                            results = _.flatten(results).reduce(function (out, item) {
                                out[item.ro] = item.value;
                                return out;
                            }, []);
                            //       console.log('calculations: %s', results.length);
                            //     console.log('results of latitude: %s', JSON.stringify(results, true).substr(0, 100));
                            lat_done = true;

                            check_done();


                        });

                        manager.do(path.resolve(SCRIPTS_ROOT, 'longitude.js'), DETAIL, function (err, results) {
                            var done = new Date().getTime();

                            //  console.log('lon run time %s ms', done - time);
                            init_test.ok(_.isArray(results), 'results are array');
                            results.forEach(function (data) {
                                init_test.equal(data.length, SECTOR_COUNT, 'results have ' + SECTOR_COUNT + ' values');
                            });

                            results = _.flatten(results).reduce(function (out, item) {
                                out[item.ro] = item.value;
                                return out;
                            }, []);
                            //    console.log('calculations: %s', results.length);
                            //  console.log('results of longitude: %s', JSON.stringify(results, true).substr(0, 100));
                            lon_done = true;

                            check_done();


                        });

                    });

                })

            });

            suite.test('serial time', {skip: true, timeout: 1000 * 1000}, function (st_test) {
                var client = new icod.Client(21, true);
                client.time = 1;
                var ico = require('icosahedron');
                ico.io.points(function (err, data) {
                    client.point_data[DETAIL] = data;
                    var time = new Date().getTime();

                    var lat_done = false;
                    var lon_done = false;

                    function check_done() {
                        if (lat_done && lon_done) {
                            client.do({
                                script_id: 3,
                                detail: DETAIL,
                                script: path.resolve(SCRIPTS_ROOT, 'lat_lon.js')
                            })
                        }
                    }

                    client.send = function (type, data) {
                        switch (type) {
                            case 3:
                            case '3':
                                var done_time = new Date().getTime();
                                console.log('lat lon serial done in %s sec: result = %s',
                                    Math.round((done_time - time) / 1000),
                                    util.inspect(data.value).substr(0, 100)
                                );
                                st_test.end();
                                break;

                            case 1:
                            case '1':
                                lat_done = true;
                                check_done();
                                break;

                            case 2:
                            case '2':
                                lon_done = true;
                                check_done();
                                break;

                            case 'mongo connect':
                                client.do({
                                    script_id: 1,
                                    detail: DETAIL,
                                    script: path.resolve(SCRIPTS_ROOT, 'latitude.js')
                                });

                                client.do({
                                    script_id: 2,
                                    detail: DETAIL,
                                    script: path.resolve(SCRIPTS_ROOT, 'longitude.js')
                                });
                                break;

                            default:
                                console.log('sending %s  %s', type, util.inspect(data));

                        }

                    };

                    client.mongo_connect(connection);
                }, DETAIL);

            });

            suite.end();

        });

    });

} else {
    icod.init_child();
}
