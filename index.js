var events = require("events");
var util = require("util");

var flow = require("flow.js");

// internal list of registered store types.
var storeMap = {};

var createStore = function() {
    var args = Array.prototype.slice.apply(arguments);
    if (args.length < 1) { throw new Error("Missing argument"); }
    var name = args.shift();
    var type = storeMap[name];
    if (type == undefined) { throw new Error("Unrecognized data store type"); }
    args.unshift(type);
    var store = Object.create(StoreInterface.prototype);
    StoreInterface.prototype.constructor.apply(store, args);
    return store;
};

var getRegisteredStores = function() {
    return Object.keys(storeMap);
};

var registerStore = function(name, impl) {
    storeMap[name] = impl;
};

var unregisterStore = function(name) { 
    storeMap[name] = undefined;
};

// StoreInterface wrapper functions

var _iHasObject = function(id, cb) {
    var self = this;
    process.nextTick(function() {
        self.impl.hasObject(id, cb);
    });
};

var _iReadObject = function(id, cb) {
    var self = this;
    process.nextTick(function() {
        self.impl.readObject(id, cb);
    });
};

var _iWriteObject = function(obj, cb) {
    var self = this;
    process.nextTick(function() {
        self.impl.writeObject(obj, cb);
    });
};

function StoreInterface() {
    var args = Array.prototype.slice.apply(arguments);
    var implType = args.shift();
    this.impl = Object.create(implType.prototype);
    implType.prototype.constructor.apply(this.impl, args);

    this.hasObject = flow.wrap(_iHasObject, this);
    this.readObject = flow.wrap(_iReadObject, this);
    this.writeObject = flow.wrap(_iWriteObject, this);

};

StoreInterface.prototype = Object.create(events.EventEmitter.prototype, { constructor: { value: StoreInterface } });

registerStore("DiskStore", require("./lib/diskstore.js"));
registerStore("MemoryStore", require("./lib/memorystore.js"));

exports.storeMap = storeMap;

exports.createStore = createStore;
exports.getRegisteredStores = getRegisteredStores;
exports.registerStore = registerStore;
exports.unregisterStore = unregisterStore;
