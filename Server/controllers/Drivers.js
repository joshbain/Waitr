'use strict';

var url = require('url');

var Drivers = require('./DriversService');

module.exports.getDriver = function getDriver (req, res, next) {
    Drivers.getDriver(req.swagger.params, res, next);
};

module.exports.getDrivers = function getDriver(req, res, next) {
    Drivers.getDrivers(req.swagger.params, res, next);
};

module.exports.updateLocation = function getDriver(req, res, next) {
    Drivers.updateLocation(req.swagger.params, res, next);
};

module.exports.getDriverRecommendations = function getDriverRecommendations (req, res, next) {
    console.log("TEST");
    Drivers.getDriverRecommendations(req.swagger.params, res, next);
};

module.exports.addDriver = function getDriver(req, res, next) {
    Drivers.addDriver(req.swagger.params, res, next);
};

module.exports.clearDrivers = function clearDrivers(req, res, next) {
    Drivers.clearDrivers(req.swagger.params, res, next);
};

module.exports.options = function getDrivers(req, res, next) {
    //I don't pass this to the service because it's just a resonse to satisfy the pre-flight check when cross domain posting
    //Drivers.addDriver(req.swagger.params, res, next);
    res.end();
};