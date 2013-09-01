var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var tap = require('tap');

tap.test('ico_data', {timeout: 1000 * 10, skip: false }, function (suite) {
    var icod = require('./../index.js');

    suite.test('single_sector', {timeout: 1000 * 10, skip: false }, function (ss_test) {

        ss_test.test('different id', function (did_test) {
            var foo_called = 0;
            var message = new icod.Manager_Message(7, 'foo', {a: 10}, function () {
                ++foo_called;
            });

            did_test.equal(message.output(), '7 {"type":"foo","value":{"a":10},"message_id":1}', 'single sector message output');
            did_test.equal(message.done, false, 'not done at start');

            var response_string = JSON.stringify({message_id: 5, type: 'foo', value: {a: 10}});
            // has a different message_id
            var out = message.respond(response_string);

            did_test.equal(out, false, 'did not respond to different message id ');
            did_test.equal(message.done, false, 'not done after different message id');
            did_test.equal(foo_called, 0, 'foo is not called');

            did_test.end();
        });

        ss_test.test('same id', function (sid_test) {
            var foo_called = 0;
            var message = new icod.Manager_Message(7, 'foo', {a: 10}, function () {
                ++foo_called;
            });

            sid_test.equal(message.output(), '7 {"type":"foo","value":{"a":10},"message_id":2}', 'single sector message output');
            sid_test.equal(message.done, false, 'not done at start');

            var good_response_string = JSON.stringify({message_id: 2, sector: 7, type: 'foo', value: {a: 10}});
            // has the same message_id

            var out2 = message.respond(good_response_string);

            sid_test.equal(out2, true, 'did respond to same message id ');
            sid_test.equal(message.done, true, 'done after same message id');
            sid_test.equal(foo_called, 1, 'foo is called');

            var out3 = message.respond(good_response_string);
            sid_test.equal(out3, false, 'did nto respond to same message id twice');
            sid_test.equal(foo_called, 1, 'foo is not called twice');

            sid_test.end();
        });

        ss_test.test('error', function (sid_test) {
            var error = null;

            var message = new icod.Manager_Message(7, 'foo', {a: 10}, function (err, output) {
                error = err;
            });

            sid_test.equal(message.output(), '7 {"type":"foo","value":{"a":10},"message_id":3}', 'pre error sector message output');
            sid_test.equal(message.done, false, 'not done at start');

            var error_response_string = JSON.stringify({message_id: 3, sector: 7, type: 'foo', error: 'bad foo'});
            // has the same message_id

            var out2 = message.respond(error_response_string);
            sid_test.equal(out2, true, 'did respond to same message id ');
            sid_test.equal(message.done, true, 'done after same message id');
            sid_test.equal(error, 'bad foo', 'bad foo error read');

            sid_test.end();
        });

        ss_test.end();
    });


    suite.test('all_sector', {timeout: 1000 * 10, skip: false }, function (as_tests) {
        var foo_called = 0;
        var response_data;
        icod.Manager_Message.reset_id();

        as_tests.test('good all sector tests', function (gas_tests) {

            var message = new icod.Manager_Message('all', 'foo', {a: 10}, function (err, rd) {
                response_data = rd;
                ++foo_called;
            });

            _.range(0, 20).forEach(function (sector) {
                var sector_message_string = JSON.stringify({message_id: 1, sector: sector, type: 'foo', value: {a: sector}});
                var out = message.respond(sector_message_string);
                gas_tests.equal(out, true, 'done for sector ' + sector);
            });

            gas_tests.equal(message.done, true, 'message is done');
            gas_tests.equal(foo_called, 1, 'foo called once');
            gas_tests.deepEqual(response_data, [
                { message_id: 1, sector: 0, type: 'foo', value: { a: 0 } },
                { message_id: 1, sector: 1, type: 'foo', value: { a: 1 } },
                { message_id: 1, sector: 2, type: 'foo', value: { a: 2 } },
                { message_id: 1, sector: 3, type: 'foo', value: { a: 3 } },
                { message_id: 1, sector: 4, type: 'foo', value: { a: 4 } },
                { message_id: 1, sector: 5, type: 'foo', value: { a: 5 } },
                { message_id: 1, sector: 6, type: 'foo', value: { a: 6 } },
                { message_id: 1, sector: 7, type: 'foo', value: { a: 7 } },
                { message_id: 1, sector: 8, type: 'foo', value: { a: 8 } },
                { message_id: 1, sector: 9, type: 'foo', value: { a: 9 } },
                { message_id: 1, sector: 10, type: 'foo', value: { a: 10 } },
                { message_id: 1, sector: 11, type: 'foo', value: { a: 11 } },
                { message_id: 1, sector: 12, type: 'foo', value: { a: 12 } },
                { message_id: 1, sector: 13, type: 'foo', value: { a: 13 } },
                { message_id: 1, sector: 14, type: 'foo', value: { a: 14 } },
                { message_id: 1, sector: 15, type: 'foo', value: { a: 15 } },
                { message_id: 1, sector: 16, type: 'foo', value: { a: 16 } },
                { message_id: 1, sector: 17, type: 'foo', value: { a: 17 } },
                { message_id: 1, sector: 18, type: 'foo', value: { a: 18 } },
                { message_id: 1, sector: 19, type: 'foo', value: { a: 19 } }
            ], 'response data set');
            gas_tests.end();
        });

        as_tests.test('some error sector tests', function (err_tests) {
            var errors;
            var message = new icod.Manager_Message('all', 'foo', {a: 10}, function (err, rd) {
                errors = err;
                response_data = rd;
                ++foo_called;
            });

            _.range(0, 20).forEach(function (sector) {
                var data = {message_id: 2, sector: sector, type: 'foo', value: {a: sector}};
                switch (sector) {
                    case 3:
                        data.error = 'foo error alpha';
                        break;

                    case 7:
                        data.error = 'foo error beta';
                        break;

                    default:
                }
                var sector_message_string = JSON.stringify(data);
                var out = message.respond(sector_message_string);
                err_tests.equal(out, true, 'done for sector ' + sector);
            });

            err_tests.equal(message.done, true, 'message is done');

            err_tests.deepEqual(response_data, [
                { message_id: 2, sector: 0, type: 'foo', value: { a: 0 } },
                { message_id: 2, sector: 1, type: 'foo', value: { a: 1 } },
                { message_id: 2, sector: 2, type: 'foo', value: { a: 2 } },
                { message_id: 2,
                    sector: 3,
                    type: 'foo',
                    value: { a: 3 },
                    error: 'foo error alpha' },
                { message_id: 2, sector: 4, type: 'foo', value: { a: 4 } },
                { message_id: 2, sector: 5, type: 'foo', value: { a: 5 } },
                { message_id: 2, sector: 6, type: 'foo', value: { a: 6 } },
                { message_id: 2,
                    sector: 7,
                    type: 'foo',
                    value: { a: 7 },
                    error: 'foo error beta' },
                { message_id: 2, sector: 8, type: 'foo', value: { a: 8 } },
                { message_id: 2, sector: 9, type: 'foo', value: { a: 9 } },
                { message_id: 2, sector: 10, type: 'foo', value: { a: 10 } },
                { message_id: 2, sector: 11, type: 'foo', value: { a: 11 } },
                { message_id: 2, sector: 12, type: 'foo', value: { a: 12 } },
                { message_id: 2, sector: 13, type: 'foo', value: { a: 13 } },
                { message_id: 2, sector: 14, type: 'foo', value: { a: 14 } },
                { message_id: 2, sector: 15, type: 'foo', value: { a: 15 } },
                { message_id: 2, sector: 16, type: 'foo', value: { a: 16 } },
                { message_id: 2, sector: 17, type: 'foo', value: { a: 17 } },
                { message_id: 2, sector: 18, type: 'foo', value: { a: 18 } },
                { message_id: 2, sector: 19, type: 'foo', value: { a: 19 } }
            ], 'response data set');

            err_tests.deepEqual(errors, [
                { sector: 3, error: 'foo error alpha' },
                { sector: 7, error: 'foo error beta' }
            ], 'errors found');
            err_tests.end();
        });

        as_tests.end();
    });

    suite.end();

});