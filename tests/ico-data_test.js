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

        tap.test('ico-data', {timeout: 1000 * 10, skip: false }, function (suite) {

            suite.test('startup and shutdown', {timeout: 1000 * 10, skip: false }, function (init_test) {

               init_test.equal(manager.ready_sectors(), 20, '20 sectors are ready');

                manager.shut_down();

                manager.on('sectors.::shut down', function(){

                    init_test.equal(manager.ready_sectors(), 0, 'no sectors are ready');
                    init_test.end();
                })
            });

            suite.end();

        });


    });

} else {
    icod.init_child();
}
