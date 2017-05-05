var mysqlModel = require('mysql-model');

var MyAppModel = mysqlModel.createConnection({
    host: '<DB HOST>',
    user: '<DB USER>',
    password: '<DB PASSWORD>',
    database: 'Waitr'
});

var Driver = MyAppModel.extend({
    tableName: "tbl_drivers",
});

var Dellivery = MyAppModel.extend({
    tableName: "tbl_deliveries",
});

var Location = MyAppModel.extend({
    tableName: "tbl_locations",
});

var PossibleDeliveryView = MyAppModel.extend({
    tableName: "vw_pendingdeliveries_possible",
});

var PossibleDelivery = MyAppModel.extend({
    tableName: "tbl_possibe_deliveries",
});


var waitrModel = {
    "Driver": Driver,
    "Delivery": Dellivery,
    "Location": Location,
    "PossibleDelivery": PossibleDeliveryView,
    "PossibleDriveDelivery": PossibleDelivery
}

module.exports = waitrModel;