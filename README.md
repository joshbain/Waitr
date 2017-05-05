# Waitr Coding Challenge

**Total Development Time:** 57 hours (including all research and development as well as documentation, deployment, etc)

## Overview

This is a client/server implementation of the challenge found here  https://github.com/WaitrInc/coding-challenge "Delivery Recommendation Service".

The swagger docs can be acesses here; http://sample-env.f4qus4bpks.us-west-2.elasticbeanstalk.com:8013/docs/
The sample application can be found here; http://waitrclient.centzonmimixcoa.com/

Its server is based on node.js and hosted by Amazon Web Services.  I chose those technologies largely because while I was passingly familiar with them I had not really previously had the chance before to really dig into them and use them for anything.  It was a fun experience learning their nuances and implementing a small project based on them, as well as swagger with which I had no prior experiance at all.  The other technologies (Google's API, MySQL and the like) were already familiar to me, and I chose them for cost and utility.

The basic logic is based on very simple optimization, there is a “win condition” that being the objective as stated in the spec; all deliveries be complete with the least number possible delivered after their due by time.

Because of this approach there are a couple of eddies of logic that probably wouldn’t be present (or desirable) in an actual implementation – though they would be easily corrected.  Those are;

* A delivery that is already late or is predicted to be late is given a lower priority than a less urgent delivery which can be completed on time (therefore meeting the win condition).  In an actual implementation likely the priority would actually be to deliver an already overdue or predicted to be overdue delivery as quickly as possible rather than prioritizing the abstract win condition over actual customer satisfaction
* All deliveries are recommended to only one driver, the one who if they continue to accept the first recommendation given will be in the optimal location (really optimal drive timeframe) to deliver it with the minimal loss of time.  Likely in an actual implementation drivers would be allowed to make sub-optimal choices and would be offered the chance to perform any delivery in their area rather than only the small sub-set the system deems be appropriate for them.  Among other things this would be important in an actual implementation as if there are more drivers than deliveries (or a similar number with some clustering) the logic as implemented may literally deem a driver should be presented with no choices as every existing delivery would be more efficiently performed by another driver. 

## Structure

The server-side solution was developed using node.js, swagger-codgen and mysql-model and their prerequisites.  The client-side code was developed using the usual suspects, jquery, font-awesome, bootstrap, and knockout as well as dropzone.  The purely objective data (the information on the driver and the deliveries) is stored in a mysql database while all of the information that the server uses to produce it's recommendations is stored locally in memory and regenerated if the service is restarted.

Largely the objective data is stored in a database because structurally if this was part of an actual system that data would likely be referenced from more than one place.  Create statements for the required tables are included in "Create Tables.sql".

## Hosting and Services

The example is presently hosted on Elastic Beanstalk (both client and sever on separate deployments) and the backing mysql database is similarly hosted on Amazon Web Services (RDS).  The domain name is registered with Route 53.  

It depends on the Google Distance Matrix to turn the gps coordinates into drive times in order to make it's recommendations in the most efficient fashion.

## Further Development

Was I to continue development I probably would have finished out a web client that worked from the point of view of a driver, used location services to update their position to the server if they moved appreciably do you could see the recommendations change in real time as they did so (in fact remnants of the corpse of the aborted development of that portion is still visible in the client project).

Additionally one thing that is specifically lacking in this implementation is a check for data being updated on the database back end by another application.  Instead this application assumes that it has proprietary control over the data (i.e. that updates will always be submitted vis it's web interface).  While this works well enough in this isolated environment if it were going on to full development that would have to be accounted for to maintain proper abstraction.

Finally geofencing of some sort so that deliveries in one city were not considered for drivers in another would be critical in a large-scale application as,  among other reasons, the combinations examined by the Google Distance Matrix would rapidly spiral out of control without such a constraint.
