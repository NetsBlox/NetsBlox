// This is the MovieDB game RPC. It wraps the web API of themoviedb.org.

'use strict';

var R = require('ramda'),
    mdb = require('moviedb')('a9782eaca0e879266fb880b7dcb4cef4'),
    debug = require('debug'),
    request = require('request'),    
    CacheManager = require('cache-manager'),   
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    trace = debug('NetsBlox:RPCManager:MovieDB:trace'),
    info = debug('NetsBlox:RPCManager:MovieDB:info');

/**
 * MovieDB - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var MovieDB = function() {
    this.active = null;
    this.previous = null;
    this.players = [];
};

// Retrieving static images
var baseUrl = 'https://image.tmdb.org/t/p/w500';


/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
MovieDB.getPath = function() {
    return '/MovieDB';
};

/**
 * This function is used to expose the public API for RPC calls
 *
 * @return {Array<String>}
 */
MovieDB.getActions = function() {
    return [
        'searchMovie',  // search movie by title
        'movieInfo', // get information about a movie based on ID
        'getImage' // get an image from a server
    ];
};

// Actions

// search a movie by providing a string query and a page number
// returns a list of movie IDs
MovieDB.prototype.searchMovie = function(req, rsp) {
    mdb.searchMovie(req.query, (err,res) => {
        if(!err) {
            rsp.status(200).send(res.results.map(e=>e.id));
        }
        else {
            rsp.status(400).send(err);
        }
    });
};

MovieDB.prototype.movieInfo = function(req, rsp) {

    if(!req.query.field) {
        rsp.status(400).send("Requested field name not specified");        
        return;
    }

    if(!req.query.id) {
        rsp.status(400).send("Movie ID not specified");        
        return;
    }

    req.query.id = +req.query.id;
    info(req.query);

    mdb.movieInfo(req.query, (err,res) => {
        if(!err) {
            if(res[req.query.field]) {
                rsp.status(200).send(""+res[req.query.field]);
            } else {
                rsp.status(400).send("Requested field name does not exist");
            }
        }
        else {
            rsp.status(400).send("");
        }
    });
};


MovieDB.prototype.getImage = function(req, rsp) {
    var url;

    info("getImage called");


    if(!req.query.path) {
        rsp.status(400).send("Path not specified");        
        info("Path not specified");
        return;
    }

    url = baseUrl+req.query.path;

    info("Getting image from " + url);

    // Check the cache
    cache.wrap(url, function(cacheCallback) {
        // Get the image -> not in cache!
        trace('request params:', req.query);
        trace('url is '+url);
        trace('Requesting new image from tmdb!');
        var response = request.get(url);
        delete response.headers['cache-control'];

        // Gather the data...
        var result = new Buffer(0);
        response.on('data', function(data) {
            result = Buffer.concat([result, data]);
        });
        response.on('end', function() {
            return cacheCallback(null, result);
        });
    }, function(err, imageBuffer) {
        // Send the response to the user
        trace('Sending the response!');
        // Set the headers
        rsp.set('cache-control', 'private, no-store, max-age=0');
        rsp.set('content-type', 'image/jpeg');
        rsp.set('content-length', imageBuffer.length);
        rsp.set('connection', 'close');

        rsp.status(200).send(imageBuffer);
        trace('Sent the response!');
    });
};



module.exports = MovieDB;
