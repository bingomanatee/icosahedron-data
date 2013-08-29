var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var cluster = require('cluster')
    , icod = require('./index')
    , zmq = require('zmq')
    , port = require('./config.json').port;

/* ------------ CLOSURE --------------- */

/** ********************
 * Purpose: the core file
 * @return
 */

/* -------------- EXPORT --------------- */

module.exports = {
    Client: require('./libs/Client'),

    Manager: require('./libs/Manager'),

    init: function(){
        if (cluster.isMaster) {
            _.range(0, 20).forEach(function(sector_id){
                cluster.fork({sector: sector_id});
            });
/*            cluster.on('death', function (worker) {
                console.log('worker ' + worker.pid + ' died');
            });*/

            return new module.exports.Manager();
        } else {
        }

    },

    init_child: function(){
           return new module.exports.Client(cluster.worker.process.env.sector);
    }
}