'use strict';
var waitrModel = require("../models");
var Core = require("../core");

exports.addDeliveries = function (args, res, next) {    
    var maxCount = args.body.value.length;
    for (var index = 0; index < args.body.value.length; index++) {
        //console.log(args.body.value[index]);
        var delivery = new waitrModel.Delivery();        
        delivery.set("pickupLocationLatitude", args.body.value[index].pickup_location.latitude);
        delivery.set("pickupLocationLongitude", args.body.value[index].pickup_location.longitude);
        delivery.set("dropoffLocationLatitude", args.body.value[index].dropoff_location.latitude);
        delivery.set("dropoffLocationLongitude", args.body.value[index].dropoff_location.longitude);
        delivery.set("dueBy", args.body.value[index].deliver_by_timestamp);

        function withOrigonalObject(origonal)
        {
            return function (err, result) {
                var addDelivery = origonal.attributes;
                addDelivery.id = result.insertId;
                Core.addDelivery(addDelivery);
                maxCount--;
                if (maxCount == 0) {
                    console.log("Clearing permutations");
                    Core.clearPermutations();
                    console.log("Updating possible deliveries");
                    Core.updatePossibleDeliveryRecomandations();
                }
            }
        }
        delivery.save(withOrigonalObject(delivery));   
        res.end();        
    }
}

exports.getPossibleDeliveries = function (args, res, next) {
    //var possibleDelivery = new waitrModel.PossibleDriveDelivery();
    //possibleDelivery.find('all', function (err, rows, fields) {
       //res.end(JSON.stringify(rows));
    //});
    res.end(JSON.stringify(Core.permutationsConsidered()));
}

exports.clearDeliveries = function (args, res, next) {
    var delivery = new waitrModel.Delivery();
    delivery.remove("id > 0", function (err, result) {
        console.log(result);
    });
    var possibleDelivery = new waitrModel.PossibleDriveDelivery();
    possibleDelivery.remove("id > 0", function (err, result) {
        console.log(result);
    });
    res.end();
    Core.clearDeliveries();
    Core.clearPermutations();
}

exports.getDeliveries = function (args, res, next) {
    //var delivery = new waitrModel.Delivery();
    //var deliveriesList = [];
    //delivery.find('all', function (err, rows, fields) {
    //    if (!err) {
    //        for (var i = 0; i < rows.length; i++)
    //            //console.log(rows[i])
    //            deliveriesList.push({ id: rows[i].id, pickup_location: { latitude: rows[i].pickupLocationLatitude, longitude: rows[i].pickupLocationLongitude }, dropoff_location: { latitude: rows[i].dropoffLocationLatitude, longitude: rows[i].dropoffLocationLongitude } });
    //        res.end(JSON.stringify(deliveriesList));
    //    }
    //    else {
    //        console.log('Error while performing Query.');
    //        res.end();
    //    }
    //})
    var rows = Core.deliveries();
    var deliveriesList = [];
    for (var i = 0; i < rows.length; i++) {
        var driverId = "none";
        if (rows[i].driverId)
            driverId = rows[i].driverId;

        var exception = "none";
        if (rows[i].exception)
            exception = rows[i].exception;
        deliveriesList.push({ id: rows[i].id, dueBy: rows[i].dueBy, exception: exception,  driverId: driverId, pickup_location: { latitude: rows[i].pickupLocationLatitude, longitude: rows[i].pickupLocationLongitude }, dropoff_location: { latitude: rows[i].dropoffLocationLatitude, longitude: rows[i].dropoffLocationLongitude } });
    }
    res.end(JSON.stringify(deliveriesList));
}

exports.getDeliveriesRecomendationsRatio = function (args, res, next) {
    var data = {};
    data.successRateForDashBoard = Core.successRateForDashBoard();
    data.exceptions = Core.exceptions();
    res.end(JSON.stringify(data));
}