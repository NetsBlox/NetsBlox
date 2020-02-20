/**
 * The MovieDB Service provides access to movie data using TMDB (The MovieDB API).
 * For more information, check out https://www.themoviedb.org/
 *
 * Terms of use: https://www.themoviedb.org/documentation/api/terms-of-use
 * @service
 */

'use strict';

const Q = require('q');
const MovieDBClient = require('moviedb');
const ApiConsumer = require('../utils/api-consumer');

// Retrieving static images
const baseUrl = 'https://image.tmdb.org/t/p/w500';
const MovieDB = new ApiConsumer('MovieDB', baseUrl);
const {TheMovieDBKey, InvalidKeyError} = require('../utils/api-key');
ApiConsumer.setRequiredApiKey(MovieDB, TheMovieDBKey);
MovieDB._callApiMethod = async function(method, query) {
    const client = new MovieDBClient(this.apiKey.value);
    try {
        return await Q.ninvoke(client, method, query);
    } catch (err) {
        if (err.message.includes('Unauthorized')) {
            throw new InvalidKeyError(this.apiKey);
        }
        throw err;
    }
};

var movieInfo = async function(id, field) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: movie ID not specified');
    } else {
        id = +id; // convert it to a number
        const res = await this._callApiMethod('movieInfo', { id: id });
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
    }
};

var personInfo = async function(id, field) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: person ID not specified');
    } else {
        id = +id; // convert it to a number

        const res = await this._callApiMethod('personInfo', { id: id });
        if(res[field]) {
            rsp.status(200).send(''+res[field]);
        } else {
            rsp.status(400).send('Error: requested field name does not exist');
        }
    }
};

var movieCredits = async function(id, field, subfield) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: movie ID not specified');
    } else {
        id = +id; // convert it to a number

        const res = await this._callApiMethod('movieCredits', { id: id });
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
    }
};

var personImages = async function(id, field, subfield) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: person ID not specified');
    } else {
        id = +id; // convert it to a number

        const res = await this._callApiMethod('personImages', { id: id });
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
    }
};

var personCredits = async function(id, field, subfield) {
    var rsp = this.response;

    if(!field) {
        rsp.status(400).send('Error: requested field name not specified');
    } else if(!id) {
        rsp.status(400).send('Error: person ID not specified');
    } else {
        id = +id; // convert it to a number

        const res = await this._callApiMethod('personMovieCredits', { id: id });
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
    }
};

/**
 * Find information about a movie
 * @param {String} title Title of movie
 */
MovieDB.searchMovie = async function(title) {
    const res = this._callApiMethod('searchMovie', { query: title });
    return res.results.map(e => e.id);
};

/**
 * Find information about a person
 * @param {String} name Name of person to search for
 */
MovieDB.searchPerson = async function(name) {
    const res = await this._callApiMethod('searchPerson', { query: name });
    return res.results.map(e => e.id);
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
    return this._sendImage({path});
};

module.exports = MovieDB;
