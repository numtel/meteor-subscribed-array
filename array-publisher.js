// numtel:subscribed-array
// MIT License, ben@latenightsketches.com
// array-publisher.js (Server)

var Future = Npm.require('fibers/future');

RegisterArrayPublisher = function(klass, handler) {
  if(!klass.prototype)
    throw new Error('PROTOTYPE_CLASS_REQUIRED');
  if(typeof handler !== 'function')
    throw new Error('HANDLER_FUNCTION_REQUIRED');
  
  klass.prototype._publishCursor = function(sub) {
    var self = this;
    var fut = new Future;

    function sendUpdate(update, skipReady) {
      sub._session.send({
        msg: 'added',
        collection: sub._name,
        id: sub._subscriptionId,
        fields: update
      });

      if(!skipReady && sub._ready === false && !fut.isResolved()){
        fut['return']();
      }
    }

    function errorOccurred(err) {
      if(!fut.isResolved()){
        fut['throw'](error);
      }
    }

    // Send reset message (for code pushes)
    sendUpdate({ reset: true }, true);

    // Invoke publication handler
    handler(errorOccurred, sendUpdate, sub.onStop.bind(sub));

    return fut.wait()
  }
}
