/**
 * The MovieDB Service provides access to movie data using TMDB (The MovieDB API).
 * For more information, check out https://www.themoviedb.org/
 *
 * Terms of use: https://www.themoviedb.org/documentation/api/terms-of-use
 * @service
 */
// This is the MovieDB game RPC. It wraps the web API of themoviedb.org.

'use strict';

const mdb = process.env.TMDB_API_KEY && require('moviedb')(process.env.TMDB_API_KEY);
const ApiConsumer = require('../utils/api-consumer');

// Retrieving static images
const baseUrl = 'https://image.tmdb.org/t/p/w500';
const MovieDB = new ApiConsumer('MovieDB', baseUrl);

var movieInfo = function(id, field) {
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

var personInfo = function(id, field) {
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

var movieCredits = function(id, field, subfield) {
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

var personImages = function(id, field, subfield) {
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

var personCredits = function(id, field, subfield) {
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


MovieDB.serviceName = 'MovieDB';

MovieDB.searchMovie = function(title) {
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

MovieDB.searchPerson = function(name) {
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

MovieDB.movieBackdropPath = function(id) { return movieInfo.call(this, id, 'backdrop_path'); };
MovieDB.movieBudget = function(id) { return movieInfo.call(this, id, 'budget'); };
MovieDB.movieGenres = function(id) { return movieInfo.call(this, id, 'genres'); };
MovieDB.movieOriginalLanguage = function(id) { return movieInfo.call(this, id, 'original_language'); };
MovieDB.movieOriginalTitle = function(id) { return movieInfo.call(this, id, 'original_title'); };
MovieDB.movieOverview = function(id) { return movieInfo.call(this, id, 'overview'); };
MovieDB.moviePopularity = function(id) { return movieInfo.call(this, id, 'popularity'); };
MovieDB.moviePosterPath = function(id) { return movieInfo.call(this, id, 'poster_path'); };
MovieDB.movieProductionCompanies = function(id) { return movieInfo.call(this, id, 'production_companies'); };
MovieDB.movieProductionCountries = function(id) { return movieInfo.call(this, id, 'production_countries'); };
MovieDB.movieReleaseDate = function(id) { return movieInfo.call(this, id, 'release_date'); };
MovieDB.movieRevenue = function(id) { return movieInfo.call(this, id, 'revenue'); };
MovieDB.movieRuntime = function(id) { return movieInfo.call(this, id, 'runtime'); };
MovieDB.movieSpokenLanguages = function(id) { return movieInfo.call(this, id, 'spoken_languages'); };
MovieDB.movieTagline = function(id) { return movieInfo.call(this, id, 'tagline'); };
MovieDB.movieTitle = function(id) { return movieInfo.call(this, id, 'title'); };
MovieDB.movieVoteAverage = function(id) { return movieInfo.call(this, id, 'vote_average'); };
MovieDB.movieVoteCount = function(id) { return movieInfo.call(this, id, 'vote_count'); };

MovieDB.personBiography = function(id) { return personInfo.call(this, id, 'biography'); };
MovieDB.personBirthday = function(id) { return personInfo.call(this, id, 'birthday'); };
MovieDB.personDeathday = function(id) { return personInfo.call(this, id, 'deathday'); };
MovieDB.personGender = function(id) { return personInfo.call(this, id, 'gender'); };
MovieDB.personName = function(id) { return personInfo.call(this, id, 'name'); };
MovieDB.personPlaceOfBirth = function(id) { return personInfo.call(this, id, 'place_of_birth'); };
MovieDB.personPopularity = function(id) { return personInfo.call(this, id, 'popularity'); };
MovieDB.personProfilePath = function(id) { return personInfo.call(this, id, 'profile_path'); };

MovieDB.movieCastCharacters = function(id) { return movieCredits.call(this, id, 'cast', 'character'); };
MovieDB.movieCastNames = function(id) { return movieCredits.call(this, id, 'cast', 'name'); };
MovieDB.movieCastPersonIDs = function(id) { return movieCredits.call(this, id, 'cast', 'id'); };
MovieDB.movieCastProfilePaths = function(id) { return movieCredits.call(this, id, 'cast', 'profile_path'); };
MovieDB.movieCrewNames = function(id) { return movieCredits.call(this, id, 'crew', 'name'); };
MovieDB.movieCrewJobs = function(id) { return movieCredits.call(this, id, 'crew', 'job'); };
MovieDB.movieCrewPersonIDs = function(id) { return movieCredits.call(this, id, 'crew', 'id'); };
MovieDB.movieCrewProfilePaths = function(id) { return movieCredits.call(this, id, 'crew', 'profile_path'); };

MovieDB.personImageFilePaths = function(id) { return personImages.call(this, id, 'profiles', 'file_path'); };
MovieDB.personImageAspectRatios = function(id) { return personImages.call(this, id, 'profiles', 'aspect_ratio'); };
MovieDB.personImageHeights = function(id) { return personImages.call(this, id, 'profiles', 'height'); };
MovieDB.personImageWidths = function(id) { return personImages.call(this, id, 'profiles', 'width'); };
MovieDB.personImageVoteCounts = function(id) { return personImages.call(this, id, 'profiles', 'vote_count'); };

MovieDB.personCastCharacters = function(id) { return personCredits.call(this, id, 'cast', 'character'); };
MovieDB.personCastMovieIDs = function(id) { return personCredits.call(this, id, 'cast', 'id'); };
MovieDB.personCastOriginalTitles = function(id) { return personCredits.call(this, id, 'cast', 'original_title'); };
MovieDB.personCastPosterPaths = function(id) { return personCredits.call(this, id, 'cast', 'poster_path'); };
MovieDB.personCastReleaseDates = function(id) { return personCredits.call(this, id, 'cast', 'release_date'); };
MovieDB.personCastTitles = function(id) { return personCredits.call(this, id, 'cast', 'title'); };
MovieDB.personCrewMovieIDs = function(id) { return personCredits.call(this, id, 'crew', 'id'); };
MovieDB.personCrewJobs = function(id) { return personCredits.call(this, id, 'crew', 'job'); };
MovieDB.personCrewOriginalTitles = function(id) { return personCredits.call(this, id, 'crew', 'original_title'); };
MovieDB.personCrewPosterPaths = function(id) { return personCredits.call(this, id, 'crew', 'poster_path'); };
MovieDB.personCrewReleaseDates = function(id) { return personCredits.call(this, id, 'crew', 'release_date'); };
MovieDB.personCrewTitles = function(id) { return personCredits.call(this, id, 'crew', 'title'); };

MovieDB.getImage = function(path){
    return this._sendImage({queryString: path});
};

MovieDB.isSupported = function() {
    if(!process.env.TMDB_API_KEY){
        /* eslint-disable no-console*/
        console.error('TMDB_API_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!process.env.TMDB_API_KEY;
};

module.exports = MovieDB;
