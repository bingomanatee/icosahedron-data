var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: the core file
 * @return
 */

/* -------------- EXPORT --------------- */

module.exports = {
    Client: require('./libs/Client'),

    Manager: require('./libs/Manager')
}