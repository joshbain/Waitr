'use strict';

var url = require('url');

var Deliveries = require('./DeliveriesService');

module.exports.addDeliveries = function addDeliveries (req, res, next) {
    Deliveries.addDeliveries(req.swagger.params, res, next);
};

module.exports.getDeliveries = function getDeliveries(req, res, next) {
    Deliveries.getDeliveries(req.swagger.params, res, next);
};

module.exports.clearDeliveries = function clearDeliveries(req, res, next) {
    Deliveries.clearDeliveries(req.swagger.params, res, next);
};

module.exports.getPossibleDeliveries = function getPossibleDeliveries(req, res, next) {
    Deliveries.getPossibleDeliveries(req.swagger.params, res, next);
};

module.exports.options = function getDeliveries(req, res, next) {
    //I don't pass this to the service because it's just a resonse to satisfy the pre-flight check when cross domain posting
    //Drivers.addDriver(req.swagger.params, res, next);
    res.end();
};

module.exports.getDeliveriesRecomendationsRatio = function getDeliveriesRecomendationsRatio(req, res, next) {
    Deliveries.getDeliveriesRecomendationsRatio(req.swagger.params, res, next);
}