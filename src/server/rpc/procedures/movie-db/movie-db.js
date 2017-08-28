// This is the MovieDB game RPC. It wraps the web API of themoviedb.org.

'use strict';

if(!process.env.TMDB_API_KEY) {
    console.log('Warning: environment variable TMDB_API_KEY not defined, MovieDB RPC will not work.');
} else {

    var mdb = require('moviedb')(process.env['TMDB_API_KEY']),
        ApiConsumer = require('../utils/api-consumer');

    // Retrieving static images
    var baseUrl = 'https://image.tmdb.org/t/p/w500';
    let movieDB = new ApiConsumer('MovieDB', baseUrl);

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


    movieDB.serviceName = 'MovieDB';

    movieDB.searchMovie = function(title) {
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

    movieDB.searchPerson = function(name) {
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

    movieDB.movieBackdropPath = function(id) { return movieInfo.call(this, id, 'backdrop_path'); };
    movieDB.movieBudget = function(id) { return movieInfo.call(this, id, 'budget'); };
    movieDB.movieGenres = function(id) { return movieInfo.call(this, id, 'genres'); };
    movieDB.movieOriginalLanguage = function(id) { return movieInfo.call(this, id, 'original_language'); };
    movieDB.movieOriginalTitle = function(id) { return movieInfo.call(this, id, 'original_title'); };
    movieDB.movieOverview = function(id) { return movieInfo.call(this, id, 'overview'); };
    movieDB.moviePopularity = function(id) { return movieInfo.call(this, id, 'popularity'); };
    movieDB.moviePosterPath = function(id) { return movieInfo.call(this, id, 'poster_path'); };
    movieDB.movieProductionCompanies = function(id) { return movieInfo.call(this, id, 'production_companies'); };
    movieDB.movieProductionCountries = function(id) { return movieInfo.call(this, id, 'production_countries'); };
    movieDB.movieReleaseDate = function(id) { return movieInfo.call(this, id, 'release_date'); };
    movieDB.movieRevenue = function(id) { return movieInfo.call(this, id, 'revenue'); };
    movieDB.movieRuntime = function(id) { return movieInfo.call(this, id, 'runtime'); };
    movieDB.movieSpokenLanguages = function(id) { return movieInfo.call(this, id, 'spoken_languages'); };
    movieDB.movieTagline = function(id) { return movieInfo.call(this, id, 'tagline'); };
    movieDB.movieTitle = function(id) { return movieInfo.call(this, id, 'title'); };
    movieDB.movieVoteAverage = function(id) { return movieInfo.call(this, id, 'vote_average'); };
    movieDB.movieVoteCount = function(id) { return movieInfo.call(this, id, 'vote_count'); };

    movieDB.personBiography = function(id) { return personInfo.call(this, id, 'biography'); };
    movieDB.personBirthday = function(id) { return personInfo.call(this, id, 'birthday'); };
    movieDB.personDeathday = function(id) { return personInfo.call(this, id, 'deathday'); };
    movieDB.personGender = function(id) { return personInfo.call(this, id, 'gender'); };
    movieDB.personName = function(id) { return personInfo.call(this, id, 'name'); };
    movieDB.personPlaceOfBirth = function(id) { return personInfo.call(this, id, 'place_of_birth'); };
    movieDB.personPopularity = function(id) { return personInfo.call(this, id, 'popularity'); };
    movieDB.personProfilePath = function(id) { return personInfo.call(this, id, 'profile_path'); };

    movieDB.movieCastCharacters = function(id) { return movieCredits.call(this, id, 'cast', 'character'); };
    movieDB.movieCastNames = function(id) { return movieCredits.call(this, id, 'cast', 'name'); };
    movieDB.movieCastPersonIDs = function(id) { return movieCredits.call(this, id, 'cast', 'id'); };
    movieDB.movieCastProfilePaths = function(id) { return movieCredits.call(this, id, 'cast', 'profile_path'); };
    movieDB.movieCrewNames = function(id) { return movieCredits.call(this, id, 'crew', 'name'); };
    movieDB.movieCrewJobs = function(id) { return movieCredits.call(this, id, 'crew', 'job'); };
    movieDB.movieCrewPersonIDs = function(id) { return movieCredits.call(this, id, 'crew', 'id'); };
    movieDB.movieCrewProfilePaths = function(id) { return movieCredits.call(this, id, 'crew', 'profile_path'); };

    movieDB.personImageFilePaths = function(id) { return personImages.call(this, id, 'profiles', 'file_path'); };
    movieDB.personImageAspectRatios = function(id) { return personImages.call(this, id, 'profiles', 'aspect_ratio'); };
    movieDB.personImageHeights = function(id) { return personImages.call(this, id, 'profiles', 'height'); };
    movieDB.personImageWidths = function(id) { return personImages.call(this, id, 'profiles', 'width'); };
    movieDB.personImageVoteCounts = function(id) { return personImages.call(this, id, 'profiles', 'vote_count'); };

    movieDB.personCastCharacters = function(id) { return personCredits.call(this, id, 'cast', 'character'); };
    movieDB.personCastMovieIDs = function(id) { return personCredits.call(this, id, 'cast', 'id'); };
    movieDB.personCastOriginalTitles = function(id) { return personCredits.call(this, id, 'cast', 'original_title'); };
    movieDB.personCastPosterPaths = function(id) { return personCredits.call(this, id, 'cast', 'poster_path'); };
    movieDB.personCastReleaseDates = function(id) { return personCredits.call(this, id, 'cast', 'release_date'); };
    movieDB.personCastTitles = function(id) { return personCredits.call(this, id, 'cast', 'title'); };
    movieDB.personCrewMovieIDs = function(id) { return personCredits.call(this, id, 'crew', 'id'); };
    movieDB.personCrewJobs = function(id) { return personCredits.call(this, id, 'crew', 'job'); };
    movieDB.personCrewOriginalTitles = function(id) { return personCredits.call(this, id, 'crew', 'original_title'); };
    movieDB.personCrewPosterPaths = function(id) { return personCredits.call(this, id, 'crew', 'poster_path'); };
    movieDB.personCrewReleaseDates = function(id) { return personCredits.call(this, id, 'crew', 'release_date'); };
    movieDB.personCrewTitles = function(id) { return personCredits.call(this, id, 'crew', 'title'); };

    movieDB.getImage = function(path){
        return this._sendImage({queryString: path});
    };

    module.exports = movieDB;
}
