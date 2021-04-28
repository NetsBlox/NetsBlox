const amazonRouter = require('express').Router();
const express = require('express');
const AmazonStrategy = require('passport-amazon').Strategy;
const passport = require('passport');


passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new AmazonStrategy({
        clientID: AMAZON_CLIENT_ID,
        clientSecret: AMAZON_CLIENT_SECRET,
        callbackURL: "http://127.0.0.1:3000/auth/amazon/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {

            // To keep the example simple, the user's Amazon profile is returned to
            // represent the logged-in user.  In a typical application, you would want
            // to associate the Amazon account with a user record in your database,
            // and return that user instead.
            return done(null, profile);
        });
    }
));

amazonRouter.use(passport.initialize());
amazonRouter.use(passport.session());

amazonRouter.get('/', function(req, res){
    res.render('index', { user: req.user });
});

amazonRouter.get('/account', ensureAuthenticated, function(req, res){
    res.render('account', { user: req.user });
});

amazonRouter.get('/login', function(req, res){
    res.render('login', { user: req.user });
});

// GET /auth/amazon
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Amazon authentication will involve
//   redirecting the user to amazon.com.  After authorization, Amazon
//   will redirect the user back to this application at /auth/amazon/callback
amazonRouter.get('/auth/amazon',
    passport.authenticate('amazon', { scope: ['profile', 'postal_code'] }),
    function(req, res){
        // The request will be redirected to Amazon for authentication, so this
        // function will not be called.
    });

// GET /auth/amazon/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
amazonRouter.get('/auth/amazon/callback',
    passport.authenticate('amazon', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/');
    });

amazonRouter.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login');
}

