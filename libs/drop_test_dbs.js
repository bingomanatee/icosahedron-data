/**
 * run this in mongo console to clear out test dbs
 *
 * type
 *
 *   load('/Users/dave/Documents/node/ico-data/libs/drop_test_dbs.js')
 *   (with your absolute file path)
 *
 * in the console.
 */

var dbs = db.getMongo().getDBNames();
for (var i in dbs) {
    var name = dbs[i];

    if (/^test_ico_data_/.test(name)) {
        db = db.getMongo().getDB(name);
        print("dropping db " + db.getName());
        db.dropDatabase();
    }
}
