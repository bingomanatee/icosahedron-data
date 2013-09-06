var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var mongoose = require('mongoose');
/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: A store for point data
 * @return Mongoose Model
 */

var model;
function Point_Data() {

    var schema = mongoose.Schema(require('./Point_Data.json'));
    schema.index({detail: 1, ro: 1, time: 1, field: 1});

    if (!model){
        model = mongoose.model('point_data', schema);
    }

    return model;
}

/* -------------- EXPORT --------------- */

module.exports = Point_Data;