var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var message_id = 0;

var _DEBUG_COUNT = false;

/**
 * an object that transmits a message via zeromq and waits for the response.
 *
 * Becuase a message broadcast to all sectors will receive 20 responses,
 * the response method is forked to handle both a single call and multiple calls.
 *
 * @param target {'all'|int} either the string "all" or an int 0..19
 * @param type {string}
 * @param data {object}
 * @param callback {function}
 * @constructor
 */

function Manager_Message(target, type, data, callback) {
    this.id = ++message_id;

    this.target = target;
    this.type = type;
    this.data = data;
    this.callback = callback;

    // these methods track async responses to multiple sector calls
    this.sector_responses = [];
    this.count = 0;
    this.sector_errors = [];

    this.done = false;
}

_.extend(Manager_Message.prototype, {

    info: function () {
        return {
            type: this.type,
            value: this.data,
            message_id: this.id
        }
    },

    output: function () {

        var info = JSON.stringify(this.info());

        return util.format('%s %s', this.target, info);

    },

    errors: function () {
        return this.sector_errors.length ? this.sector_errors : null;
    },

    respond: function (response) {

        if (_.isString(response)){
            try {
                response = JSON.parse(response);
            } catch(err){
                return false;
            }
        }

        if (response.message_id != this.id) {
            return false;
        }

        if (this.done) {
            return false;
        }

        var error = null;
        if (response.error) {
            error = response.error;
        }

        if (this.target != 'all') {
            //@TODO: validate sector match.

            this.done = true;
            this.callback(error, response);
        } else {
            if (this.sector_responses[response.sector]) {
                throw new Error(util.inspect('multiple responses for message %s, sector %s', this.id, response.sector));
            }

            this.sector_responses[response.sector] = response;

            ++this.count;

            if (_DEBUG_COUNT) {
                console.log('response to message %s: count %s', this.type, this.count);
            }

            if (error) {
                this.sector_errors.push({sector: response.sector, error: error});
            }

            if (this.count >= 20) {
                this.done = true;
                this.callback(this.errors(), this.sector_responses);
            }
        }
        return true;
    }
});

Manager_Message.reset_id = function(){
    message_id = 0;
};

module.exports = Manager_Message;