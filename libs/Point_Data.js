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

    if (!model){
        model = mongoose.model('point_data', require('./Point_Data.json'));
    }

    return model;
}

/* -------------- EXPORT --------------- */

module.exports = Point_Data;