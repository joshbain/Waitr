'use strict'

var waitrModel = require("./models.js");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var permutations = [];  //This is really combinations so the variable name is a bit misleading, it's every possible delivery by every possible driver, with the google data added.
var drivers = []; //The list of drivers, this is loaded at start up from the mysql back end and kept up to date as the data is manipulated via the service.
var deliveries = []; //The list of deliveries, this is loaded at start up from the mysql back end and kept up to date as the data is manipulated via the service.
var driveDeliveries = [];  //Every possible delivery by every possible driver.
var recomendations = [];  //The final set of recomandations which are used as the source data to inform the api.
var pendingRecomendations = [];  //A tempory space to store recomendations while they are being generated, before they are copied to "recomnendations"
var pickupAndDeliveryTime = 900;  //900 seconds (15 minutes) to physically get the food and drop it off (in addition to the drive time)
var currentSuccesses = 0;  //The number of deliveries we predict will be successful based on the current state of the system.
var currentSuccessesPercentage = 0;  //Same as currentSuccesses but expressed as a percentage of the total number of deliveries in the sysetm.
var exceptions = []; //Exceptions, deliveries that do not meet the win condition.

var googleDistanceMatrixKey = "<GOOGLE API KEY>";  //Like the name says!

//Make sure that we are considering every driver for every delivery.  If I was engineering this further I'd probobly set some geofencing arround each location, so that for example
//a driver from another city shouldn't be considered for a local delivery in a fully functional system.
function possibleDriveDeliveries(consideredDriveDeliveries) {
    //Because clearing the array is costless (we aren't making calls to google), on balance we probobly save more CPU by just clearing and rebuilding it than we would
    //Checking for duplicates.
    consideredDriveDeliveries = [];
    for (var driverIndex = 0; driverIndex < drivers.length; driverIndex++)
        for (var deliveryIndex = 0; deliveryIndex < deliveries.length; deliveryIndex++)
        {
            var driveDelivery = {};
            driveDelivery.driver_id = drivers[driverIndex].id;
            driveDelivery.delivery_id = deliveries[deliveryIndex].id;
            driveDelivery.pickup_lat = deliveries[deliveryIndex].pickupLocationLatitude;
            driveDelivery.pickup_long = deliveries[deliveryIndex].pickupLocationLongitude;
            driveDelivery.dropoff_lat = deliveries[deliveryIndex].dropoffLocationLatitude;
            driveDelivery.dropoff_long = deliveries[deliveryIndex].dropoffLocationLongitude;
            driveDelivery.dueBy = deliveries[deliveryIndex].dueBy;
            driveDelivery.currentLocationLat = drivers[driverIndex].currentLocationLat;
            driveDelivery.currentLocationLong = drivers[driverIndex].currentLocationLong;
            consideredDriveDeliveries.push(driveDelivery);
        }
    return consideredDriveDeliveries;
}

//Updates the gps location of a driver in our memory store.  Used to then recalculate that drivers optimal deliveries.
function updateDriverCurrentLocation(driverId, latitude, longitude, consideredDriveDeliveries)
{
    for (var index = 0; index < consideredDriveDeliveries.length; index++)
    {
        if (consideredDriveDeliveries[index].driver_id == driverId)
        {
            consideredDriveDeliveries[index].currentLocationLat = latitude;
            consideredDriveDeliveries[index].currentLocationLong = longitude;
        }
    }
    return consideredDriveDeliveries;
}

//Since there is cost to checking for a given combination (we run a request to Google) we need to make sure we are not doing so if we already know the answer.
function doesPermutationExist(driverId, deliveryId, consideredPermutations)
{
    for (var index = 0; index < consideredPermutations.length; index++)
        if (consideredPermutations[index].deliveryId === deliveryId && consideredPermutations[index].driverId === driverId)
            return true
    return false;
}

//Take a given array of existing permutations (which could be empty) and update them with anything missing from the master list of driver/delivery combinations
//If there was a reason to consider less than the total list (such as if we'd imlimented geofencing) we'd allow this function to take a list of combinations but
//under the circimstances we'll always just update then check against the master list.
function updatePossibleDeliveryRecomandations(permutationsToBeUpdated, driveDeliveriesConsidered, callback)
{
    for (var index = 0; index < driveDeliveriesConsidered.length; index++) {
        //Only add a new permutation for consideration if it doesn't already exist.  If something changes that requires reevaluation we'll remove the existing data
        if (doesPermutationExist(driveDeliveriesConsidered[index].driver_id, driveDeliveriesConsidered[index].delivery_id, permutationsToBeUpdated) == false)
            updatePossibleDelivery(driveDeliveriesConsidered[index], permutationsToBeUpdated);
    }
    //And if for some reason there is a callback, lets excute it only when we've got all the answers back from google!
    if (typeof callback !== "undefined")
    {
        var checkForCompletion = setInterval(function () {
            console.log("Waiting for Google postbacks...");
            console.log(permutationsToBeUpdated.length);
            if (permutationsToBeUpdated.length == driveDeliveries.length)
            {
                console.log("Google postbacks complete.");
                clearInterval(checkForCompletion);
                callback(permutationsToBeUpdated);
            }
        }, 100);
    }
}


//The name says it all, when "node app.js" is executed this is called in addition to the set up of the swagger middleware
function startUp() {
    ////Load all the data from the database into memory where we can handle it more adroitly.
    loadAllDrivers(function () {
        loadAllDeliveries(function () {
            console.log("All base data loaded from database.");
            //        //Check and see if the current arrangemnet of data could be more efficent

            //        //Make sure the master list is up to date.
            driveDeliveries = possibleDriveDeliveries(driveDeliveries);
            updatePossibleDeliveryRecomandations(permutations, driveDeliveries, optimizeRecomendations);
            setInterval(function () {
                var now = new Date();
                for (var index = 0; index < permutations.length; index++) {
                    var deliveryTime = new Date(permutations[index].dueBy);
                    var secondsRemainingToDeliver = (deliveryTime - now) / 1000;
                    permutations[index].timeLeftNum = secondsRemainingToDeliver - permutations[index].totalDriveTimeNum;
                    //console.log("Updated value: " + permutations[index].timeLeftNum);
                }
                exceptions = [];
            for (var index = 0; index < deliveries.length; index++)
                findExceptionsForDelivery(deliveries[index].id);
            }, 30000);           
        });
    });
}

//Mostly just for the edification of the dashboard, sets some data we then use to show the highest recomendations conveiently without a driver application
function setFirstRecomendation(driverId, deliveryId)
{
    for (var index = 0; index < drivers.length; index++)
        if (drivers[index].id == driverId)
            drivers[index].deliveryId = deliveryId;

    for (var index = 0; index < deliveries.length; index++)
        if (deliveries[index].id == deliveryId)
            deliveries[index].driverId = driverId;
}

//Mostly just for the edification of the dashboard, attaches the exception to the delivery in the summary data.
function setException(exception, deliveryId) {
    for (var index = 0; index < deliveries.length; index++)
        if (deliveries[index].id == deliveryId)
            deliveries[index].exception = exception;
}


//Finds deliveries which are in an exception state and populates the information to the appropriate places.  In a more complete implimentation there would likey be a number of possible exceptions
//rather than the one that is listed here.
function findExceptionsForDelivery(deliveryId)
{
    var isThereAnyWayToMakeDelivery = false;
    var dueBy;
    var seconds = 0;
    for (var index = 0; index < permutations.length; index++) {
        if (permutations[index].deliveryId == deliveryId) {
            var interval = (parseInt(pickupAndDeliveryTime) + parseInt(permutations[index].totalDriveTimeNum));
            var final = new Date();
            final = new Date(final.getTime() + (interval * 1000));

            dueBy = new Date(Date.parse(permutations[index].dueBy));

            if (dueBy > final)
                isThereAnyWayToMakeDelivery = true;  

            seconds = permutations[index].timeLeftNum;
        }
    }
    if (isThereAnyWayToMakeDelivery == false && typeof dueBy !== "undefined") {
        exceptions.push({ id: exceptions.length, type: "Missed Delivery", explaination: "No combination of recomendations would allow this delivery (" + deliveryId + ") be met in time (" + dueBy + ")." });
        setException("No combination of recomendations would allow this delivery (" + deliveryId + ") be met in time (" + dueBy + ").  Time remaining: "+seconds+" seconds.", deliveryId);
    }
    else {
        //var now = new Date();
        //setException("Present: " + now + " delivery: " + dueBy + " Time remaining: " + seconds+" seconds.", deliveryId);
        setException("none", deliveryId);
    }
}

//Based on our win condition we want an ordered list of driver/delivery combinations for a given delivery, ordered from the most efficent to least efficent.
//Because we might be predictive here, i.e. assume that a given driver will pick up a delivery after the one they are working on currently, we will allow
//the function to take a specific set of delivery combinations rather than always checking the master list derived from the present information.
function GetOptimalRecomendationsForDelivery(deliveryId, permutationsConsidered) {
    //We are only looking for the drive times associated with one particular delivery not all deliveries.
    var orderedRecomendationsForDelivery = permutationsConsidered.filter(function (value) { return value.deliveryId == deliveryId });
    //Because of our win condition a delivery we estimate we can complete in time is given priority over one we belive we will miss anyway.
    //Otherwise we will of course prioritize the delivery which can be completely in the smallest amount of time.
    orderedRecomendationsForDelivery.sort(function (a, b) {
        if (a.timeLeftNum > 0 && b.timeLeftNum < 0) return -1;
        if (a.timeLeftNum < 0 && b.timeLeftNum > 0) return 1;
        return b.timeLeftNum - a.timeLeftNum;
    });
    //And lets send that back to the requester.
    return orderedRecomendationsForDelivery;
}

//Once we have a recomendation for driver we will assume that they will accept it and therefore will be enguaged for the time of that delivery
//Therefore we will penalize the time it will take to make any other deliveries we might then recomend by the time it takes them to complete the
//one they are expected to accept.  This is only used for predictive elements of the algorthim of course, figuring out if we are meeting our win 
//condition or not, or deciding what to recomend to a driver once they have accepted their current delivery.
function SetTimePenaltyForDriver(driverId, time, permutationsConsidered)
{
    //Go through every combination and if it matches our diver increase the total drive time by the specified amount.
    //That's not an accurate peice of data of course but it simplifies out predictive algorthum.  If I was going to 
    //do future development I would likely add a new field for this, simply for the sake of clarity and possible future
    //development which might need to make the distinction bettween the actual drive time and the time of the present enguagements
    for (var index = 0; index < permutationsConsidered.length; index++)
        if (permutationsConsidered[index].driverId == driverId)
            permutationsConsidered[index].timeLeftNum -= time;        
    //And return the updated array to the sender.  Likely unessicary - perhaps should be removed.
    return permutationsConsidered;
}

//The main workhorse of the core.  The peice of code that actually decides what deliveries to recomend to what drivers and in what order.
function optimizeRecomendations() {
    //Lets dispense with what was the right set of recomendations a minute ago or before we got new data.  Things may have changed.

    pendingRecomendations = [];

    //We need to reset our metrics as well

    //var orderedRecomendationsForDriver549 = permutations.find(function (permutation) { return permutaion.driverId === 549 });

    //We want to copy our current permutations as we are going to do some theoretical projections with the data, and don't want to sully the origonal information.
    var theoreticalPermutations = JSON.parse(JSON.stringify(permutations));
    var theoreticalDriveDeliveries = JSON.parse(JSON.stringify(driveDeliveries));  

    //Now lets find the oprimal driver for each delivery and the optimal order in which to recomend those deliveries to them, such that, if they accept each in turn as it becomes
    //the first recomendation the win condition will be met.

    //This is a bit tricky as being predictive here requires us to re-order our assumptions after each step of the process.  That is, after we decided driver X is the most efficent option for delivery y
    //we then need to consider the next delivery in the context of where we predict the driver will be when they finish that delivery (since we assume they will always take the first recomendation)
    //and how long that took them - after all there is always the possibility that given those assumptions the driver will be more efficent for a delivery when they are done with the first recomendation
    //even condiering the time it took them.
    //This would be simplier if we didn't need to wait for the callbacks from google, but of course we do to establish the drive times so each step is asyncronous, but what else is new?

    function w(index, allDeliveries, consideredDeliveries, theoreticalPermutations, theoreticalDriveDeliveries, callback)
    {       
        var ConsideredPermutations = GetOptimalRecomendationsForDelivery(deliveries[index].id, theoreticalPermutations);
        if (ConsideredPermutations.length > 0) {
            var timeToMakeRecomendation = ConsideredPermutations[0].totalDriveTimeNum + pickupAndDeliveryTime;            
            pendingRecomendations.push(ConsideredPermutations[0]);
            theoreticalDriveDeliveries = updateDriverCurrentLocation(ConsideredPermutations[0].driverId, ConsideredPermutations[0].delivery.dropoff_lat, ConsideredPermutations[0].delivery.dropoff_long, theoreticalDriveDeliveries);
            theoreticalPermutations = invalidatePossibleDeliveriesForDriver(ConsideredPermutations[0].driverId, theoreticalPermutations);
            theoreticalPermutations = updatePossibleDeliveryRecomandations(theoreticalPermutations, theoreticalDriveDeliveries, function (theoreticalPermutations) {
                theoreticalPermutations = SetTimePenaltyForDriver(ConsideredPermutations[0].driverId, timeToMakeRecomendation, theoreticalPermutations);
                if (index < allDeliveries - 1)
                    w(++index, allDeliveries, consideredDeliveries, theoreticalPermutations, theoreticalDriveDeliveries, callback);
                else {
                    if (typeof callback !== "undefined") {
                        callback();
                    }
                }
            });           
        }
    }

    var allDeliveries = deliveries.length;
    var index = 0;

    if (deliveries.length > 0 && theoreticalPermutations.length > 0 && theoreticalDriveDeliveries.length > 0)
        w(index, allDeliveries, deliveries, theoreticalPermutations, theoreticalDriveDeliveries, function () {
            recomendations = JSON.parse(JSON.stringify(pendingRecomendations));

            currentSuccesses = 0;
            currentSuccessesPercentage = 0;

            for (var index = 0; index < recomendations.length; index++) {
            console.log("Delivery " + recomendations[index].deliveryId + " is recomended for driver " + recomendations[index].driverId + " will be " + Boolean(recomendations[index].dueBy > final));
            console.log(recomendations[index].timeLeftNum);
            setFirstRecomendation(recomendations[index].driverId, recomendations[index].deliveryId);

            var interval = (parseInt(pickupAndDeliveryTime) + parseInt(recomendations[index].totalDriveTimeNum));
            var final = new Date();
            final = new Date(final.getTime() + (interval * 1000));
            var dueBy = new Date(Date.parse(recomendations[index].dueBy));
         
            if (dueBy > final)
                currentSuccesses++;
            else
            {
                exceptions.push({ id: exceptions.length, type: "Missed Delivery", explaination: "No combination of recomendations would allow this delivery (" + recomendations[index].deliveryId + ") be met in time (" + dueBy + ")." });
                setException("No combination of recomendations would allow this delivery (" + recomendations[index].deliveryId + ") be met in time (" + dueBy + ").", recomendations[index].deliveryId);
            }
            //console.log("SUCCESSFUL RECOMENDATION");
        }
        //At this point we are already doing everything we can to meet the win condition.  We are recomending the most urgent delivery to each driver and prioritizing those
        //which can be made in their window over those which cannot, which best facilities making every delivery with the fewest missed commitments.  However, for some reason
        //when I mocked up my UI I decided to include an overall success metric for the algorthim which now requires us to do some predictive calculations - i.e. if everything 
        //goes according to plan what percentage of deliveries that we are not currently recomending first will be successfully made if things continue as they are.

        currentSuccessesPercentage = (100 / deliveries.length);
        currentSuccessesPercentage = currentSuccessesPercentage * currentSuccesses;
        console.log("Current Success Percentage: " + currentSuccessesPercentage);
    });
   
}

//Checking if there is a conflicting recomandation to the one we are examining.  I.e. are we already considering a first recomendation for this delivery (though really we are
//examining things in terms of the driver's first delivery as that what's matters to us).
function AlreadyHasRecomendation(deliveryId) {    
    var existingRecomendation = null;
    for (var index = 0; index < recomendations.length; index++) {
        if (recomendations[index].deliveryId == deliveryId) {
            existingRecomendation = recomendations[index];
            //console.log("There is already a recomendation for delivery: " + deliveryId);
        }
    }
    return existingRecomendation;
}

function DriverAlreadyRecomended(driverId) {
    var existingRecomendation = null;
    for (var index = 0; index < recomendations.length; index++) {
        if (recomendations[index].driverId == driverId) {
            existingRecomendation = recomendations[index];
            //console.log("There is already a recomendation for delivery: " + deliveryId);
        }
    }
    return existingRecomendation;
}

//Remove the recomandation from the list of current recomendations (presumably because we have determined there is a better driver to handle this one).
function RemoveRecomendation(id)
{
    for (var index = 0; index < recomendations.length; index++) {
        if (recomendations[index].id == id) {
            //console.log("Removing permutation id " + id + " from recomendations");
            recomendations.splice(index, 1);            
        }
    }
}

//In this case does one of them result in a missed delivery while the other doesn't or which is overall the shortest delivery if neither choice compromised the win condition.
function WhichRecomendationIsBetter(recomendationOne, recomendationTwo)
{
    var betterOption = null;

    //Including a time interval (defined above) for the actual pick up and delivery
    var intervalOne = pickupAndDeliveryTime + recomendationOne.totalDriveTimeNum;
    var intervalTwo = pickupAndDeliveryTime + recomendationOne.totalDriveTimeNum;

    //The interval time plus now equals the earliest time this driver could complete the delivery.
    var finalOne = new Date();
    var finalTwo = new Date();
    finalOne = new Date(finalOne + (intervalOne * 1000));
    //finalOne.setSeconds(finalOne.getSeconds() + intervalOne);
    finalTwo = new Date(finalTwo + (intervalTwo * 1000));
    //finalTwo.setSeconds(finalTwo.getSeconds() + intervalTwo);


    //If the origonal recomendation will be completed in time but the alternate would not then the origonal is the better option.
    if (finalOne < recomendationOne.dueBy && finalTwo > recomendationTwo.dueBy) betterOption = recomendationOne;

    //If the origonal recomendation will not be completed in time but the alternate would then the origonal is the better option.
    if (finalOne > recomendationOne.dueBy && finalTwo < recomendationTwo.dueBy) betterOption = recomendationTwo;

    //If neither option is superior in terms of completion then the superior is probobly whichever is quicker overall 
    if (betterOption == null) {
        if (intervalOne < intervalTwo)
            betterOption = recomendationOne;
        else
            betterOption = recomendationTwo;
            }

    //This would be a simpler matter if overall optimization were the goal, but there is the possibility that giving the faster interval
    //as a first recomendation results in another delivery not getting made (if it displaces what would otherwise be the recomendation).  
    //Next thing we need to know therefore is what would the result be if we take the second recomendation.
    if (betterOption == recomendationTwo)
    {

    }

    return betterOption;
}

//Load the current dataset from the database into memory.  This should really only be required on start up as any new data introduced through the API should be pushed into memory 
//when it's added to the database.

function loadAllDrivers(callback) {
    var driver = new waitrModel.Driver();
    driver.find('all', function (err, rows, fields) {
        if (!err) {
            for (var index = 0; index < rows.length; index++)
                drivers.push(rows[index]);
            callback();
        }
        else
            console.log(err);
    });
}

function loadAllDeliveries(callback) {
    var delivery = new waitrModel.Delivery();
    delivery.find('all', function (err, rows, fields) {
        if (!err) {
            for (var index = 0; index < rows.length; index++)
                deliveries.push(rows[index]);
            callback();
        }
        else
            console.log(err);
    });
}


//Lets fetch the drive times from the google distance matrix and populate all the information so that we can actually figure out what to do with it.
function updatePossibleDelivery(delivery, consideredPermutations) {
    var driveTimeUrl = "https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=" + delivery.currentLocationLat + "%2C" + delivery.currentLocationLong + "&destinations=" + delivery.pickup_lat + "%2C" + delivery.pickup_long + "%7C" + delivery.dropoff_lat + "%2C" + delivery.dropoff_long + "&key=" + googleDistanceMatrixKey;
    
    var xmlhttp = null;

    if (XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp = new XMLHttpRequest();
    }
    else {// code for IE6, IE5
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }

    function withDelivery(delivery) {
        return function (evt) {
            if (xmlhttp.readyState == 4) {
                var result = JSON.parse(xmlhttp.responseText);
                console.log(result);
                if (result.status == "OK") {
                    
                    var possibleDelivery = { id: permutations.length };

                    possibleDelivery.delivery = delivery;                    
                    possibleDelivery.driverId = delivery.driver_id;                    
                    possibleDelivery.deliveryId = delivery.delivery_id;                    
                    possibleDelivery.dueBy = delivery.dueBy;                    
                    possibleDelivery.originAddress = result.origin_addresses[0];

                    possibleDelivery.pickupAddress = result.destination_addresses[0];
                    if (result.rows[0].elements[0].status == "OK") {
                        possibleDelivery.driveTimeToPickUp = result.rows[0].elements[0].duration.text;
                        possibleDelivery.driveTimeToPickUpNum = result.rows[0].elements[0].duration.value;
                    }

                    possibleDelivery.deliveryAddress = result.destination_addresses[1];
                    if (result.rows[0].elements[1].status == "OK") {
                        possibleDelivery.driveTimeToDelivery = result.rows[0].elements[1].duration.text;
                        possibleDelivery.driveTimeToDeliveryNum = result.rows[0].elements[1].duration.value;
                    }

                    if (result.rows[0].elements[1].status == "OK" && result.rows[0].elements[0].status == "OK") {
                        var now = new Date();
                        var deliveryTime = new Date(delivery.dueBy);
                        var secondsRemainingToDeliver = (deliveryTime - now) / 1000;
                        possibleDelivery.totalDriveTimeNum = (parseInt(result.rows[0].elements[1].duration.value) + parseInt(result.rows[0].elements[0].duration.value));
                        possibleDelivery.timeLeftNum = secondsRemainingToDeliver - (parseInt(result.rows[0].elements[1].duration.value) + parseInt(result.rows[0].elements[0].duration.value));
                    }
                    consideredPermutations.push(possibleDelivery);
                }
            }
        }
    }

    xmlhttp.onreadystatechange = withDelivery(delivery);
    xmlhttp.open("GET", driveTimeUrl, true);
    xmlhttp.send();
}

function invalidatePossibleDeliveriesForDriver(driverId, consideredPermutations)
{
    for (var index = 0; index < consideredPermutations.length; index++)
    {
        if (consideredPermutations[index].driverId == driverId)
            consideredPermutations.splice(index, 1);
    }
    return consideredPermutations;
}

function getCurrentSuccessRatio()
{
    return currentSuccessesPercentage;
}

var Core = {
    updatePossibleDeliveryRecomandations: function () { driveDeliveries = possibleDriveDeliveries(driveDeliveries); updatePossibleDeliveryRecomandations(permutations, driveDeliveries, optimizeRecomendations); },
    invalidatePossibleDeliveriesForDriver: invalidatePossibleDeliveriesForDriver,
    successRateForDashBoard: getCurrentSuccessRatio,
    permutationsConsidered: function () { return permutations; },
    drivers: function () { return drivers; },
    addDriver: function (driver) { drivers.push(JSON.parse(JSON.stringify(driver))); },
    clearDrivers: function () { drivers = []; },    
    deliveries: function () { return deliveries; },
    addDelivery: function (delivery) { deliveries.push(JSON.parse(JSON.stringify(delivery))); },
    clearDeliveries: function () { deliveries = []; },
    clearPermutations: function () { exceptions = []; driveDeliveries = []; permutations = []; recomendations = []; currentSuccesses = 0; currentSuccessesPercentage = 0; },
    startUp: startUp,
    exceptions: function () { return exceptions; },
    recomendations: function () { return recomendations; }
}

module.exports = Core;