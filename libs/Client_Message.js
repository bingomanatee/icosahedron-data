var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var message_id = 0;

/**
 * This handled the clients' receipt and response of a message from a manager.
 *
 *
 * @param client {Client}
 * @param message {string|Buffer}
 * @constructor
 */

function Client_Message(client, message) {
    this.client = client;
    if (!_.isString(message)) {
        message = message.toString();
    }
    this.message = JSON.parse(message);
    this.responded = false;
}

_.extend(Client_Message.prototype, {
    type: function () {
        return this.message ? this.message.type : '';
    },

    value: function (property) {
        return this.message ?
            (property? this.message.value[property] : this.message.value) : null;
    },

    error: function (err) {
        if (err.hasOwnProperty('message')) {
            err = err.message;
        }
        var output = this.response();
        output.error = err;
        this.feedback(output);
    },

    response: function (response) {
        var out = {
            type: this.type(),
            value: this.value()
        };
        if (this.message.hasOwnProperty('message_id')) {
            out.message_id = this.message.message_id;
        }
        if (arguments.length){
            out.response = response;
        }
        return out;
    },

    feedback: function (response) {
        if (this.responded){
            console.log('attempt to respond to the same message twice: %s', util.inspect(this));
            return;
        }
        if (!response) {
            response = this.response();
        }

        this.responded = true;
        this.client.send(response);

    }
});

module.exports = Client_Message;