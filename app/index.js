'use strict';

var inherits = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var TxController = require('./transactions.js');
var async = require("async");

var BitcoreES = function (options) {
    EventEmitter.call(this);
    this.node = options.node;
    console.log("BitcoreES node : " + this.node);
    this.name = options.name;
}

inherits(BitcoreES, EventEmitter);

BitcoreES.dependencies = ['bitcoind'];

BitcoreES.prototype.start = function (callback) {
    setImmediate(callback);
};

BitcoreES.prototype.stop = function (callback) {
    setImmediate(callback);
};

BitcoreES.prototype.getAPIMethods = function () {
    return [];
};

BitcoreES.prototype.getPublishEvents = function () {
    return [];
};

BitcoreES.prototype.setupRoutes = function (app, express) {
    var self = this;
    app.get('/index', this.indexation.bind(this));
};

BitcoreES.prototype.getRoutePrefix = function () {
    return 'es';
}; 

BitcoreES.prototype.indexation = function () {
    var node = this.node;
    var txController = new TxController();
    var queue = async.queue(txController.list, 1); // Run two simultaneous uploads
    queue.drain = function() {
        console.log("All done");
    };
    for (var height = 325; height<500000; height++){
        // Queue the block heigth for processing
        console.log("Pushing block height " + height);
        queue.push({"height": height, "node": node});
    }
   
}

module.exports = BitcoreES;