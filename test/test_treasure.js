var fs = require("fs");
var util = require("util");

var expect = require("expect.js");

var treasure = require("../");

var storeArgs = {
  "DiskStore": ["./test/data"],
  "MemoryStore": []
};

var cleanupActions = {
  "DiskStore": function(obj, done) {
    fs.unlink("./test/data/write_test.json", function(err) {
      expect(err).to.not.be.ok();
      done();
    });
  }
};

function DummyStore() {};

describe("treasure.js", function() {
  describe("Data Store functions", function() {
    describe("createStore()", function() {
      it("should export a createStore() function", function() {
        expect(treasure.createStore).to.be.a("function");
      });
      it("should require a name parameter", function() {
        expect(function() { treasure.createStore(); }).to.throwException(/Missing argument/);
        expect(function() { treasure.createStore("DummyStore"); }).to.not.throwException(/Missing argument/);
      });
      it("should require a name that's been previously registered", function() {
        expect(function() { treasure.createStore("DummyStore"); }).to.throwException(/Unrecognized data store type/);
        treasure.registerStore("DummyStore", DummyStore);
        expect(function() { treasure.createStore("DummyStore"); }).to.not.throwException();
        treasure.unregisterStore("DummyStore");
      });
    });
    describe("getRegisteredStores()", function() {
      it("should export a getRegisteredStores() function", function() {
        expect(treasure.getRegisteredStores).to.be.a("function");
      });
      it("should return a list of the currently registered stores", function() {
        expect(treasure.getRegisteredStores()).to.be.an("array");
      });
    });
    describe("registerStore()", function() {
      it("should export a registerStore() function", function() {
        expect(treasure.registerStore).to.be.a("function");
      });
    });
    describe("unregisterStore()", function() {
      it("should export an unregisterStore() function", function() {
        expect(treasure.unregisterStore).to.be.a("function");
      });
    });
  });
  treasure.getRegisteredStores().forEach(function(name) {
    describe(util.format("%s objects", name), function() {
      var obj = null;
      before(function() {
        var args = storeArgs[name];
        args.unshift(name);
        obj = treasure.createStore.apply(null, args);
      });
      it("should have a hasObject() method", function() {
        expect(obj.hasObject).to.be.a("function");
      });
      describe("#hasObject()", function() {
        it("should return true for an existing record", function(done) {
          obj.hasObject("real_object", function(err, res) {
            expect(err).to.not.be.ok();
            expect(res).to.eql(true);
            done();
          });
        });
        it("should return false for a non-existant object", function(done) {
          obj.hasObject("fake_object", function(err, res) {
            expect(err).to.not.be.ok();
            expect(res).to.eql(false);
            done();
          });
        });
      });
      it("should have a readObject() method", function() {
        expect(obj.readObject).to.be.a("function");
      });
      describe("#readObject()", function() {
        before(function(done) {
          var testCount = 2;
          function testDone(expected, actual) {
            expect(actual).to.be(expected);
            testCount--;
            if (testCount == 0) done();
          }
          fs.exists("./test/data/real_object.json", testDone.bind(null, true));
          fs.exists("./test/data/fake_object.json", testDone.bind(null, false));
        });
        it("should return an object for id that exists", function(done) {
          obj.readObject("real_object", function(err, res) {
            expect(err).to.not.be.ok();
            expect(res).to.be.ok();
            expect(res).to.have.keys("foo", "bar");
            expect(res.foo).to.be(1);
            expect(res.bar).to.be("Hello, World!");
            done();
          });
        });
        it("should return an error for a non-existant object", function(done) {
          var res = obj.readObject("fake_object");
          res.on("result", function(res) { expect(res).to.not.be.ok(); });
          res.on("error", function (err) { done(); });
        });
      });
      it("should have a writeObject() method", function() {
        expect(obj.writeObject).to.be.a("function");
      });
      describe("#writeObject()", function() {
        it("should write an object to disk", function(done) {
          var o = { foobar: "This is a test" };
          Object.defineProperty(o, "_id", { enumerable: false, value: "write_test" });
          obj.writeObject(o, function(err, res) {
            expect(err).to.not.be.ok();
            expect(res).to.be.ok();
            fs.exists("./test/data/write_test.json", function(exists) {
              expect(exists).to.be.ok();
              done();
            });
          });
        });
        it("should write a namespaced object to disk in the correct location", function(done) {
          var ns = { foo: "bar" };
          Object.defineProperty(ns, "_id", { enumerable: false, value:"ns1::ns_test" });
          obj.writeObject(ns, function(err, res) {
            expect(err).to.not.be.ok();
            expect(res).to.be.ok();
            fs.exists("./test/data/ns1/ns_test.json", function(exists) {
              expect(exists).to.be.ok();
              done();
            });
          });
        });
        it("should fail to write an object without an id", function(done) {
          var o = { foobar: "This is a test" };
          var result = obj.writeObject(o);
          result.on("result", function(res) { expect(res).to.not.be.ok(); done(); });
          result.on("error", function(err) { done(); });
        });
        after(function(done) {
          var cleanup = cleanupActions[name];
          if (cleanup != undefined) {
            cleanup(obj, done);
          } else {
            done();
          }
        });
      });
    });
  }, null);
});

