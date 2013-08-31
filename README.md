# icosahedron-data

This module is designed to process scripts and actions in a distributed network of processes, each designed to work
on data for a specific sector. `zeromq` is used to communicate between the Client processes and the main process.
These processes can be broken down between processes on the same machine using the `cluster` core module, or
(in theory) with clients on separate servers by running the clients on different machines and pointing their
configurations to the machine the manager is running on.

The Managers and the Clients communicate using two zeromq channels; one with which the manager broadcasts requests
to the clients, and one that the clients use to respond to the manager.

## The Dataspace

This module gets and stores data in many dimensions:

* **time**, an integer that starts at zero; how much time it represents is open to interpretation.
* **detail**, an integer 0..6. You can store data in more than one level of resolution.
* **field***, a string. any arbitrary field can be used to store values.

For instance, you might store all the amount of energy from the sun at level of detail 2 for time 0, in field "solar_input".
by calling
``` javascript
client.point_data[detail].forEach(function (point) {
  client.queue_point_data('solar_input', 2, point.ro, calc_solar_input(point));
})
client.save_point_data_queue('solar_input', 2, function(){ ... });
```

The data will be time indexed by the time value of the client.time.

## Manager

The manager has two zeromq channels; one for listening to feedback from clients and one for broadcasting to clients.
these channels are defined in the config.json file:

``` json
{
    "publish_port": "tcp://127.0.0.1:8800",
    "respond_port": "tcp://127.0.0.1:8801"
}
```

To initialize a manager, call the init method of the module:

``` javascript
var icod = require('icosahedron-data');
icod.init();

````

this will return an instance of the Manager. At this point, you listen for the `'sectors::ready'` message of the manager
that is sent when all the clients check in.

### Loading point data
#### manager.load_points(detail);

The clients can be instructed to load point data from the `icosahedron` module by calling `manager.load_points(detail)`.
This will instruct each client to load data about the points in each sector. (see below for detail on accessing this information.)
Once load_points is called, listen for the response from the clients that indicates the point data has been retrieved:

``` javascript
manager.once('sectors::points loaded', function (detail) {...}
```

## Clients

20 clients are created, one for each sector of points. The client has the ability to run scripts and to communicate
to a mongodb database. This database stores all the data for points, indexed by field name, the points' `ro` (real order)
index, and time.

### Client.time

Simulation data is keyed by `time`, a field that starts at zero. All the get and set data methods will store and retrieve
field data for the current time. What this number represents is up to you -- hours, days, unix timestamp, whatever. 

You can update the time of all clients by calling `manager.set_time(time_number, callback)`.

You can also access past history data from the client by temporarily reversing the client.time property before calling data retrieval
methods, and then resetting time to "real time" after the data has been polled.

### Data I/O methods

Although there are methods for setting getting a single points' data, it is much more efficient to get and set a field for
the entire sector and get and set all field values as a batch of data.

#### Client.queue_point_data(field, detail, ro, value)
#### Client.save_point_data_queue(field, detail, callback)

You can prepare a field for saving by calling `client.queue_point_data(..)`. This will store a value in the client object.
Once all data for a sector has been queued, you can call `save_point_data_queue(...)` to dump the queue to the mongodb
repo.

#### Client.get_sector_data: function (callback, field, detail)

This method retrieves stored data for a sector

#### Client.point_data[detail]

Once the client has been told to load point data, an array of points can be retrieved from the clients' point_data array.

## Executing scripts

The clients can also be sent an absolute path to a script that can be executed; the script must be a function
with the following signature:

``` javascript

module.exports = function (detail, client, callback) {
...
}
```
Note that since the script file is passed the client, it has access to all the clients' data i/o methods and can even
send messages to the manager directly if necessary.

Executing a script across all sectors is triggered by the manager:

``` javascript
 manager.do(path.resolve(my_script_js_file, detail, function (err, results) { ... });
```

the results will be an array of 20 values aggregated from the execution of the script file.