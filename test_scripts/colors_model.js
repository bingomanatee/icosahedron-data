var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var mongoose = require('mongoose');
var ico_draw = require('icosahedron-draw');
var ico = require('icosahedron');
var output =  path.resolve(__dirname, '../test_output');
var pad = require('pad');
var child_process = require('child_process');

/* ------------ CLOSURE --------------- */

var WIDTH = 500;
var HEIGHT = 250;

var Colors;

function draw_sector_colors(time, DETAIL, done) {
    var cache_file = path.resolve(__dirname, '../util/' + DETAIL + '_' + WIDTH + '_' + HEIGHT + '.json');

    var time_file = path.resolve(__dirname, '../test_output', 'sectors_' + pad(4, time, '0') + '.png');

    Colors.find({'value.time': time, 'value.detail': DETAIL}, function (err, sector_colors) {
        if (err) throw err;

        //   console.log('%s sector colors: %s', sector_colors.length, util.inspect(sector_colors, true, 5).substr(0, 300));

        var points = sector_colors.reduce(function (out, sc) {
            return out.concat(sc.value.data);
        }, []);

        var colors = [];

        points.forEach(function (point) {
            colors[point.ro] = point.value;
        });

        ico.io.faces(function (err, faces) {
            if (err) throw err;
           // console.log('faces.length: %s', faces.length);
            ico.io.points(function (err, points) {
                if (err) throw err;

                var colored_points = points.map(function (point) {
                    return _.extend({color: colors[point.ro]}, point);
                })

                var polysphere = new ico_draw.Polysphere(WIDTH, HEIGHT, colored_points);
                ico_draw.render_poly(polysphere, faces, function (err, canvas) {
                    ico_draw.canvas_to_file(canvas, time_file, done);
                }, cache_file);

            }, DETAIL);

        }, DETAIL);
    })
}

/** ********************
 * Purpose: returns a color model
 * @return mongoose.Model
 */

function colors() {

    if (!Colors) {
        var schema = mongoose.Schema({_id: 'string', value: {
            sector: 'number',
            time: 'number',
            detail: 'number',
            data: [
                {
                    ro: 'number',
                    value: ['number']
                }
            ]
        }});
        schema.statics.draw_sector_colors = draw_sector_colors;

        schema.statics.make_movie = function(callback){
            var file = path.resolve(output, 'sector_video.mp4');
            if (fs.existsSync(file)) fs.unlinkSync(file);

            var script = util.format('ffmpeg -r 12 -i "%s/sectors_%04d.png" -c:v mpeg4 -crf 23 -pix_fmt yuv420p %s',
               output, file
            );
            console.log('executing %s', script);
            child_process.exec(script,
                function (error, stdout, stderr) {
               //     console.log('stdout: ' + stdout);
                 //   console.log('stderr: ' + stderr);
                    if (error !== null) {
                        console.log('exec error: ' + error);
                    }
                    callback();
            });
        };

        Colors = mongoose.model('colors', schema)
    }

    return Colors;
}

/* -------------- EXPORT --------------- */

module.exports = colors;