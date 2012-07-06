var events = require("events");
var fs = require("fs");
var path = require("path");
var util = require("util");

var mkdirp = require("mkdirp");

var flow = require("flow.js");

// internal list of registered store types.
var storeMap = {};

var createStore = function() {
    var args = Array.prototype.slice(arguments);
    if (args.length < 2) { throw new Error("Missing arguments"); }
    var name = args.shift();
    var type = storeMap[name];
    if (type == undefined) { throw new Error("Unrecognized data store type"); }
    args.unshift(type);
    var store = Object.create(StoreInterface.prototype);
    StoreInterface.prototype.constructor.apply(store, args);
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
    this.impl.hasObject(id, cb);
};

var _iReadObject = function(id, cb) {
    this.impl.readObject(id, cb);
};

var _iWriteObject = function(obj, cb) {
    this.impl.writeObject(obj, cb);
};

function StoreInterface() {
    var args = Array.prototype.slice(arguments);
    var implType = args.shift();
    this.impl = Object.create(implType.prototype);
    implType.prototype.constructor.apply(this.impl, args);

    this.hasObject = flow.wrap(_iHasObject, this);
    this.readObject = flow.wrap(_iReadObject, this);
    this.writeObject = flow.wrap(_iWriteObject, this);
};

StoreInterface.prototype = Object.create(events.EventEmitter.prototype, { constructor: { value: StoreInterface } });



function DiskStore(path) {
  this.path = path;
  this._mkdirs(this.path, function(err, res) {
    if (err) throw new Error(util.format("Unable to create data directory: %s", err));
  });
}

DiskStore.prototype = Object.create(events.EventEmitter.prototype, { constructor: { value: DiskStore } });

Object.defineProperty(DiskStore.prototype, "_fpath", { enumerable: false, value: function(id) {
  // namespace check
  if (id.indexOf("::") != -1) {
    var ns = id.split("::");
    ns.unshift(this.path);
    ns.push(util.format("%s.json", ns.pop()));
    return path.join.apply(null, ns);
  } else {
    return path.join(this.path, util.format("%s.json", id));
  }
}});

Object.defineProperty(DiskStore.prototype, "_mkdirs", { enumerable: false, value: flow.wrap(mkdirp) });

DiskStore.prototype.hasObject = function(id, cb) {
  fs.exists(this._fpath(id), function (exists) { cb(null, exists); });
};

DiskStore.prototype.readObject = function(id, cb) {
  fs.readFile(this._fpath(id), function (err, data) {
    if (err) { cb(err, null); return; }
    var obj = JSON.parse(data);
    Object.defineProperty(obj, "_id", { enumerable: false, value: id });
    cb(null, obj);
  });
};

DiskStore.prototype.writeObject = function(obj, cb) {
  var self = this;
  if (!obj.hasOwnProperty("_id")) { cb("missing _id field", null); return; }
  // make sure directory exists ( we lazily create namespace directories here ).
  fs.exists(path.dirname(this._fpath(obj._id)), function (exists) {
    if (exists) {
      fs.writeFile(self._fpath(obj._id), obj, function (err) {
        if (err) { cb(err, null); return; }
      });
      cb(null, "success");
    } else {
      var f = self._mkdirs(path.dirname(self._fpath(obj._id)));
      f.on("complete", function(err,res) {
        if (err) { cb(err, null); return; }
        fs.writeFile(self._fpath(obj._id), obj, function(err) {
          if (err) { cb(err, null); return; }
          cb(null, "success");
        });
      });
    }
  });
};

function MemoryStore() {
  Object.defineProperty(this, "_store", { enumerable: false, value: {} });
}

MemoryStore.prototype = Object.create(events.EventEmitter.prototype, { constructor: { value: MemoryStore } });

MemoryStore.prototype.hasObject = function(id, cb) {
  cb(null, this._store.hasOwnProperty(id) == true);
};

MemoryStore.prototype.readObject = function(id, cb) {
  if (this._store.hasOwnProperty(id)) {
    var obj = this._store[id];
    if (!obj.hasOwnProperty("_id")) { Object.defineProperty(obj, "_id", { enumerable: false, value: id }); }
    cb(null, obj);
  } else {
    cb("object not found", null);
  }
};

MemoryStore.prototype.writeObject = function(obj, cb) {
  this._store[obj._id] = obj;
  cb(null, "success");
};

exports.createStore = createStore;
exports.getRegisteredStores = getRegisteredStores;
exports.registerStore = registerStore;
exports.unregisterStore = unregisterStore;
