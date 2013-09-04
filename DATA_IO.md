# Data IO and ico-data

There is no absolute requirement for using mongo as a repo for icosahedral data, but at least the patterns for storage
and reconciliation for data across sectors.

## High Level Pattern of Data Generation and Storage

Before you begin a simulation you must retrieve the point data across all sectors for one or more levels of detail.

Once this is done, the basic cycle of data in ico data is as follows

1. set/advance the time
2. set the data for one or more fields for each point at one (or more) levels of detail.
3. rationalize values for border points
4. optionally, map/reduce values for one or more fields into sector/time records
5. repeat for the duration of the simulation

At the end of the simulation, you may want to preserve the data for the simulation in a more compressed/reusable form,
such as a JSON file, Binary block or a messagepack file.

## Data Storage

The basic pattern for data in ico-data is as multidimensional data stored in a flat parametric structure. Each entry
is keyed by:

1. time (as an abstract integer).
2. ro (a point index)
3. sector (an integer 1-20
4. field (a string)
5. value an arbitrary value.

## Writing data to Mongo (or another repo).

### Initial generation and preservation of field data

There are two ways to save raw field data.

1. write each field/point value to Mongo (or another repo) on the fly
2. save field/point values to the client, and write that data to Mongo (or another repo) when you have completed all work
for a single step of that field at once.

The second method is more write-efficient.

Writing field data point by point to mongo can be done via `Client.set_point_data(callback, field, detail, ro, value) method
(which reads time and sector values directly from the client object), but this is much slower than the second technique.

Saving all values for the clients' points into a mamory cache using `Client.queue_point_data(field, detail, ro, value, time)`
is more efficient; then when all the field values for all points of the sector are set for a given point in time, you can dump .
Note even if you don't use Mongo as a repo, `queue_piont_data` can till be used to efficiently buffer data at the client level
for future preservation.

### Rationalizing edge point data

Because each sector has points on the border that are shared with other sectors, running independent simulations on each sector
can generate contradictory data. At some point -- generally at the end of each time simulation -- you may have to reconcile
contradictory data for these edge points.

A simple average is good enough for most cases and this is accomplished through the `rationalize_multiple_values` script,
that finds each point in a sector that has more than one sector (i.e., is a border point), finds all the values of that
point and averages them, distributing that average value over all instances of the time/ro/field key.

This method works directly with Mongo data, so a variant of it needs to be used if you are not using Mongo as a repo.

### Aggregating data on a per sector basis

Storing data on a flat field basis is inefficient. The first step to a more efficient storage is a map-reduce function
that batches all field/time data for a single level of detail and time into a discrete database.

This data is still fairly inefficiently stored; running further processes on it, including merging multiple fields into the
same collection, can be done with manual scripts.

One tip on compression of data: though data is computed at various levels of detail, in theory, values should be the same
for any given point regardless of detail; if you save the highest level of detail, that data should be good for any
lower level of detail