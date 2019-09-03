# Eilis the Facebook-Chatbot Server

----
> This project is mainly developed by Fiscol Wu.
> This uploaded version is mainly for showcasing only, so i've removed the authentication related code to avoid further use.

----
## Project folder structure：
**config**：Config files.
**db**：Firebase CRUD API and Firebase config.
**fb_routes**：Facebook related entrance(webhook.js).
**functional**：Main development area, object-oriented function will be separated into Service and Model folder/files, while others using service.js only.
**node_modules**：Project related NPM packages.
**public**：Frontend related jquery library and part of testing page's code
**routes**：Controller, separated into functional.js(API) and view.js(Pages) based on use cases.
**tool**：Common used tool functions.
**views**：Webpages.
**xx_functional**：Previous version/None using codes.
**app.js**：App entrance, set up with port 5000.
**package.json**：NPM packages and version.

----
## API Development Steps：
1. Go to routes/functional.js, set up the new API URL path in the related functional area.
2. Go to functional folder, add a new functional sub folder with Service and Model folder/files.
3. Check input parameters in the Service.js and add comments about the function.
4. Go to Model.js, implement private methods.
5. If there's any Firebase related call, include functions from db/firebase_db.js.
6. Handle 3rd party and Database related sync calls: Use then, catch and promise ways to implement the dataflow.

We use npm tools like [Request-Promise](https://github.com/request/request-promise)、[Request](https://github.com/request/request)、[Q](https://github.com/kriskowal/q)、[Step](https://github.com/creationix/step) to help with sync calls:

We use the npm [FB](https://github.com/node-facebook/facebook-node-sdk) to call Facebook Graph API and deal with Facebook login authentication.

[Node-Schedule](https://github.com/node-schedule/node-schedule) is the npm tool we use, to do the scheduled setting with records in our Firebase Database.

----
## API Documents：
[Our Backend developed API Document Link](https://paper.dropbox.com/doc/EILISSERVER-SIDE-API-FdKysdZ2ZVUwJgb0G0AGq)