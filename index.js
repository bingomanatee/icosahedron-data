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

    Manager_Message: require('./libs/Manager_Message.js'),

    init_manager: function (callback) {
        _.range(0, 20).forEach(function (sector_id) {
            cluster.fork({sector: sector_id});

        });

        var manager = new module.exports.Manager();

        if (callback){
            manager.once('sectors::ready', function(){
                callback(null, manager);
            })
        }

        return manager;
    },

    init_child: function () {
        return new module.exports.Client(cluster.worker.process.env.sector);
    }
}