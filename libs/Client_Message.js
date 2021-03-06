var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');

var client_message_id = 0;
var _DEBUG_HANGS = false;

/**
 * This handled the clients' receipt and response of a message from a manager.
 *
 *
 * @param client {Client}
 * @param message {string|Buffer}
 * @constructor
 */

function Client_Message(client, message) {
    this.id = ++client_message_id;
    var self = this;
    this.t = setTimeout(function () {
      if (_DEBUG_HANGS)  console.log('hanging timeout for client %s message id %s:  %s', client.sector, self.id, util.inspect(message));
    }, 1000 * 10);
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
            (property ? this.message.value[property] : this.message.value) : null;
    },

    error: function (err) {
        if (err.hasOwnProperty('message')) {
            err = err.message;
        }
        var output = this.response();
        output.error = err;
        this.feedback(output);
    },

    respond_with: function (value) {
        var response = this.response(value);
        this.feedback(response);
    },

    response: function (response) {
        var out = {
            type: this.type(),
            value: this.value()
        };
        if (this.message.hasOwnProperty('message_id')) {
            out.message_id = this.message.message_id;
        }
        if (arguments.length) {
            out.response = response;
        }
        return out;
    },

    feedback: function (response) {
        clearTimeout(this.t);
        if (this.responded) {
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