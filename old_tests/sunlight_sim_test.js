var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');


var SCRIPTS_ROOT = path.resolve(__dirname, '../test_scripts');
var Sunlight_Sim = require(SCRIPTS_ROOT , 'Sunlight_Sim.js');
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

    var manager = icod.init();

    var connection = "mongodb://localhost/test_ico_data_" + Math.floor(Math.random() * 100000);
    console.log('connected to %s', connection);

    var sim = new Sunlight_Sim();

    manager.on('sectors::ready', function () {

        tap.test('ico-data', {timeout: 1000 * 100000, skip: false }, function (suite) {

            suite.test('sunlight simulation ' + DETAIL, {timeout: 1000 * 1000, skip: false }, function (init_test) {

                init_test.equal(manager.ready_sectors(), 20, '20 sectors are ready');

                manager.load_points(DETAIL);

                manager.once('sectors::points loaded', function (detail, data) {
                    //    console.log('points loaded at detail %s: %s', detail, util.inspect(data));

                    manager.connect(connection, function () {

                        //   console.log('connected');

                        var time = new Date().getTime();

                        var day = 0;
                        var hour = 0;




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
                                    console.log('total parallel execution time: %s secs', Math.round((t2 - time)/1000));
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

                    });

                })

            });

            suite.end();

        });


    });

} else {
    icod.init_child();
}
