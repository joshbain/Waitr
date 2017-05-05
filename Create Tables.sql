DROP TABLE IF EXISTS `Waitr`.`tbl_drivers`;
CREATE TABLE  `Waitr`.`tbl_drivers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(80) DEFAULT NULL,
  `currentLocationLat` double DEFAULT NULL,
  `currentLocationLong` double DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=702 DEFAULT CHARSET=latin1;

DROP TABLE IF EXISTS `Waitr`.`tbl_deliveries`;
CREATE TABLE  `Waitr`.`tbl_deliveries` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `dueBy` varchar(45) DEFAULT NULL,
  `pickupLocationLatitude` double DEFAULT NULL,
  `pickupLocationLongitude` double DEFAULT NULL,
  `dropoffLocationLatitude` double DEFAULT NULL,
  `dropoffLocationLongitude` double DEFAULT NULL,
  `asOf` datetime NOT NULL,
  `driverRecomendedId` bigint(20) DEFAULT NULL,
  `status` varchar(1) DEFAULT 'N',
  PRIMARY KEY (`id`,`asOf`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1733 DEFAULT CHARSET=latin1;