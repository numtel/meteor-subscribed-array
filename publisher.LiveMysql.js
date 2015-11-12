
LiveMysql = Npm.require('mysql-live-select');

RegisterDiffPublisher(LiveMysql.LiveMysqlSelect, function(cancel, publish, onStop) {
  var self = this;

  onStop(function(){
    self.stop();
  });

  self.on('update', function(diff, rows){
    publish({'allow-duplicates': diff});
  });

  // Do not crash application on publication error
  self.on('error', function(error){
    cancel(error);
  });
  
});
