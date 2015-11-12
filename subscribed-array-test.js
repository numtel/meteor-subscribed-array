// Write your tests here!
// Here is an example.
Tinytest.addAsync('example', function (test, done) {
  var myTest = new SubscribedArray('my_test');
  var received = [];
  myTest.addEventListener('update', function(diff, data, diffType) {
    received.push(data[0].value);
  });

  Meteor.setTimeout(function() {
    test.ok(received.length > 1);
    test.equal(received[0], 1);
    test.equal(received[1], 2);
    myTest.stop();
    done();
  }, 2500);

});
