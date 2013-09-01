var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var THREE = require('three');

/* ------------ CLOSURE --------------- */


/** ********************
 * Purpose: a simple feedback script
 * @return void
 */

function sx2(data, client, callback) {
    callback(null, client.sector * 2);
}

/* -------------- EXPORT --------------- */

module.exports = sx2;