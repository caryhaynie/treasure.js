var events = require("events");
var fs = require("fs");
var path = require("path");
var util = require("util");

var Future = function() {
    this.completed = false;
    this.error = null;
    this.result = null;
};

Future.prototype = Object.create(events.EventEmitter.prototype, { constructor: { value: Future } });

Future.prototype.complete = function(err, res) {
    this.completed = true;
    if (err != null) {
        this.error = err;
        this.emit("onError", this.err);
    } else {
        this.result = res;
        this.emit("onResult", this.result);
    }
    this.emit("onComplete", this.err, this.result);
}

var _mkdirs = function(pth, cb) {
  var f = new Future();
  if (cb) {
      f.on("onComplete", cb);
  }
  fs.exists(pth, function(exists) {
    if (!exists) {
      var dir = path.dirname(pth);
      // if we hit root, give up.
      if (dir == pth) { cb("hit root and it doesn't exist?!?!", null); return; }
      _mkdirs(dir, function(err, res) {
        fs.mkdir(pth, 0755, function(mkErr) {
          if (mkErr) { f.complete(mkErr, null); return; }
          f.complete(err, res);
        });
      });
    } else {
      f.complete(null, "done");
    }
  });
  return f;
}

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

Object.defineProperty(DiskStore.prototype, "_mkdirs", { enumerable: false, value: _mkdirs });

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
      f.on("onResult", function(res) {
        fs.writeFile(self._fpath(obj._id), obj, function(err) {
          if (err) { cb(err, null); return; }
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

exports.DiskStore = DiskStore;
exports.MemoryStore = MemoryStore;

