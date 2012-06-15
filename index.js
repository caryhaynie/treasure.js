var events = require("events");
var fs = require("fs");
var path = require("path");
var util = require("util");

var _mkdirs = function(pth, cb) {
  path.exists(pth, function(exists) {
    if (!exists) {
      var dir = path.dirname(pth);
      // if we hit root, give up.
      if (dir == pth) { cb("hit root and it doesn't exist?!?!", null); return; }
      _mkdirs(dir, function(err, res) {
        fs.mkdir(pth, 0755, function(mkErr) {
          if (mkErr) { cb(mkErr, null); return; }
          cb(err, res);
        });
      });
    } else {
      cb(null, "done");
    }
  });
}

function DiskStore(path) {
  this.path = path;
  this._mkdirs(this.path, function(err, res) {
    if (err) throw new Error(util.format("Unable to create data directory: %s", err));
  });
}

DiskStore.prototype = Object.create(events.EventEmitter, { constructor: DiskStore });

Object.defineProperty(DiskStore.prototype, "_fpath", { enumerable: false, value: function(id) {
  return path.join(this.path, util.format("%s.json", id)); }
});

Object.defineProperty(DiskStore.prototype, "_mkdirs", { enumerable: false, value: _mkdirs });

DiskStore.prototype.hasObject = function(id, cb) {
  path.exists(this._fpath(id), function (exists) { cb(null, exists); });
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
  if (!obj.hasOwnProperty("_id")) { cb("missing _id field", null); return; }
  fs.writeFile(this._fpath(obj._id), function (err) {
    if (err) { cb(err, null); return; }
  });
  cb(null, "success");
};

function MemoryStore() {
  Object.defineProperty(this, "_store", { enumerable: false, value: {} });
}

MemoryStore.prototype = Object.create(events.EventEmitter, { constructor: MemoryStore });

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

exports.DiskStore = DiskStore;
exports.MemoryStore = MemoryStore;

