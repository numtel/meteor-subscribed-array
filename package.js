Package.describe({
  name: 'numtel:subscribed-array',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.0');

  api.use('underscore');
  api.use('ddp');
  api.use('tracker');

  api.addFiles('array-publisher.js', 'server');
  api.addFiles('subscribed-array.js', 'client');
  api.addFiles('diff-allow-duplicates.js', 'client');

  api.export('RegisterArrayPublisher', 'server');
  api.export('SubscribedArray', 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('numtel:subscribed-array');
  api.addFiles('publisher.test.js', 'server');
  api.addFiles('subscribed-array-test-server.js', 'server')
  api.addFiles('subscribed-array-test.js', 'client');
});
