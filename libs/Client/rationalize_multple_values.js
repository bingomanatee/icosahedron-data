var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var Point_Data = require('./../Point_Data.js');
var async = require('async');

/* ------------ CLOSURE --------------- */

function rationalize_multiple_values(message) {

    var value = message.value;
    var field = value.field;
    var time = value.time || 'all';
    var detail = value.detail || 'all';

    if (!field) return message.error('map reduce with no field');

    if (!merge_method) {
        merge_method = function (pd, ro) {
            var value = _.pluck(pd, 'value').reduce(function (out, value) { return out + value;  }, 0);
            return merge_method/pd.length;
        }
    }

    var self = this;

    // these are the point_datas that overlap other sectors, and for which this is the lowest sector number of the overlap.

    var overlap_points = this.point_data[detail].filter(function (point) {
        return point.sectors.length > 0 && _.min(point.sectors, _.identity) == self.sector;
    });

    var ros = _.pluck(overlap_points, 'ro');

    Point_Data.find({field: field, detail: detail, time: time, ro: {$in: ros}},

        function (overlaps) {
            var by_ro = _.groupBy(overlaps, 'ro');

            _.each(by_ro, function (point_datas, ro) {
                ro = point_datas[0].ro;

                var shared_value = merge_method(point_datas, ro);
                
                point_datas.forEach(function(pd){
                    pd.value = shared_value;
                })
            });
            
            var q = async.queue(function(pd, callback){
                pd.save(callback);
            }, 10);
            
            q.push(overlaps);
            
            q.drain = function(){
                message.feedback();
            };
        });

    
}

/* -------------- EXPORT --------------- */

module.exports = rationalize_multiple_values;