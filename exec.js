/*
 *
 * Publisher subscriber pattern
 *
 */

var cluster = require('cluster')
    , icod = require('./index')
    , zmq = require('zmq')
    , port = require('./config.json').port;

if (cluster.isMaster) {
    _.range(0, 20).forEach(function(sector_id){
        cluster.fork({sector: sector_id});
    });
    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died');
    });

    var manager = new icod.Manager();
} else {
    var client = new icod.Client(cluster.worker.process.env.stock);
}