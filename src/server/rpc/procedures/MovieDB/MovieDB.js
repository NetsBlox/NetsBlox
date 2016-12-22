// This is the MovieDB game RPC. It wraps the web API of themoviedb.org.

'use strict';

var mdb = require('moviedb')(process.env['TMDB_API_KEY']),
    debug = require('debug'),
    request = require('request'),    
    CacheManager = require('cache-manager'),   
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    info = debug('NetsBlox:RPCManager:NPlayer:info'),
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


MovieDB.prototype.searchMovie = function(title) {
    var rsp = this.response;

    if(!title) {
        rsp.status(400).send('Error: title is not defined');        
    } else {
        mdb.searchMovie({ query: title }, (err,res) => {
            if(!err) {
                rsp.send(res.results.map(e=>e.id));
            } else {
                rsp.send(`${err}`);
            }
        });
    }
    return null;
};

MovieDB.prototype.searchPerson = function(name) {
    var rsp = this.response;

    if(!name) {
        rsp.status(400).send('Error: name is not defined');        
    } else {
        mdb.searchPerson({ query: name }, (err,res) => {
            if(!err) {
                rsp.status(200).send(res.results.map(e=>e.id));
            } else {
                rsp.status(400).send(`${err}`);
            }
        });
    }
    // explicitly state that we're async
    return null;
};


MovieDB.prototype.movieTitle = function(id) { return this.movieInfo(id, 'title'); };
MovieDB.prototype.movieBackdropPath = function(id) { return this.movieInfo(id, 'backdrop_path'); };
MovieDB.prototype.movieBudget = function(id) { return this.movieInfo(id, 'budget'); };
MovieDB.prototype.movieGenres = function(id) { return this.movieInfo(id, 'genres'); };
MovieDB.prototype.movieOriginalLanguage = function(id) { return this.movieInfo(id, 'original_language'); };
MovieDB.prototype.movieOriginalTitle = function(id) { return this.movieInfo(id, 'original_title'); };
MovieDB.prototype.movieOverview = function(id) { return this.movieInfo(id, 'overview'); };
MovieDB.prototype.moviePopularity = function(id) { return this.movieInfo(id, 'popularity'); };
MovieDB.prototype.moviePosterPath = function(id) { return this.movieInfo(id, 'poster_path'); };
MovieDB.prototype.movieProductionCompanies = function(id) { return this.movieInfo(id, 'production_companies'); };
MovieDB.prototype.movieProductionCountries = function(id) { return this.movieInfo(id, 'production_countries'); };
MovieDB.prototype.movieReleaseDate = function(id) { return this.movieInfo(id, 'release_date'); };
MovieDB.prototype.movieRevenue = function(id) { return this.movieInfo(id, 'revenue'); };
MovieDB.prototype.movieRuntime = function(id) { return this.movieInfo(id, 'runtime'); };
MovieDB.prototype.movieSpokenLanguages = function(id) { return this.movieInfo(id, 'spoken_languages'); };
MovieDB.prototype.movieTagline = function(id) { return this.movieInfo(id, 'tagline'); };
MovieDB.prototype.movieTitle = function(id) { return this.movieInfo(id, 'title'); };
MovieDB.prototype.movieVoteAverage = function(id) { return this.movieInfo(id, 'vote_average'); };
MovieDB.prototype.movieVoteCount = function(id) { return this.movieInfo(id, 'vote_count'); };

MovieDB.prototype.movieInfo = function(id, field) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: movie ID not specified');
    } else {
        id = +id; // convert it to a number
        mdb.movieInfo({ id: id }, (err,res) => {
            if(!err) {
                if(res[field]) {
                    // treat list of objects in a special way
                    if(field == 'genres'
                        || field == 'production_companies'
                        || field == 'production_countries'
                        || field == 'spoken_languages' ) { 
                        rsp.status(200).send(res[field].map(g => g.name));
                    } else {
                        rsp.status(200).send(''+res[field]);
                    }
                } else {
                    rsp.status(400).send('Error: requested field name does not exist');
                }
            } else {
                rsp.status(400).send(`${err}`);
            }
        });
    }
    // explicitly state that we're async
    return null;
};


MovieDB.prototype.personBiography = function(id) { return this.personInfo(id, 'biography'); };
MovieDB.prototype.personBirthday = function(id) { return this.personInfo(id, 'birthday'); };
MovieDB.prototype.personDeathday = function(id) { return this.personInfo(id, 'deathday'); };
MovieDB.prototype.personGender = function(id) { return this.personInfo(id, 'gender'); };
MovieDB.prototype.personName = function(id) { return this.personInfo(id, 'name'); };
MovieDB.prototype.personPlaceOfBirth = function(id) { return this.personInfo(id, 'place_of_birth'); };
MovieDB.prototype.personPopularity = function(id) { return this.personInfo(id, 'popularity'); };
MovieDB.prototype.personProfilePath = function(id) { return this.personInfo(id, 'profile_path'); };

MovieDB.prototype.personInfo = function(id, field) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: person ID not specified');
    } else {
        id = +id; // convert it to a number

        mdb.personInfo({ id: id }, (err,res) => {
            if(!err) {
                if(res[field]) {
                    rsp.status(200).send(''+res[field]);
                } else {
                    rsp.status(400).send('Error: requested field name does not exist');
                }
            } else {
                rsp.status(400).send(`${err}`);
            }
        });
    }
    // explicitly state that we're async
    return null;
};

MovieDB.prototype.movieCastCharacters = function(id) { return this.movieCredits(id, 'cast', 'character'); };
MovieDB.prototype.movieCastNames = function(id) { return this.movieCredits(id, 'cast', 'name'); };
MovieDB.prototype.movieCastPersonIDs = function(id) { return this.movieCredits(id, 'cast', 'id'); };
MovieDB.prototype.movieCastProfilePaths = function(id) { return this.movieCredits(id, 'cast', 'profile_path'); };
MovieDB.prototype.movieCrewNames = function(id) { return this.movieCredits(id, 'crew', 'name'); };
MovieDB.prototype.movieCrewJobs = function(id) { return this.movieCredits(id, 'crew', 'job'); };
MovieDB.prototype.movieCrewPersonIDs = function(id) { return this.movieCredits(id, 'crew', 'id'); };
MovieDB.prototype.movieCrewProfilePaths = function(id) { return this.movieCredits(id, 'crew', 'profile_path'); };

MovieDB.prototype.movieCredits = function(id, field, subfield) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: movie ID not specified');
    } else {
        id = +id; // convert it to a number

        mdb.movieCredits({ id: id }, (err,res) => {
            if(!err) {
                if(res[field]) {
                    // treat cast and crew in a special way
                    if(field == 'cast' || field == 'crew') {
                        if(!subfield || subfield == 'id') {
                            rsp.status(200).send(res[field].map(obj => obj.id));
                        } else {
                            if(res[field].length == 0) {
                                rsp.status(200).send([]);
                            } else if(!res[field][0][subfield]) {
                                rsp.status(400).send('Error: requested subfield name does not exist');
                            } else {
                                rsp.status(200).send(res[field].map(obj => obj[subfield]));
                            }
                        }
                    } else {
                        rsp.status(200).send(''+res[field]);
                    }
                } else {
                    rsp.status(400).send('Error: requested field name does not exist');
                }
            } else {
                rsp.status(400).send(`${err}`);
            }
        });
    }
    // explicitly state that we're async
    return null;
};

MovieDB.prototype.personImageFilePaths = function(id) { return this.personImages(id, 'profiles', 'file_path'); };
MovieDB.prototype.personImageAspectRatios = function(id) { return this.personImages(id, 'profiles', 'aspect_ratio'); };
MovieDB.prototype.personImageHeights = function(id) { return this.personImages(id, 'profiles', 'height'); };
MovieDB.prototype.personImageWidths = function(id) { return this.personImages(id, 'profiles', 'width'); };
MovieDB.prototype.personImageVoteCounts = function(id) { return this.personImages(id, 'profiles', 'vote_count'); };

MovieDB.prototype.personImages = function(id, field, subfield) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: person ID not specified');
    } else {
        id = +id; // convert it to a number

        mdb.personImages({ id: id }, (err,res) => {
            if(!err) {
                if(res[field]) {
                    // treat profiles in a special way
                    if(field == 'profiles') {
                        if(!subfield || subfield == 'file_path') {
                            rsp.status(200).send(res[field].map(obj => obj.file_path));
                        } else {
                            if(res[field].length == 0) {
                                rsp.status(200).send([]);
                            } else if(!res[field][0][subfield]) {
                                rsp.status(400).send('Error: requested subfield name does not exist');
                            } else {
                                rsp.status(200).send(res[field].map(obj => obj[subfield]));
                            }
                        }
                    } else {
                        rsp.status(200).send(''+res[field]);
                    }
                } else {
                    rsp.status(400).send('Error: requested field name does not exist');
                }
            } else {
                rsp.status(400).send(`${err}`);
            }
        });
    }
    // explicitly state that we're async
    return null;
};


MovieDB.prototype.personCastCharacters = function(id) { return this.personCredits(id, 'cast', 'character'); };
MovieDB.prototype.personCastMovieIDs = function(id) { return this.personCredits(id, 'cast', 'id'); };
MovieDB.prototype.personCastOriginalTitles = function(id) { return this.personCredits(id, 'cast', 'original_title'); };
MovieDB.prototype.personCastPosterPaths = function(id) { return this.personCredits(id, 'cast', 'poster_path'); };
MovieDB.prototype.personCastReleaseDates = function(id) { return this.personCredits(id, 'cast', 'release_date'); };
MovieDB.prototype.personCastTitles = function(id) { return this.personCredits(id, 'cast', 'title'); };
MovieDB.prototype.personCrewMovieIDs = function(id) { return this.personCredits(id, 'crew', 'id'); };
MovieDB.prototype.personCrewJobs = function(id) { return this.personCredits(id, 'crew', 'job'); };
MovieDB.prototype.personCrewOriginalTitles = function(id) { return this.personCredits(id, 'crew', 'original_title'); };
MovieDB.prototype.personCrewPosterPaths = function(id) { return this.personCredits(id, 'crew', 'poster_path'); };
MovieDB.prototype.personCrewReleaseDates = function(id) { return this.personCredits(id, 'crew', 'release_date'); };
MovieDB.prototype.personCrewTitles = function(id) { return this.personCredits(id, 'crew', 'title'); };

MovieDB.prototype.personCredits = function(id, field, subfield) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: person ID not specified');
    } else {
        id = +id; // convert it to a number

        mdb.personMovieCredits({ id: id }, (err,res) => {
            if(!err) {
                if(res[field]) {
                    // treat cast and crew in a special way
                    if(field == 'cast' || field == 'crew') {
                        if(!subfield || subfield == 'id') {
                            rsp.status(200).send(res[field].map(obj => obj.id));
                        } else {
                            if(res[field].length == 0) {
                                rsp.status(200).send([]);
                            } else if(!res[field][0][subfield]) {
                                rsp.status(400).send('Error: requested subfield name does not exist');
                            } else {
                                rsp.status(200).send(res[field].map(obj => obj[subfield]));
                            }
                        }
                    } else {
                        rsp.status(200).send(''+res[field]);
                    }
                } else {
                    rsp.status(400).send('Error: requested field name does not exist');
                }
            } else {
                rsp.status(400).send(`${err}`);
            }
        });
    }
    // explicitly state that we're async
    return null;
};

MovieDB.prototype.getImage = function(path) {
    var rsp = this.response;
    var url;


    if(!path) {
        rsp.status(400).send('Error: path not specified');        
    } else {
        url = baseUrl+path;

        info(`Getting image from URL ${url}`);

        // Check the cache
        cache.wrap(url, function(cacheCallback) {
            // Get the image -> not in cache!
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
            info('Sending the response!');
            // Set the headers
            rsp.set('cache-control', 'private, no-store, max-age=0');
            rsp.set('content-type', 'image/jpeg');
            rsp.set('content-length', imageBuffer.length);
            rsp.set('connection', 'close');

            rsp.status(200).send(imageBuffer);
            info('Sent the response!');
        });
    }

    // explicitly state that we're async
    return null;
};

module.exports = MovieDB;
