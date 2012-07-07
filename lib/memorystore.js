var events = require("events");

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

module.exports = MemoryStore;
