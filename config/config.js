var mongodb = require('mongodb');
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var events = require('events');
var async = require('async');

var port = (process.env.VMC_APP_PORT || 3000);
var host = (process.env.VCAP_APP_HOST || 'localhost');

module.exports = {
 	env: process.env.NODE_ENV || 'development',
  port: port,
  host: host,
  publicUri: process.env.PUBLIC_URI || "http://localhost:3000",
  appServer: process.env.APP_SERVER || "http://localhost:3001/apps",
};
