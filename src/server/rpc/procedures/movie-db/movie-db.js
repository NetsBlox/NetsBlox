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


    module.exports = {

        // This is very important => Otherwise it will try to instantiate this
        isStateless: true,

        /**
         * Return the path to the given RPC
         *
         * @return {String}
         */
        getPath: function() {
            return '/MovieDB';
        },


        searchMovie: function(title) {
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
        },

        searchPerson: function(name) {
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
        },

        movieBackdropPath: function(id) { return movieInfo.call(this, id, 'backdrop_path'); },
        movieBudget: function(id) { return movieInfo.call(this, id, 'budget'); },
        movieGenres: function(id) { return movieInfo.call(this, id, 'genres'); },
        movieOriginalLanguage: function(id) { return movieInfo.call(this, id, 'original_language'); },
        movieOriginalTitle: function(id) { return movieInfo.call(this, id, 'original_title'); },
        movieOverview: function(id) { return movieInfo.call(this, id, 'overview'); },
        moviePopularity: function(id) { return movieInfo.call(this, id, 'popularity'); },
        moviePosterPath: function(id) { return movieInfo.call(this, id, 'poster_path'); },
        movieProductionCompanies: function(id) { return movieInfo.call(this, id, 'production_companies'); },
        movieProductionCountries: function(id) { return movieInfo.call(this, id, 'production_countries'); },
        movieReleaseDate: function(id) { return movieInfo.call(this, id, 'release_date'); },
        movieRevenue: function(id) { return movieInfo.call(this, id, 'revenue'); },
        movieRuntime: function(id) { return movieInfo.call(this, id, 'runtime'); },
        movieSpokenLanguages: function(id) { return movieInfo.call(this, id, 'spoken_languages'); },
        movieTagline: function(id) { return movieInfo.call(this, id, 'tagline'); },
        movieTitle: function(id) { return movieInfo.call(this, id, 'title'); },
        movieVoteAverage: function(id) { return movieInfo.call(this, id, 'vote_average'); },
        movieVoteCount: function(id) { return movieInfo.call(this, id, 'vote_count'); },

        personBiography: function(id) { return personInfo.call(this, id, 'biography'); },
        personBirthday: function(id) { return personInfo.call(this, id, 'birthday'); },
        personDeathday: function(id) { return personInfo.call(this, id, 'deathday'); },
        personGender: function(id) { return personInfo.call(this, id, 'gender'); },
        personName: function(id) { return personInfo.call(this, id, 'name'); },
        personPlaceOfBirth: function(id) { return personInfo.call(this, id, 'place_of_birth'); },
        personPopularity: function(id) { return personInfo.call(this, id, 'popularity'); },
        personProfilePath: function(id) { return personInfo.call(this, id, 'profile_path'); },

        movieCastCharacters: function(id) { return movieCredits.call(this, id, 'cast', 'character'); },
        movieCastNames: function(id) { return movieCredits.call(this, id, 'cast', 'name'); },
        movieCastPersonIDs: function(id) { return movieCredits.call(this, id, 'cast', 'id'); },
        movieCastProfilePaths: function(id) { return movieCredits.call(this, id, 'cast', 'profile_path'); },
        movieCrewNames: function(id) { return movieCredits.call(this, id, 'crew', 'name'); },
        movieCrewJobs: function(id) { return movieCredits.call(this, id, 'crew', 'job'); },
        movieCrewPersonIDs: function(id) { return movieCredits.call(this, id, 'crew', 'id'); },
        movieCrewProfilePaths: function(id) { return movieCredits.call(this, id, 'crew', 'profile_path'); },

        personImageFilePaths: function(id) { return personImages.call(this, id, 'profiles', 'file_path'); },
        personImageAspectRatios: function(id) { return personImages.call(this, id, 'profiles', 'aspect_ratio'); },
        personImageHeights: function(id) { return personImages.call(this, id, 'profiles', 'height'); },
        personImageWidths: function(id) { return personImages.call(this, id, 'profiles', 'width'); },
        personImageVoteCounts: function(id) { return personImages.call(this, id, 'profiles', 'vote_count'); },

        personCastCharacters: function(id) { return personCredits.call(this, id, 'cast', 'character'); },
        personCastMovieIDs: function(id) { return personCredits.call(this, id, 'cast', 'id'); },
        personCastOriginalTitles: function(id) { return personCredits.call(this, id, 'cast', 'original_title'); },
        personCastPosterPaths: function(id) { return personCredits.call(this, id, 'cast', 'poster_path'); },
        personCastReleaseDates: function(id) { return personCredits.call(this, id, 'cast', 'release_date'); },
        personCastTitles: function(id) { return personCredits.call(this, id, 'cast', 'title'); },
        personCrewMovieIDs: function(id) { return personCredits.call(this, id, 'crew', 'id'); },
        personCrewJobs: function(id) { return personCredits.call(this, id, 'crew', 'job'); },
        personCrewOriginalTitles: function(id) { return personCredits.call(this, id, 'crew', 'original_title'); },
        personCrewPosterPaths: function(id) { return personCredits.call(this, id, 'crew', 'poster_path'); },
        personCrewReleaseDates: function(id) { return personCredits.call(this, id, 'crew', 'release_date'); },
        personCrewTitles: function(id) { return personCredits.call(this, id, 'crew', 'title'); },

        getImage: function(path){
            movieDB.response = this.response;
            return movieDB._sendImage({queryString: path});
        }
    };
}
