var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var pd = require('./../Point_Data');
var Point_Data = pd();

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: dumping all cached data for a given field to Mongo in one insert
 * @return void
 */

function save_piont_data_queue (field, detail, callback) {
    data = this.data_queue[detail][field];
    if (!data) {
        console.log('found no records for field %s, detail %s', field, detail);
        return callback(null, []);
    } // may have been cleaned out by another iteration
    var sector = this.sector;

    var records = data.reduce(function (out, value, index) {
        var data = _.extend({
            detail: detail,
            field: field,
            sector: sector
        }, value);

        //  console.log('pushing data %s', util.inspect(data));
        out.push(data);
        return out;
    }, []);
    // console.log('saving records of field %s', util.inspect(records), field);
    delete this.data_queue[detail][field];
    Point_Data.collection.insert(records, {multi: true}, function () {
        callback(null, records);
    });
}

/* -------------- EXPORT --------------- */

module.exports = save_piont_data_queue;