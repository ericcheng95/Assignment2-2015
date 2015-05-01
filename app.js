//dependencies for each module used
var express = require('express');
var passport = require('passport');
var InstagramStrategy = require('passport-instagram').Strategy;
// Facebook element
var FacebookStrategy = require('passport-facebook').Strategy;
var http = require('http');
var path = require('path');
var handlebars = require('express-handlebars');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var dotenv = require('dotenv');
var mongoose = require('mongoose');
var Instagram = require('instagram-node-lib');
var async = require('async');

// Facebook element
var graph = require('fbgraph');

// Twitter element
var twit = require('twit');
var util = require('util');
var TwitterStrategy = require('passport-twitter').Strategy;

var app = express();

//local dependencies
var models = require('./models');

//client id and client secret here, taken from .env
dotenv.load();
var INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
var INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
var INSTAGRAM_CALLBACK_URL = process.env.INSTAGRAM_CALLBACK_URL;
var INSTAGRAM_ACCESS_TOKEN = "";
Instagram.set('client_id', INSTAGRAM_CLIENT_ID);
Instagram.set('client_secret', INSTAGRAM_CLIENT_SECRET);

// Twitter element
var TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
var TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
var TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
var TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;
var twitterOauth = {
    consumer_key: TWITTER_CLIENT_ID,
    consumer_secret: TWITTER_CLIENT_SECRET,
    access_token: TWITTER_ACCESS_TOKEN,
    access_token_secret: TWITTER_ACCESS_SECRET
};

//connect to database
mongoose.connect(process.env.MONGODB_CONNECTION_URL);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log("Database connected succesfully.");
});

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Instagram profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the InstagramStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Instagram
//   profile), and invoke a callback with a user object.
passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: INSTAGRAM_CALLBACK_URL
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        models.User.findOne({
            "ig_id": profile.id
            }, function(err, user) {
                if (err) {
                    return done(err); 
                    }
 
                //didnt find a user
                if (!user) {
                    newUser = new models.User({
                        name: profile.username, 
                        ig_id: profile.id,
                        ig_access_token: accessToken
                        });

                newUser.save(function(err) {
                    if(err) {
                        console.log(err);
                        } else {
                    console.log('user: ' + newUser.name + " created.");
                    }
                return done(null, newUser);
                });
        } else {
        //update user here
         user.ig_access_token = accessToken;
         user.save();
         process.nextTick(function () {
             // To keep the example simple, the user's Instagram profile is returned to
             // represent the logged-in user.  In a typical application, you would want
             // to associate the Instagram account with a user record in your database,
             // and return that user instead.
             return done(null, user);
         });
         }
      });
    }
));

// Twitter element
// Use TwitterStrategy with passport
/*passport.use(new TwitterStrategy({
    consumerKey: process.env.twitter_client_id,
    consumerSecret: process.env.twitter_client_secret,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
}, function (token, tokenSecret, profile, done) {
    // Setting up access token (To ensure)
    accessToken = token;
    accessSecret = tokenSecret;
    twitterOauth.access_token = token;
    twitterOauth.access_token_secret = tokenSecret;
    // Continuing on
    process.nextTick(function () {
        return done(null, profile);
    });
}));*/

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CLIENT_ID,
    consumerSecret: process.env.TWITTER_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
}, function (accessToken, refreshToken, profile, done) {
    // Setting up access token (To ensure)
    twitterOauth.access_token = accessToken;
    twitterOauth.access_token_secret = refreshToken;
      // asynchronous verification, for effect...
      models.User.findOne({
          "tw_id": profile.id
      }, function (err, user) {
          if (err) {
              return done(err);
          }
          //didnt find a user
          if (!user) {
              newUser = new models.User({
                  name: profile.username,
                  tw_id: profile.id,
                  tw_access_token: twitterOauth.accessToken
              });
              newUser.save(function (err) {
                  if (err) {
                      console.log(err);
                  } else {
                      console.log('user: ' + newUser.name + " created.");
                  }
                  return done(null, newUser);
              });
          } else {
              //update user here
              user.tw_access_token = twitterOauth.accessToken;
              user.save();
              process.nextTick(function () {
                  return done(null, user);
              });
          }
      });
  }
));
//-----------------------------------

//Configures the Template engine
app.engine('handlebars', handlebars({defaultLayout: 'layout'}));
app.set('view engine', 'handlebars');
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat',
                  saveUninitialized: true,
                  resave: true}));
app.use(passport.initialize());
app.use(passport.session());

//set environment ports and start application
app.set('port', process.env.PORT || 3000);

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next(); 
  }
  res.redirect('/login');
}

// Twitter element
function ensureAuthenticatedTwitter(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function ensureAuthenticatedInstagram(req, res, next) {
  if (req.isAuthenticated() && !!req.user.ig_id) { 
    return next(); 
  }
  res.redirect('/login');
}

//routes
app.get('/', function(req, res){
  res.render('login');
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/account', ensureAuthenticated, function (req, res) {
    res.render('account', {user: req.user});
});

app.get('/igphotos', ensureAuthenticatedInstagram, function(req, res){
  var query  = models.User.where({ ig_id: req.user.ig_id });
  query.findOne(function (err, user) {
    if (err) return err;
    if (user) {
      // doc may be null if no document matched
      Instagram.users.liked_by_self({
        access_token: user.ig_access_token,
        complete: function(data) {
          console.log(data);
          //Map will iterate through the returned data obj
          var imageArr = data.map(function(item) {
            //create temporary json object
            tempJSON = {};
            tempJSON.url = item.images.low_resolution.url;
            //insert json object into image array
            return tempJSON;
          });
          res.render('photos', {photos: imageArr});
        }
      }); 
    }
  });
});

app.get('/igMediaCounts', ensureAuthenticatedInstagram, function(req, res){
  var query  = models.User.where({ ig_id: req.user.ig_id });
  query.findOne(function (err, user) {
    if (err) return err;
    if (user) {
      Instagram.users.follows({ 
        user_id: user.ig_id,
        access_token: user.ig_access_token,
        complete: function(data) {
          // an array of asynchronous functions
          var asyncTasks = [];
          var mediaCounts = [];

          data.forEach(function(item){
            asyncTasks.push(function(callback){
              // asynchronous function!
              Instagram.users.info({ 
                  user_id: item.id,
                  access_token: user.ig_access_token,
                  complete: function(data) {
                    mediaCounts.push(data);
                    callback();
                  }
                });            
            });
          });
          
          // Now we have an array of functions, each containing an async task
          // Execute all async tasks in the asyncTasks array
          async.parallel(asyncTasks, function(err){
            // All tasks are done now
            if (err) return err;
            return res.json({users: mediaCounts});        
          });
        }
      });   
    }
  });
});

// Twitter element (at work)
app.get('/twFriendCounts', ensureAuthenticatedTwitter, function (req, res) {
    var query = models.User.where({ tw_id: req.user.tw_id });
    query.findOne(function (err, user) {
        if (err) return err;
        if (user) {
            Twitter.users.follows({
                user_id: user.tw_id,
                access_token: user.tw_access_token,
                complete: function (data) {
                    // an array of asynchronous functions
                    var asyncTasks = [];
                    var friendCounts = [];

                    data.forEach(function (item) {
                        asyncTasks.push(function (callback) {
                            // asynchronous function!
                            Twitter.users.info({
                                user_id: item.id,
                                access_token: user.tw_access_token,
                                complete: function (data) {
                                    friendCounts.push(data);
                                    callback();
                                }
                            });
                        });
                    });
                    // Now we have an array of functions, each containing an async task
                    // Execute all async tasks in the asyncTasks array
                    async.parallel(asyncTasks, function (err) {
                        // All tasks are done now
                        if (err) return err;
                        return res.json({ users: friends_count });
                    });
                }
            });
        }
    });
});
// ---------------------------

app.get('/visualization', ensureAuthenticatedInstagram, function (req, res){
  res.render('visualization');
}); 

app.get('/c3visualization', ensureAuthenticatedInstagram, function (req, res){
  res.render('c3visualization');
});

app.get('/visualizationPart2', ensureAuthenticatedInstagram, function (req, res) {
    res.render('visualizationPart2');
});

app.get('/c3visualizationPart2', ensureAuthenticatedInstagram, function (req, res) {
    res.render('c3visualizationPart2');
});

app.get('/auth/instagram',
  passport.authenticate('instagram'),
  function(req, res){
    // The request will be redirected to Instagram for authentication, so this
    // function will not be called.
  });

app.get('/auth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login'}),
  function(req, res) {
    res.redirect('/account');
  });

// Twitter element
//---------------------------------------------------
// Twitter authentication setup for Oauth
// Will set up Twitter Oauth for any user not just one
app.get('/auth/twitter', passport.authenticate('twitter'), function (req, res) {
    //nothing here because callback redirects to /auth/twitter/callback
});

// 'callback' authenticates again and then goes to Twitter
app.get('/auth/twitter/callback',
	passport.authenticate('twitter', { failureRedirect: '/' }),
	function (req, res) {
      console.log(req.user);
	    res.redirect('/twitter');
	});

app.get('/twitter', ensureAuthenticatedTwitter, function (req, res) {
    // Use Twitter's Oauth as previously it's an array set up with the information
    var T = new twit(twitterOauth);
    T.get('/friends/list', function (err, reply) {
        console.log(reply);
        console.log(err); // If there is an error this will return a value
        data = { twitterUser: reply };
        res.render('twitterMain', data);
    });
    /*  var temp = {};
        temp.user = req.user;
        //res.render('account', { instagramAcct: temp });
        res.render('twitterMain', { user: temp });*/
});
//---------------------------------------------------

// Twitter element
app.get('/visualizationTwitter', ensureAuthenticatedTwitter, function (req, res) {
    var T = new twit(twitterOauth);
    T.get('/friends/list', function (err, reply) {
        console.log(err); // If there is an error this will return a value
        data = { twitterData: reply };
        res.render('visualizationTwitter', data);
    });
});

app.get('/c3visualizationTwitter', ensureAuthenticatedTwitter, function (req, res) {
    var T = new twit(twitterOauth);
    T.get('/friends/list', function (err, reply) {
        console.log(err); // If there is an error this will return a value
        data = { twitterData: reply };
        res.render('c3visualizationTwitter', data);
    });
});

app.get('/TwitterTest', ensureAuthenticatedTwitter, function (req, res) {
    var T = new twit(twitterOauth);
    T.get('/friends/list', function (err, reply) {
        console.log(err); // If there is an error this will return a value
        data = { twitterData: reply };
        res.render('twitter', data);
    });
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
