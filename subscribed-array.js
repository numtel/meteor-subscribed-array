// numtel:subscribed-array
// MIT License, ben@latenightsketches.com
// subscribed-array.js (Client)

var selfConnection;
var buffer = [];
var diffAppliers = {};

SubscribedArray = function(connection, name /* arguments */){
  var self = this;
  var subscribeArgs;

  if(!(self instanceof SubscribedArray)){
    throw new Error('use "new" to construct a SubscribedArray');
  }

  self._events = [];

  if(typeof connection === 'string'){
    // Using default connection
    subscribeArgs = Array.prototype.slice.call(arguments, 0);
    name = connection;
    if(Meteor.isClient){
      connection = Meteor.connection;
    }else if(Meteor.isServer){
      if(!selfConnection){
        selfConnection = DDP.connect(Meteor.absoluteUrl());
      }
      connection = selfConnection;
    }
  }else{
    // Subscription arguments does not use the first argument (the connection)
    subscribeArgs = Array.prototype.slice.call(arguments, 1);
  }

  Tracker.Dependency.call(self);
  // Y U No give me subscriptionId, Meteor?!
  var subsBefore = _.keys(connection._subscriptions);
  _.extend(self, connection.subscribe.apply(connection, subscribeArgs));
  var subsNew = _.difference(_.keys(connection._subscriptions), subsBefore);
  if(subsNew.length !== 1) throw new Error('Subscription failed!');
  self.subscriptionId = subsNew[0];

  buffer.push({
    connection: connection,
    name: name,
    subscriptionId: self.subscriptionId,
    instance: self,
    resetOnDiff: false
  });

  // If first store for this subscription name, register it!
  if(_.filter(buffer, function(sub){
    return sub.name === name && sub.connection === connection;
  }).length === 1){
    connection.registerStore(name, {
      update: function(msg){
        var subBuffers = _.filter(buffer, function(sub){
          return sub.subscriptionId === msg.id;
        });

        // If no existing subscriptions match this message's subscriptionId,
        // discard message as it is most likely due to a subscription that has
        // been destroyed.
        // See test/SubscribedArray :: Quick Change test cases
        if(subBuffers.length === 0) return;

        var subBuffer = subBuffers[0];
        var sub = subBuffer.instance;

        if(msg.msg === 'added' &&
            msg.fields && msg.fields.reset === true){
          // This message indicates a reset of a result set
          if(subBuffer.resetOnDiff === false){
            sub.dispatchEvent('reset', msg);
            sub.splice(0, sub.length);
          }
        }else if(msg.msg === 'added' && msg.fields){
          // Aggregation of changes has arrived

          if(subBuffer.resetOnDiff === true){
            sub.splice(0, sub.length);
            subBuffer.resetOnDiff = false;
          }

          var newData = sub.map(function(row, index) {
            row = _.clone(row);
            row._index = index + 1;
            return row;
          });

          Object.keys(msg.fields).forEach(function(applierName) {
            if(!(applierName in diffAppliers))
              throw new Error('DIFF_APPLIER_MISSING: ' + applierName);
            newData = diffAppliers[applierName](newData, msg.fields[applierName]);

            // Prepend first 2 splice arguments to array
            newData.unshift(sub.length);
            newData.unshift(0);

            // Update the subscription's data
            sub.splice.apply(sub, newData);

            // Emit event for application
            sub.dispatchEvent('update', msg.fields[applierName], sub, applierName);
          });
        }

        sub.changed();
      }
    });
  }

};

// Inherit from Array and Tracker.Dependency
SubscribedArray.prototype = new Array;
_.extend(SubscribedArray.prototype, Tracker.Dependency.prototype);

/*
 * Change the arguments for the subscription. Publication name and connection
 *  are preserved.
 */
SubscribedArray.prototype.change = function(/* arguments */){
  var self = this;
  var selfBuffer = _.filter(buffer, function(sub){
    return sub.subscriptionId === self.subscriptionId;
  })[0];

  self.stop();

  var connection = selfBuffer.connection;
  var subscribeArgs = Array.prototype.slice.call(arguments);
  subscribeArgs.unshift(selfBuffer.name);

  var subsBefore = _.keys(connection._subscriptions);
  _.extend(self, connection.subscribe.apply(connection, subscribeArgs));
  var subsNew = _.difference(_.keys(connection._subscriptions), subsBefore);
  if(subsNew.length !== 1) throw new Error('Subscription failed!');
  self.subscriptionId = selfBuffer.subscriptionId = subsNew[0];

  selfBuffer.resetOnDiff = true;
};

SubscribedArray.prototype._eventRoot = function(eventName){
  return eventName.split('.')[0];
};

SubscribedArray.prototype._selectEvents = function(eventName, invert){
  var self = this;
  var eventRoot, testKey, testVal;
  if(!(eventName instanceof RegExp)){
    eventRoot = self._eventRoot(eventName);
    if(eventName === eventRoot){
      testKey = 'root';
      testVal = eventRoot;
    }else{
      testKey = 'name';
      testVal = eventName;
    }
  }
  return _.filter(self._events, function(event){
    var pass;
    if(eventName instanceof RegExp){
      pass = event.name.match(eventName);
    }else{
      pass = event[testKey] === testVal;
    }
    return invert ? !pass : pass;
  });
};

SubscribedArray.prototype.addEventListener = function(eventName, listener){
  var self = this;
  if(typeof listener !== 'function')
    throw new Error('invalid-listener');
  self._events.push({
    name: eventName,
    root: self._eventRoot(eventName),
    listener: listener
  });
};

// @param {string} eventName - Remove events of this name, pass without suffix
//                             to remove all events matching root.
SubscribedArray.prototype.removeEventListener = function(eventName){
  var self = this;
  self._events = self._selectEvents(eventName, true);
};

SubscribedArray.prototype.dispatchEvent = function(eventName /* arguments */){
  var self = this;
  var listenerArgs = Array.prototype.slice.call(arguments, 1);
  var listeners = self._selectEvents(eventName);
  // Newest to oldest
  for(var i = listeners.length - 1; i >= 0; i--){
    // Return false to stop further handling
    if(listeners[i].listener.apply(self, listenerArgs) === false) return false;
  }
  return true;
};

SubscribedArray.prototype.reactive = function(){
  var self = this;
  self.depend();
  return self;
};

SubscribedArray.registerDiffApplier = function(name, applierFun) {
  if(name in diffAppliers)
    throw new Error('DIFF_APPLIER_EXISTS: ' + name);
  if(typeof applierFun !== 'function')
    throw new Error('APPLIER_FUNCTION_REQUIRED');

  diffAppliers[name] = applierFun;
};
