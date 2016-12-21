// This is the MovieDB game RPC. It wraps the web API of themoviedb.org.

'use strict';

var mdb = require('moviedb')('a9782eaca0e879266fb880b7dcb4cef4'),
    debug = require('debug'),
    request = require('request'),    
    CacheManager = require('cache-manager'),   
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    trace = debug('NetsBlox:RPCManager:MovieDB:trace');


// Retrieving static images
var baseUrl = 'https://image.tmdb.org/t/p/w500';

/**
 * MovieDB - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var MovieDB = function() {};

/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
MovieDB.getPath = function() {
    return '/MovieDB';
};


// Actions
MovieDB.prototype.searchMovie = function(query) {
    debug('called searchMovie with query='+query);
    mdb.searchMovie(query, (err,res) => {
        if(!err) {
            return results.map(e=>e.id);
        }
        else {
            return err;
        }
    });
};
/*
MovieDB.prototype.searchPerson = function(req, rsp) {
    mdb.searchPerson(req.query, (err,res) => {
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
        rsp.status(400).send('Requested field name not specified');        
        return;
    }

    if(!req.query.id) {
        rsp.status(400).send('Movie ID not specified');        
        return;
    }

    req.query.id = +req.query.id;

    mdb.movieInfo(req.query, (err,res) => {
        if(!err) {
            if(res[req.query.field]) {
                // treat genres in a special way
                if(req.query.field == 'genres') {
                    rsp.status(200).send(res[req.query.field].map(g => g.name));
                } else {
                    rsp.status(200).send(''+res[req.query.field]);
                }
            } else {
                rsp.status(400).send('Requested field name does not exist');
            }
        }
        else {
            rsp.status(400).send('');
        }
    });
};


MovieDB.prototype.personInfo = function(req, rsp) {

    if(!req.query.field) {
        rsp.status(400).send('Requested field name not specified');        
        return;
    }

    if(!req.query.id) {
        rsp.status(400).send('Person ID not specified');        
        return;
    }

    req.query.id = +req.query.id;

    mdb.personInfo(req.query, (err,res) => {
        if(!err) {
            if(res[req.query.field]) {
                rsp.status(200).send(res[req.query.field]);
            } else {
                rsp.status(400).send('Requested field name does not exist');
            }
        }
        else {
            rsp.status(400).send('');
        }
    });
};


MovieDB.prototype.movieCredits = function(req, rsp) {

    if(!req.query.id) {
        rsp.status(400).send('Movie ID not specified');        
        return;
    }

    req.query.id = +req.query.id;

    mdb.movieCredits(req.query, (err,res) => {
        if(!err) {
            if(res[req.query.field]) {
                // treat cast in a special way
                if(req.query.field == 'cast') {
                    rsp.status(200).send(res[req.query.field].map(obj => obj.id));
                } else {
                    rsp.status(200).send(''+res[req.query.field]);
                }
            } else {
                rsp.status(400).send('Requested field name does not exist');
            }
        }
        else {
            rsp.status(400).send('');
        }
    });
};

MovieDB.prototype.personImages = function(req, rsp) {

    if(!req.query.id) {
        rsp.status(400).send('Person ID not specified');        
        return;
    }

    req.query.id = +req.query.id;

    mdb.personImages(req.query, (err,res) => {
        if(!err) {
            if(res[req.query.field]) {
                // treat profiles in a special way
                if(req.query.field == 'profiles') {
                    rsp.status(200).send(res[req.query.field].map(obj => obj.file_path));
                } else {
                    rsp.status(200).send(''+res[req.query.field]);
                }
            } else {
                rsp.status(400).send('Requested field name does not exist');
            }
        }
        else {
            rsp.status(400).send('');
        }
    });
};

MovieDB.prototype.personCredits = function(req, rsp) {

    if(!req.query.id) {
        rsp.status(400).send('Person ID not specified');        
        return;
    }

    req.query.id = +req.query.id;

    mdb.personMovieCredits(req.query, (err,res) => {
        if(!err) {
            if(res[req.query.field]) {
                // treat cast in a special way
                if(req.query.field == 'cast') {
                    rsp.status(200).send(res[req.query.field].map(obj => obj.id));
                } else {
                    rsp.status(200).send(''+res[req.query.field]);
                }
            } else {
                rsp.status(400).send('Requested field name does not exist');
            }
        }
        else {
            rsp.status(400).send('');
        }
    });
};

MovieDB.prototype.getImage = function(req, rsp) {
    var url;

    if(!req.query.path) {
        rsp.status(400).send('Path not specified');        
        return;
    }

    url = baseUrl+req.query.path;

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
*/
module.exports = MovieDB;
