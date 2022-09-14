/**
 * The MovieDB Service provides access to movie data using TMDB (The MovieDB API).
 * For more information, check out https://www.themoviedb.org/
 *
 * Terms of use: https://www.themoviedb.org/documentation/api/terms-of-use
 * @service
 */

'use strict';

const {ninvoke} = require('../../utils');
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
        const results = await ninvoke(client, method, query);
        return results[0];
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
 * Search for a given movie and return movie IDs.
 *
 * @param {String} title Title of movie
 */
MovieDB.searchMovie = async function(title) {
    const res = await this._callApiMethod('searchMovie', { query: title });
    return res.results.map(e => e.id);
};

/**
 * Search for a given actor and return person IDs.
 *
 * @param {String} name Name of person to search for
 */
MovieDB.searchPerson = async function(name) {
    const res = await this._callApiMethod('searchPerson', { query: name });
    return res.results.map(e => e.id);
};

/**
 * Get the image path for a given movie backdrop.
 *
 * @category Movies
 * @param {String} id Movie ID
 * @returns {String} the image path
 */
MovieDB.movieBackdropPath = function(id) { return movieInfo.call(this, id, 'backdrop_path'); };

/**
 * Get the budget for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieBudget = function(id) { return movieInfo.call(this, id, 'budget'); };
/**
 * Get the genres of a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieGenres = function(id) { return movieInfo.call(this, id, 'genres'); };
/**
 * Get the original language of a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieOriginalLanguage = function(id) { return movieInfo.call(this, id, 'original_language'); };
/**
 * Get the original title of a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieOriginalTitle = function(id) { return movieInfo.call(this, id, 'original_title'); };
/**
 * Get an overview for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieOverview = function(id) { return movieInfo.call(this, id, 'overview'); };
/**
 * Get the popularity for a given movie.
 *
 * For more information, check out https://developers.themoviedb.org/3/getting-started/popularity
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.moviePopularity = function(id) { return movieInfo.call(this, id, 'popularity'); };
/**
 * Get the poster path for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.moviePosterPath = function(id) { return movieInfo.call(this, id, 'poster_path'); };
/**
 * Get the production companies for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieProductionCompanies = function(id) { return movieInfo.call(this, id, 'production_companies'); };
/**
 * Get the countries in which a given movie was produced.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieProductionCountries = function(id) { return movieInfo.call(this, id, 'production_countries'); };
/**
 * Get the release data for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieReleaseDate = function(id) { return movieInfo.call(this, id, 'release_date'); };
/**
 * Get the revenue for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieRevenue = function(id) { return movieInfo.call(this, id, 'revenue'); };
/**
 * Get the runtime for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieRuntime = function(id) { return movieInfo.call(this, id, 'runtime'); };
/**
 * Get the spoken languages for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieSpokenLanguages = function(id) { return movieInfo.call(this, id, 'spoken_languages'); };
/**
 * Get the tagline for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieTagline = function(id) { return movieInfo.call(this, id, 'tagline'); };
/**
 * Get the title for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieTitle = function(id) { return movieInfo.call(this, id, 'title'); };
/**
 * Get the average vote for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieVoteAverage = function(id) { return movieInfo.call(this, id, 'vote_average'); };
/**
 * Get the vote count for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieVoteCount = function(id) { return movieInfo.call(this, id, 'vote_count'); };

/**
 * Get the biography for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personBiography = function(id) { return personInfo.call(this, id, 'biography'); };
/**
 * Get the birthday of a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personBirthday = function(id) { return personInfo.call(this, id, 'birthday'); };
/**
 * Get the death date of a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personDeathday = function(id) { return personInfo.call(this, id, 'deathday'); };
/**
 * Get the gender of a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personGender = function(id) { return personInfo.call(this, id, 'gender'); };
/**
 * Get the name of a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personName = function(id) { return personInfo.call(this, id, 'name'); };
/**
 * Get the place of birth for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personPlaceOfBirth = function(id) { return personInfo.call(this, id, 'place_of_birth'); };
/**
 * Get the popularity of a given person.
 *
 * For more information, check out https://developers.themoviedb.org/3/getting-started/popularity
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personPopularity = function(id) { return personInfo.call(this, id, 'popularity'); };
/**
 * Get the profile path for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personProfilePath = function(id) { return personInfo.call(this, id, 'profile_path'); };

/**
 * Get the cast characters for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCastCharacters = function(id) { return movieCredits.call(this, id, 'cast', 'character'); };
/**
 * Get the cast names for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCastNames = function(id) { return movieCredits.call(this, id, 'cast', 'name'); };
/**
 * Get the cast IDs for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCastPersonIDs = function(id) { return movieCredits.call(this, id, 'cast', 'id'); };
/**
 * Get the cast profile paths for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCastProfilePaths = function(id) { return movieCredits.call(this, id, 'cast', 'profile_path'); };
/**
 * Get the crew names for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCrewNames = function(id) { return movieCredits.call(this, id, 'crew', 'name'); };
/**
 * Get the crew jobs for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCrewJobs = function(id) { return movieCredits.call(this, id, 'crew', 'job'); };
/**
 * Get the crew IDs for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCrewPersonIDs = function(id) { return movieCredits.call(this, id, 'crew', 'id'); };
/**
 * Get the crew profile paths for a given movie.
 *
 * @category Movies
 * @param {String} id Movie ID
 */
MovieDB.movieCrewProfilePaths = function(id) { return movieCredits.call(this, id, 'crew', 'profile_path'); };

/**
 * Get the image paths for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personImageFilePaths = function(id) { return personImages.call(this, id, 'profiles', 'file_path'); };
/**
 * Get the image aspect ratios for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personImageAspectRatios = function(id) { return personImages.call(this, id, 'profiles', 'aspect_ratio'); };
/**
 * Get the image heights for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personImageHeights = function(id) { return personImages.call(this, id, 'profiles', 'height'); };
/**
 * Get the image widths for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personImageWidths = function(id) { return personImages.call(this, id, 'profiles', 'width'); };
/**
 * Get the image vote counts for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personImageVoteCounts = function(id) { return personImages.call(this, id, 'profiles', 'vote_count'); };

/**
 * Get the characters played by a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCastCharacters = function(id) { return personCredits.call(this, id, 'cast', 'character'); };
/**
 * Get the movies in which a given person was cast.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCastMovieIDs = function(id) { return personCredits.call(this, id, 'cast', 'id'); };
/**
 * Get the original titles in which a given person was cast.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCastOriginalTitles = function(id) { return personCredits.call(this, id, 'cast', 'original_title'); };
/**
 * Get the cast poster paths for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCastPosterPaths = function(id) { return personCredits.call(this, id, 'cast', 'poster_path'); };
/**
 * Get the cast release dates for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCastReleaseDates = function(id) { return personCredits.call(this, id, 'cast', 'release_date'); };
/**
 * Get the cast titles for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCastTitles = function(id) { return personCredits.call(this, id, 'cast', 'title'); };
/**
 * Get the movie IDs for which a given person was a member of the crew.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCrewMovieIDs = function(id) { return personCredits.call(this, id, 'crew', 'id'); };
/**
 * Get the crew jobs for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCrewJobs = function(id) { return personCredits.call(this, id, 'crew', 'job'); };
/**
 * Get the original titles for which a given person was a member of the crew.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCrewOriginalTitles = function(id) { return personCredits.call(this, id, 'crew', 'original_title'); };
/**
 * Get the poster paths for movies in which a given person was a member of the crew.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCrewPosterPaths = function(id) { return personCredits.call(this, id, 'crew', 'poster_path'); };
/**
 * Get the release dates for movies in which a given person was a member of the crew.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCrewReleaseDates = function(id) { return personCredits.call(this, id, 'crew', 'release_date'); };
/**
 * Get the crew titles for a given person.
 *
 * @category People
 * @param {String} id Person ID
 */
MovieDB.personCrewTitles = function(id) { return personCredits.call(this, id, 'crew', 'title'); };

/**
 * Get an image from a path.
 *
 * @param {String} path location of the image
 * @returns {Image} the requested image
 */
MovieDB.getImage = function(path){
    return this._sendImage({path});
};

module.exports = MovieDB;
