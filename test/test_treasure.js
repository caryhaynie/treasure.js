var fs = require("fs");

var expect = require("expect.js");

var data = require("../");

describe("data store", function() {
  it("should export a DiskStore constructor", function() {
    expect(data.DiskStore).to.be.ok();
    expect(data.DiskStore).to.be.a("function");
  });
  it("should export a MemoryStore constructor", function() {
    expect(data.MemoryStore).to.be.ok();
    expect(data.MemoryStore).to.be.a("function");
  });
  describe("DiskStore objects", function() {
    var obj = null;
    before(function() {
      obj = new data.DiskStore("./test/data");
      expect(obj).to.be.a(data.DiskStore);
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
        obj.readObject("fake_object", function(err, res) {
          expect(err).to.be.ok();
          expect(res).to.not.be.ok();
          done();
        });
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
      it("should fail to write an object without an id", function(done) {
        var o = { foobar: "This is a test" };
        obj.writeObject(o, function(err, res) {
          expect(err).to.be.ok();
          expect(res).to.not.be.ok();
          done();
        });
      });
      after(function(done) {
        fs.unlink("./test/data/write_test.json", function(err) {
          expect(err).to.not.be.ok();
          done();
        });
      });
    });
  });
  describe("MemoryStore objects", function() {
    var obj = null;
    before(function() {
      obj = new data.MemoryStore();
      expect(obj).to.be.a(data.MemoryStore);
    });
    it("should have a hasObject() method", function() {
      expect(obj.hasObject).to.be.a("function");
    });
    describe("#hasObject()", function() {
      before(function(done) {
        var o = {foo: 1, bar: 2}
        Object.defineProperty(o, "_id", { enumerable: false, value: "real_object" });
        obj.writeObject(o, function(err, res) {
          expect(err).to.not.be.ok();
          expect(res).to.be.ok();
          done();
        });
      });
      it("should return true for an existing object", function(done) {
        obj.hasObject("real_object", function(err, res) {
          expect(err).to.not.be.ok();
          expect(res).to.eql(true);
          done();
        });
      });
      it("should return false for a non-existing object", function(done) {
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
    });
    it("should have a writeObject() method", function() {
      expect(obj.writeObject).to.be.a("function");
    });
    describe("#writeObject()", function() {
    });
  });
});

