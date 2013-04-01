var winston = require('winston');
var rest = require('restler');
var hashish = require('hashish');
var async = require('async');
var fs = require('fs');

var Controller = module.exports = {};

Controller.gradeRequest = function(req, res, next) {
  winston.info('grading a CCD request of length ' + req.rawBody.length);
  winston.info('grading a CCD request of length ' + JSON.stringify(req.headers));
  grade({
    src: req.rawBody,
    save: (req.query.example !== "true")
  }, function(err, report){
    res.json(report);
  });
};

