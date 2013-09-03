var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Point_Data = require('./../Point_Data.js');

/* ------------ CLOSURE --------------- */

function map() {
    emit('field ' + this.field + ' time ' + this.time + ' sector ' + this.sector, {data: [
        {ro: this.ro, sector: this.sector, time: this.time, value: this.value}
    ]});
}

function reduce(key, values) {
    var out = {data: []};

    values.forEach(function (item) {
        out.data = out.data.concat(item.data);
    });

    return out;
}

function finalize(key, values) {
    if (!values.data.length) return {};

    var out = {
        time: values.data[0].time,
        sector: values.data[0].sector
    };

    out.data = values.data.map(function (data) {
        return {
            ro: data.ro,
            value: data.value
        };
    });

    out.data = out.data.sort(function (a, b) {
        return a.time - b.time;
    });

    return out;
}

/**
 * compresses the field data into sector records
 * note - currently only works on a single level of detail.
 */

function mrsd(message) {

    var value = message.value();
    var field = value.field;
    var time = value.time || 'all';
    var detail = value.detail || 'all';
    var output_collection = value.output_collection;

    console.log('mrsd: %s', util.inspect(value));

    if (!field) return message.error('map reduce with no field');
    if (!output_collection) return message.error('map reduce with no output_collection');

    var query = {field: field};
    if (value.sector != 'all') query.sector = value.sector;
    if (time != 'all') query.time = time;
    if (detail != 'all') query.detail = detail;

    var out = {reduce: output_collection};

    console.log('setting mrsd %s, collection %s', util.inspect(query), output_collection);

    var def = {
        query: query,
        map: map.toString(),
        reduce: reduce.toString(),
        finalize: finalize.toString(),
        verbose: true,
        out: out
    };

    var pd = new Point_Data();
    try {
        pd.mapReduce(def, function (err, result) {
            if (err) {
                message.error(err);
            } else {
                message.feedback();
            }
        });
    } catch (err) {
        console.log('error: %s', err);
    }
}

/* -------------- EXPORT --------------- */

module.exports = mrsd;