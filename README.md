# BlinkBoard
## Web-based Dashboard Platform

![example](README/example.jpg)

### Introduction
BlinkBoard is a lightweight administration platform for web-based dashboards. Imagine you have an old monitor in spare, perhaps a Raspberry Pi you don't know what to do with - BlinkBoard lets you transform this setup into a slick dashboard. By now, you're probably wondering, what kind of information you want to display on such a dashboard. Well, the architecture allows for anything, really, and I've included a few sample *viewers* (as I call them) to show how they function. And you have to build these yourself. Viewers are simply Angular directives with specific parameters. BlinkBoard simply makes the administration of these settings along with placement on the monitor easy.

### Dependencies
In its current form, BlinkBoard uses Google's [FireBase](https://www.firebase.com/) as its database, but doesn't make use of the realtime-API, so it could be changed to use any sort of database without too much work. The platform runs as a Node.js server, so along with the before mentioned monitor and Raspberry Pi, you do need a server as well. Other than that, you just need the usual NPM and Bower to install and run the platform.

### Installation
Having cloned the repository, cd into the `BlinkBoard` directory and run `npm install`. Then cd into the `public` directory and run `bower install`. Now you need to create a [FireBase](https://www.firebase.com/) account. Having created an *app*, you need to enable email-authentication and create a user. When finished you have the information needed in order to setup the environment variables. Create a file called `.env` in the root 'BlinkBoard' directory and fill it out as follows:
```
FIREBASE_URL=[insert Firebase url (e.g. https://myapp.firebaseio.com/)]
FIREBASE_APPSECRET=[insert Firebase app secret]
PORT=[insert the port you want to use (e.g. 80)]
DEV_USER=[insert your user (e.g. user@mail.com)]
DEV_PASSWORD=[insert your password]
```
The `DEV_USER` and `DEV_PASSWORD` are only there for convenience while testing so you don't have to retype these when you log in. When ready for production, you should remove these and change the login page code to reflect it.

Now you need to add the rules provided in the `rules.json` file to the app in the [FireBase](https://www.firebase.com/) administration system. Just copy paste them and save. Currently, you also need to import the `viewers.json` file into the database. This contains information about the available viewers, which I will explain in the *How to Use* section below. Now you should be able to run the server using the command `gulp`.

There is currently no custom user-management, so just use FireBase' online controlpanel for now.

### How to Use
The structure of BlinkBoard consists of 3 objects:
* `Users` are the people with their own login credentials. A user can manage any number of `units`.
* `Units` are the clients displaying the dashboard. A `unit` is defined by its unique `unitID`, which is set in the browsers `LocalStorage` using the `/setid#` entrypoint. Once a `unit` is added by any `user`, it will forever exists in the database. `Users` do not own `units`, thus multiple `users` can manage the same `unit` at the same time.
* `Viewers` are the modules being displayed on the dashboards and are defined in the `viewerModels` database-object. A `viewer` instance is owned by a `unit`.

![diagram](README/diagram.png)

When running the server, 3 endpoints become available:
* `/setid#` should only be used once, when adding a dashboard. In order for the dashboard hosting device (e.g. raspberry pi) to know what to display, it has to have a unique `unitID`. This ID is stored in the browsers `LocalStorage` and can be set or regenerated at this endpoint (point the raspberry pi's browser to this).
* `/` is where the actual dashboard is displayed. As such, when you for instance open a browser on your dashboard hosting device, just by pointing it to the address of the server, it should display the dashboard.
* `/management#` is where you manage your dashboards. You login using your FireBase credentials and add the units (dashboards) you want to manage. Any change you make here should automatically be reflected on the units. This is what makes BlinkBoard easy.

### How to Add Viewers
As previously mentioned, viewers are simply Angular directives with parameters. The outlines of these parameters are defined in the `viewerModels` database-object, so by adding to this, you can define your own. Look at the sample viewers in `public/viewers/` for inspiration. Please take note that currently you need to refresh the dashboard hosting device after having added a new viewer type, as directives are dependencies of Angular on initilization.