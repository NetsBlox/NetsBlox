/**
 * The Twitter Service provides access to real-time and historical stock price data.
 * For more information, check out https://twitter.com.
 *
 * Terms of use: https://twitter.com/en/tos
 * @service
 */
// This will use the Twitter API to allow the client to execute certain Twitter functions within NetsBlox

'use strict';

const logger = require('../utils/logger')('twitter');
const request = require('request');
const baseURL = 'https://api.twitter.com/1.1/';
var KEY = process.env.TWITTER_BEARER_TOKEN;

// make sure key starts with bearer
if ( KEY && !KEY.startsWith('Bearer ')) KEY = 'Bearer ' + KEY;

var options = {
    url: baseURL,
    headers: { 
        'Authorization': KEY,
        'gzip': true
    },
    json: true
};

function rateCheck(response, res) {
    if (response.statusCode == 429) {
        res.send('Rate limit exceeded--wait before trying again');
        return true;
    }
    return false;
}

module.exports = {

    isSupported: () => {
        if(!KEY){
            /* eslint-disable no-console*/
            console.error('TWITTER_BEARER_TOKEN is missing.');
            /* eslint-enable no-console*/
        }
        return KEY;
    },

    // returns a list of a user's recent tweets
    recentTweets: function(screenName, count) {
        var results = [],
            response = this.response;

        // gather parameters
        options.url = baseURL + 'statuses/user_timeline.json?';

        // ensure valid parameters
        if (screenName == '' || screenName == undefined || count == '' || count == undefined || count <= 0) {
            logger.trace('Enter valid parameters...');
            return 'Missing screenName or count';
        }

        options.url = options.url + 'screen_name=' + screenName + '&count=' + count;

        // repeat as many times as necessary
        var getTweets = () => { 
            request(options, (err, res, body) => {
                // check if user has any tweets
                if ( body.length < 1 ) {
                    // we should set an error status and send a null array
                    response.send(results);
                    return;
                }
                if (rateCheck(res, response)) {
                    return;
                }
                for (var i = 0; i < body.length; i++) {
                    results.push('( ' + body[i].retweet_count + ' RTs, ' + body[i].favorite_count + ' Favs) ' + body[i].text);
                }
                count -= body.length;
                if (count > 0) {
                    options.url = baseURL + 'statuses/user_timeline.json?screen_name=' + screenName + '&count=' + count + '&max_id=' + body[body.length-1].id;
                    getTweets();
                } else {
                    return response.json(results);
                }
            });
        };

        // populate array of tweets
        getTweets();

        return null;
    },

    // returns amount of followers a user has
    followers: function(screenName) {
        var response = this.response;

        // gather parameter
        options.url = baseURL + 'users/show.json?';

        // ensure valid parameter
        if (screenName == '' || screenName == undefined) {
            logger.trace('Enter a valid screen name...');
            return 'Missing screenName';
        }

        options.url = options.url + 'screen_name=' + screenName;

        request(options, (err, res, body) => {
            if (rateCheck(res, response)) {
                return;
            }
            return response.json(body.followers_count);
        });

        return null;
    },

    // returns amount of tweets a user has
    tweets: function(screenName) {
        var response = this.response;

        // gather parameter
        options.url = baseURL + 'users/show.json?';

        // ensure valid parameter
        if (screenName == '' || screenName == undefined) {
            logger.trace('Enter a valid screen name...');
            return 'Missing screenName';
        }

        options.url = options.url + 'screen_name=' + screenName;

        request(options, (err, res, body) => {
            if (rateCheck(res, response)) {
                return;
            }
            return response.json(body.statuses_count);
        });
        return null;
    },

    // searches the most recent tweets
    search: function(keyword, count) {
        var response = this.response,
            results = [];

        // gather parameter
        options.url = baseURL + 'search/tweets.json?q=';

        // ensure valid parameters
        if (keyword == '' || keyword == undefined || count == '' || count == undefined || count <= 0) {
            logger.trace('Enter valid parameters...');
            return 'KEYWORD and COUNT required';
        }

        // URL encode
        keyword = encodeURI(keyword);

        options.url = options.url + keyword + '&count=' + count;
        
        // repeat as many times as necessary
        var getTweets = () => {
            request(options, (err, res, body) => {
                if (rateCheck(res, response)) {
                    return;
                }
                for (var i = 0; i < body.statuses.length; i++) {
                    results.push('(' + body.statuses[i].retweet_count + ' RTs, ' + body.statuses[i].favorite_count + ' Favs) @' + body.statuses[i].user.screen_name + ': ' + body.statuses[i].text);
                }
                count -= body.statuses.length;
                if (count > 0) {
                    options.url = baseURL + 'search/tweets.json?q=' + keyword + '&count=' + count + '&max_id=' + body.statuses[body.statuses.length-1].id;
                    getTweets();
                } else {
                    return response.json(results);
                }
            });
        };

        // populate array of tweets
        getTweets();

        return null;
    },

    // returns how many tweets per day the user averages (most recent 200)
    tweetsPerDay: function(screenName) {
        var oneDay = 24*60*60*1000, // hours*minutes*seconds*milliseconds
            dateToday = new Date(),
            response = this.response;

        // gather parameter
        options.url = baseURL + 'statuses/user_timeline.json?';

        // ensure valid parameter
        logger.trace(`getting the average number of daily tweets for ${screenName}`);
        if (screenName == '' || screenName == undefined) {
            logger.trace('Enter valid parameters...');
            return 'Missing screenName';
        }

        options.url = options.url + 'screen_name=' + screenName + '&count=200';

        request(options, (err, res, body) => {
            try {
                if (rateCheck(res, response)) {
                    return;
                }
                var oldestDate = new Date(body[body.length-1].created_at); 
                var diffDays = Math.round(Math.abs((oldestDate.getTime() - dateToday.getTime())/(oneDay)));
                return response.json(body.length / diffDays);
            } catch (err) {
                logger.error(err);
                return response.send('Could not retrieve the average number of daily tweets');
            }
        });
        return null;
    },

    // returns the most recent tweets that a user has favorited
    favorites: function(screenName, count) {
        var response = this.response,
            results = [];

        // gather parameter
        options.url = baseURL + 'favorites/list.json?';

        // ensure valid parameters
        if (screenName == '' || screenName == undefined || count == '' || count == undefined || count <= 0) {
            logger.trace('Enter valid parameters...');
            return 'screenName and count are required';
        }
    
        options.url = options.url + 'screen_name=' + screenName + '&count=' + count;

        // populate array of tweets
        // repeat as many times as necessary
        var getTweets = () => {
            request(options, (err, res, body) => {
                if (rateCheck(res, response)) {
                    return;
                }
                for (var i = 0; i < body.length; i++) {
                    results.push('@' + body[i].user.screen_name + ': ' + body[i].text);
                }
                count -= body.length;
                if (count > 0) {
                    options.url = baseURL + 'favorites/list.json?screen_name=' + screenName + '&count=' + count + '&max_id=' + body[body.length-1].id;
                    getTweets();
                } else {
                    return response.json(results);
                }
            });
        };

        getTweets();

        return null;
    },

    // returns the amount of favorites that a user has
    favoritesCount: function(screenName) {
        var response = this.response;

        // gather parameter
        options.url = baseURL + 'users/show.json?';

        // ensure valid parameter
        if (screenName == '' || screenName == undefined) {
            logger.trace('Enter valid parameters...');
            return 'Missing screenName';
        }

        options.url = options.url + 'screen_name=' + screenName;

        request(options, (err, res, body) => {
            if (rateCheck(res, response)) {
                return;
            }
            return response.json(body.favourites_count);
        });

        return null;
    }

};
