var _ = require('underscore');
var util = require('util');

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: a script that sometimes generates errors
 * @return void
 */

function error_gen_test(data, client, callback) {
    if (client.sector == client.params.foo || (client.sector == client.params.foo * 2)) {
        console.log('eg script throwing error in client %s', client.sector);
        callback(new Error('Error in sector ' + client.sector));
    } else {
        callback(null, client.sector * 2);
    }
}

/* -------------- EXPORT --------------- */

module.exports = error_gen_test;