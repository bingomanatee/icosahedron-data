var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');
var cluster = require('cluster');
var icod = require('./../index.js');

if (cluster.isMaster) {

    var manager = icod.init();

    manager.on('sectors::ready', function () {

        tap.test('ico-data', {timeout: 1000 * 100, skip: false }, function (suite) {

            suite.test('startup, load points and shutdown', {timeout: 1000 * 10, skip: false }, function (init_test) {

                init_test.equal(manager.ready_sectors(), 20, '20 sectors are ready');

                manager.load_points(4);

                manager.on('sectors::points loaded', function (detail, data) {
               //    console.log('points loaded at detail %s: %s', detail, util.inspect(data));

                    init_test.equal(data.length, 20);
                    init_test.deepEqual(
                        _.pluck(
                        _.pluck(data, 'data'), 'points'),
                        _.range(0, 20).map(function () {
                            return 153
                        }),
                        'all sectors have 153 points'
                    );

                    manager.shut_down();

                    manager.on('sectors::shut down', function () {

                        init_test.equal(manager.ready_sectors(), 0, 'no sectors are ready');
                        init_test.end();
                    })
                })

            });

            suite.end();

        });


    });

} else {
    icod.init_child();
}
