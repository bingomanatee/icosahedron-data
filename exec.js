/*
 *
 * Publisher subscriber pattern
 *
 */

var cluster = require('cluster')
    , icod = require('./index')
    , zmq = require('zmq')
    , port = require('./config.json').port;

var stocks = ['AAPL', 'GOOG', 'YHOO', 'MSFT', 'INTC'];
if (cluster.isMaster) {
    stocks.forEach(function(stock){
        cluster.fork({stock: stock});
    });

    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died');
    });

    //publisher = send only

    var socket = zmq.socket('pub');

    socket.identity = 'publisher' + process.pid;

    var manager = new icod.Manager();

    setInterval(function () {
        var symbol = stocks[Math.floor(Math.random() * stocks.length)]
            , value = Math.random() * 1000;

        console.log('');
        console.log('sent ' + symbol + ' ' + value);
        manager.send(symbol, value);
    }, 4000);
} else {
    //subscriber = receive only
/*
    var socket = zmq.socket('sub');

    socket.identity = 'subscriber' + cluster.worker.process.env.stock;

    socket.connect(port);

    socket.subscribe(cluster.worker.process.env.stock);

    console.log('connected!');

    socket.on('message', function (data) {
        console.log(socket.identity + ': received data ' + data.toString());
    });*/

    var client = new icod.Client(cluster.worker.process.env.stock);
}