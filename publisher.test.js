
TestPublication = function() {}

RegisterArrayPublisher(TestPublication, function(cancel, publish, onStop) {
  var self = this;
  var myInterval;
  var myVal = 0;

  onStop(function(){
    Meteor.clearInterval(myInterval);
  });

  myInterval = Meteor.setInterval(function() {
    myVal++;
    publish({'allow-duplicates': {
      removed: [ { _index: 1 } ],
      moved: null,
      copied: null,
      added: [ { _index: 1, value: myVal } ]
    }});
  }, 1000);

});
