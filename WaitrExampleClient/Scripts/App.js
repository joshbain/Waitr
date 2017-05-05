var app = {}
//var appURL = "localhost"

var AppViewModel = function () {
    Self = this;
    Self.driver = {};
    Self.drivers = ko.observableArray();
    Self.deliveries = ko.observableArray();
    Self.exceptions = ko.observableArray();
    Self.possibleDeliveries = ko.observableArray();
    Self.longitude = ko.observable();
    Self.latitude = ko.observable();
    Self.name = ko.observable();
    Self.track = ko.observable();
    Self.appMode = ko.observable();
    Self.successRatio = ko.observable(0);
    Self.updateDash = function () {
        $.ajax({
            type: 'GET',
            url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/deliveries/RecomendationsRatio',
            contentType: 'application/json',
            dataType: 'json',
            success: function (data) {
                //console.log(data);
                app.viewModel.exceptions(data.exceptions);
                app.viewModel.successRatio(data.successRateForDashBoard);
                app.viewModel.chartData.setValue(0, 1, data.successRateForDashBoard);
                app.viewModel.chart.draw(app.viewModel.chartData, app.viewModel.chartOptions);
            },
            error: function (err, e) {
                console.log(err);
                console.log(e);
            }
        });



        $.ajax({
            type: 'GET',
            url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/drivers',
            contentType: 'application/json',
            dataType: 'json',
            success: function (data) {
                app.viewModel.drivers(data);
            },
            error: function (err, e) {
                console.log(err);
                console.log(e);
            }
        });

        $.ajax({
            type: 'GET',
            url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/deliveries',
            contentType: 'application/json',
            dataType: 'json',
            success: function (data) {
                app.viewModel.deliveries(data);
            },
            error: function (err, e) {
                console.log(err);
                console.log(e);
            }
        });

        $.ajax({
            type: 'GET',
            url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/deliveries/possible',
            contentType: 'application/json',
            dataType: 'json',
            success: function (data) {
                app.viewModel.possibleDeliveries(data);
            },
            error: function (err, e) {
                console.log(err);
                console.log(e);
            }
        });

    };
    Self.deleteDatabase = function () {             
        if (confirm("Delete all drivers and deliveries?") == true)
        {
            $.ajax({
                type: 'GET',
                url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/drivers/clear',
                contentType: 'application/json',
                dataType: 'json',
                success: function (data) {
                    Self.updateDash();
                },
                error: function (err, e) {
                    console.log(err);
                    console.log(e);
                }
            });

            $.ajax({
                type: 'GET',
                url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/deliveries/clear',
                contentType: 'application/json',
                dataType: 'json',
                success: function (data) {
                    Self.updateDash();
                },
                error: function (err, e) {
                    console.log(err);
                    console.log(e);
                }
            });
        }
    },
    Self.processDeliveries = function () {        
        for (var i = 0; i < Dropzone.forElement("#my-awesome-dropzone2").files.length; i++) {
            var reader = new FileReader();
            reader.onload = function () {
                console.log(JSON.stringify(JSON.parse(reader.result)));
                $.ajax({
                    type: 'POST',
                    url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/deliveries/add',
                    contentType: 'application/json',
                    data: JSON.stringify(JSON.parse(reader.result)),
                    dataType: 'json',
                    success: function (data) {
                        //console.log(i);
                        console.log(Dropzone.forElement("#my-awesome-dropzone2").files[i]);
                        //Dropzone.forElement("#my-awesome-dropzone").removeFile(Dropzone.forElement("#my-awesome-dropzone").files[i]);
                    },
                    error: function (err, e) {
                        console.log(err);
                        console.log(e);
                    }
                });
            }
            reader.readAsText(Dropzone.forElement("#my-awesome-dropzone2").files[i]);
        }
        Dropzone.forElement("#my-awesome-dropzone2").processQueue();
        //Dropzone.forElement("#my-awesome-dropzone2").removeAllFiles(true);
        setTimeout(function () {
            Self.clearDeliveries();
        }, 1000);
        Self.updateDash();
    };
    Self.processDrivers = function () {        
        //console.log(Dropzone.forElement("#my-awesome-dropzone"));
        for (var i = 0; i < Dropzone.forElement("#my-awesome-dropzone").files.length; i++) {
            var reader = new FileReader();
            reader.onload = function () {                
                $.ajax({
                    type: 'POST',
                    url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/drivers/add',
                    contentType: 'application/json',
                    data: JSON.stringify(JSON.parse(reader.result)),
                    dataType: 'json',
                    success: function (data) {
                        //console.log(i);
                        console.log(Dropzone.forElement("#my-awesome-dropzone").files[i]);
                        //Dropzone.forElement("#my-awesome-dropzone2").removeFile(Dropzone.forElement("#my-awesome-dropzone2").files[i]);
                    },
                    error: function (err, e) {
                        console.log(err);
                        console.log(e);
                    }             
                });
            }
            reader.readAsText(Dropzone.forElement("#my-awesome-dropzone").files[i]);
        }
        Dropzone.forElement("#my-awesome-dropzone").processQueue();
        //Dropzone.forElement("#my-awesome-dropzone").removeAllFiles(true);
        setTimeout(function () {
            Self.clearDrivers();
        }, 1000);

        Self.updateDash();
    };
    Self.clearDrivers = function () {
        Dropzone.forElement("#my-awesome-dropzone").removeAllFiles(true);
    };
    Self.clearDeliveries = function () {
        Dropzone.forElement("#my-awesome-dropzone2").removeAllFiles(true);
    };
    Self.selectMode = function (mode) {
        Self.appMode(mode);
    };
    Self.createNewDriver = function () {
        Self.driver = {
            "name": Self.name(),
            "current_location": {
                "latitude": parseFloat(Self.latitude()),
                "longitude": parseFloat(Self.longitude())
            }
        }

        $.ajax({
            type: 'POST',
            url: 'http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/drivers/add',
            contentType: 'application/json',
            data: JSON.stringify([Self.driver, Self.driver]),
            dataType: 'json',
            success: function (data) {
                var me = Self.driver;
                me.id = data[0];
                $.cookie("driver", JSON.stringify(me));
                Self.appMode("driving");
            },
            error: function (err, e) {
                console.log(err);
                console.log(e);
            }
            //processData: false,                        
        });

    };
}

$("document").ready(function () {
    app.viewModel = new AppViewModel();  
    //Determine Mode
    app.viewModel.appMode("dashboard");

    //app.viewModel.appMode.subscribe(function (newValue) {
    //    if (newValue == "dashboard")
    //    {
    //        app.viewModel.updateDash();
    //    }
    //});

    //Short Heartbeat
    setInterval(function () {
        if (app.viewModel.appMode() == "dashboard") {
            app.viewModel.updateDash();
        }               
    }, 3000);

    //Long Heartbeat
    setInterval(function () {
        if (app.viewModel.appMode() == "driving") {
            navigator.geolocation.getCurrentPosition(function (position) {
                console.log(position);
            });
        }
    }, 60000);

    //Charts
    google.charts.load('current', { 'packages': ['gauge'] });
    google.charts.setOnLoadCallback(drawChart);

    //console.log(app.viewModel.successRatio());

    function drawChart() {

        //console.log(app.viewModel.successRatio());

        app.viewModel.chartData = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            ['Wins %', app.viewModel.successRatio()],
        ]);

        app.viewModel.chartOptions = {
            width: 150, height: 150,
            redFrom: 0, redTo: 90,
            yellowFrom: 90, yellowTo: 99,
            greenFrom: 100, greenTo: 100,
            minorTicks: 5
        };

        app.viewModel.chart = new google.visualization.Gauge(document.getElementById('chart_div'));

        app.viewModel.chart.draw(app.viewModel.chartData, app.viewModel.chartOptions);


    }
    //End Charts

    if ($.cookie("driver") != null) {
        app.viewModel.driver = JSON.parse($.cookie("driver"));
        app.viewModel.name(app.viewModel.driver.name);
        //app.viewModel.appMode("driving");
        app.viewModel.appMode("driving");
    }         
    //End Determine Mode
    //Dropzones Init
    //app.dropzoneOne = $("div#my-awesome-dropzone").dropzone({ url: "."});
    //app.dropzoneTwo = $("div#my-awesome-dropzone2").dropzone({ url: "." });
    Dropzone.forElement("#my-awesome-dropzone2").options.autoProcessQueue = false;
    Dropzone.forElement("#my-awesome-dropzone2").options.parallelUploads = 1000;
    Dropzone.forElement("#my-awesome-dropzone").options.autoProcessQueue = false;
    Dropzone.forElement("#my-awesome-dropzone").options.parallelUploads = 1000;
    //Dropzone.forElement("#my-awesome-dropzone").on("queuecomplete", function () {
    //    Dropzone.forElement("#my-awesome-dropzone").removeAllFiles(true);
    //});
    //Dropzone.forElement("#my-awesome-dropzone2").on("queuecomplete", function () {
    //    Dropzone.forElement("#my-awesome-dropzone2").removeAllFiles(true);
    //});

    Dropzone.forElement("#my-awesome-dropzone").on("addedfile", function (file) {
        //console.log(file);
        //file.status = "error";
        //var reader = new FileReader();
        //reader.onload = function () {
        //    console.log(reader.result);            

        //}
        //reader.readAsText(file);
        //console.log(Dropzone.forElement("#my-awesome-dropzone"));
    });

    //Dropzone Not INit

    ko.applyBindings(app.viewModel, document.getElementById("mainBody"));
})