var events = require("events");
var fs = require("fs");
var path = require("path");
var util = require("util");

var mkdirp = require("mkdirp");

var flow = require("flow.js");

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
      fs.writeFile(self._fpath(obj._id), JSON.stringify(obj), function (err) {
        if (err) { cb(err, null); return; }
      });
      cb(null, "success");
    } else {
      var f = self._mkdirs(path.dirname(self._fpath(obj._id)));
      f.on("complete", function(err,res) {
        if (err) { cb(err, null); return; }
        fs.writeFile(self._fpath(obj._id), JSON.stringify(obj), function(err) {
          if (err) { cb(err, null); return; }
          cb(null, "success");
        });
      });
    }
  });
};

module.exports = DiskStore;
