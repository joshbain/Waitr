'use strict';
var waitrModel = require("../models");
var driver = new waitrModel.Driver();
var Core = require("../core");

exports.getDriver = function (args, res, next) {

    driver.find('all', { where: "id = " + args["driverId"].value }, function (err, rows, fields) {
        if (!err) {
            //There should only ever be one row found here, so if what we are looking for is not at index 0 something is wrong.
            if (rows.length == 1) {
                var results = {};
                results['application/json'] = {
                    "name": rows[0].id,
                    "id": rows[0].name,
                    "current_location": {
                        "latitude": rows[0].currentLocationLat,
                        "longitude": rows[0].currentLocationLong
                    }
                };
                if (Object.keys(results).length > 0) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(results[Object.keys(results)[0]] || {}, null, 2));
                }
                else {
                    res.end();
                }
            }
            else {
                res.end();
            }

        }
        else {
            console.log('Error while performing Query.');
            res.end();
        }
    })      

}

exports.getDrivers = function (args, res, next) {
    //var driversList = [];
    //driver.find('all', function (err, rows, fields) {
    //    if (!err) {
    //        for (var i = 0; i < rows.length; i++)
    //            driversList.push({ id: rows[i].id, name: rows[i].name, current_location: { latitude: rows[i].currentLocationLat, longitude: rows[i].currentLocationLong } });            
    //        res.end(JSON.stringify(driversList));
    //    }
    //    else {
    //        console.log('Error while performing Query.');
    //        res.end();
    //    }
    //})

    var rows = Core.drivers();
    var driversList = [];
    for (var i = 0; i < rows.length; i++) {
        var deliveryId = "none";
        if (rows[i].deliveryId)
            deliveryId = rows[i].deliveryId;
        driversList.push({ id: rows[i].id, deliveryId: deliveryId, name: rows[i].name, current_location: { latitude: rows[i].currentLocationLat, longitude: rows[i].currentLocationLong } });
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(driversList));
}

exports.clearDrivers = function (args, res, next) {
    var driver = new waitrModel.Driver();
    driver.remove("id > 0", function (err, result) {
        console.log(result);
    });
    var possibleDelivery = new waitrModel.PossibleDriveDelivery();
    possibleDelivery.remove("id > 0", function (err, result) {
        console.log(result);
    });
    res.end();
    Core.clearDrivers();
    Core.clearPermutations();
}

exports.updateLocation = function (args, res, next) {
    var updatedDriver = new waitrModel.Driver();
    updatedDriver.read(args["driverId"].value, function (err) {
        console.log(updatedDriver);
        updatedDriver.set("currentLocationLat", args["latitude"].value);
        updatedDriver.set("currentLocationLong",args["longitude"].value);
        updatedDriver.save();
        //console.log(updatedDriver);
        Core.invalidatePossibleDeliveriesForDriver(args["driverId"].value);
        res.end();
    });
}

exports.getDriverRecommendations = function (args, res, next) {
    res.setHeader('Content-Type', 'application/json');
    //res.end(JSON.stringify(examples[Object.keys(examples)[0]] || {}, null, 2));
    //var possibleDelivery = new waitrModel.PossibleDriveDelivery();
    //possibleDelivery.find('all', { where: "driverId = 1" }, function (err, rows) {
        //console.log(rows[0]);
    console.log(args["driverId"].value);
    var recomendations = [];
    var rows = Core.recomendations().filter(function (value) { return value.delivery.driver_id == args["driverId"].value });
    rows.sort(function (a, b) {
        if (a.timeLeftNum > 0 && b.timeLeftNum < 0) return -1;
        if (a.timeLeftNum < 0 && b.timeLeftNum > 0) return 1;
        return a.totalDriveTimeNum - b.totalDriveTimeNum;
    });
    //var rows = Core.recomendations();
    for (var i = 0; i < rows.length; i++) {        
        recomendations.push({
            "deliver_by_timestamp": rows[i].delivery.dueBy,
                "pickup_location": {
                    "latitude": rows[i].delivery.pickup_lat,
                    "longitude": rows[i].delivery.pickup_long
                },
                "dropoff_location": {
                    "latitude": rows[i].delivery.dropoff_lat,
                    "longitude": rows[i].delivery.dropoff_long
                }
            });
        }
        res.end(JSON.stringify(recomendations));

    //});      
}

exports.addDriver = function (args, res, next) {        
    var maxCount = args.body.value.length;
    var resultIds = [];
    res.setHeader('Content-Type', 'application/json');
    for (var i = 0; i < args.body.value.length; i++)
    {
        function withOrigonalObject(origonal) {
            return function (err, result) {
                var addDriver = origonal.attributes;
                addDriver.id = result.insertId;
                //console.log(addDriver);
                Core.addDriver(addDriver);
                maxCount--;
                resultIds.push(result.insertId);
                if (maxCount == 0) {
                    res.end(JSON.stringify(resultIds));
                    console.log("Clearing permutations");
                    Core.clearPermutations();
                    console.log("Updating possible deliveries");
                    Core.updatePossibleDeliveryRecomandations();
                }
            }
        }

        var driver = new waitrModel.Driver();
        driver.set("name", args.body.value[i].name);
        driver.set("currentLocationLat", args.body.value[i].current_location.latitude);
        driver.set("currentLocationLong", args.body.value[i].current_location.longitude);
        driver.save(withOrigonalObject(driver));
    }

}


