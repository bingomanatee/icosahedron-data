var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var async = require('async');

var _DEBUG = false;

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: execute a script over a point
 * @return void
 */

function point_script(fn, detail, callback, max_time) {
    if (!_.isFunction(callback)){
        throw new Error('non callback passed to point_script');
    }
    if (_DEBUG) console.log('point_script: %s, detail %s, callback %s, max time %s',
        fn.toString(), detail, callback.toString(), max_time);

    if (isNaN(detail)) {
        throw new Error('non numeric detail');
    }
    var output = [];
    if (!max_time) max_time = 5000;
    var time_error = false;

    var queue = async.queue(function (point, done) {
        fn(point, function (err, result) {
            if (err) {
                output.push(null);
                done(err);
            } else {
                output.push(result);
                done();
            }
        });
    }, 10);


    if (!this.point_data[detail]) return callback(new Error('no points at detail ' + detail));
    // console.log('doing point script %s with detail %s (%s points)', fn.toString(), detail, this.point_data[detail].length);

    queue.drain = function (err) {
        if (time_error) return;
        clearTimeout(t);
        callback(err, output);
    };

    queue.push(this.point_data[detail]);

    var t = setTimeout(function () {
        time_error = true;
        callback(new Error('script took too long', +util.inspect(fn)))
    }, max_time);
}

/* -------------- EXPORT --------------- */

module.exports = point_script;