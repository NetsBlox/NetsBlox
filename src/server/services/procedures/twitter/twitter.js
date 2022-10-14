/**
 * The Twitter Service provides access to posts and profile information from Twitter.
 * For more information, check out https://twitter.com.
 *
 * Terms of use: https://twitter.com/en/tos
 * @service
 * @category Media
 * @category Society
 */

'use strict';
const {TwitterKey} = require('../utils/api-key');
const {RPCError} = require('../utils');
const ApiConsumer = require('../utils/api-consumer');
const TwitterConsumer = new ApiConsumer('Twitter', 'https://api.twitter.com/1.1/', {
    cache: {
        ttl: 30
    }
});
ApiConsumer.setRequiredApiKey(TwitterConsumer, TwitterKey);

/**
 * Get tweets from a user
 * @param {String} screenName Name of user
 * @param {Integer} count Number of tweets to retrieve
 * @returns {Array} Tweets from user
 */
TwitterConsumer.recentTweets = function (screenName, count) {
    return this._requestData({
        path: 'statuses/user_timeline.json',
        queryString: `?screen_name=${screenName}&count=${count}`,
        headers: {
            Authorization: this.apiKey.value,
            gzip: 'true'
        },
        cacheKey: {method: 'recentTweets', screenName, count},
    }).then(res => {
        return res.map(tweet => `( ${tweet.retweet_count} RTs, ${tweet.favorite_count} Favs) ${tweet.text}`);
    }).catch(this._handleError.bind(this));
};

/**
 * Get the number of users following someone on Twitter
 * @param {String} screenName Name of user
 * @returns {Integer} Number of followers user has
 */
TwitterConsumer.followers = function (screenName) {
    return this._sendAnswer({
        path: 'users/show.json',
        queryString: `?screen_name=${screenName}`,
        headers: {
            Authorization: this.apiKey.value,
            gzip: 'true'
        },
        cacheKey: {method: 'followers', screenName},
    }, '.followers_count').catch(this._handleError.bind(this));
};

/**
 * Get the number of tweets someone has made on Twitter
 * @param {String} screenName Name of user
 * @returns {Integer} Number of tweets user has
 */
TwitterConsumer.tweets = function (screenName) {
    return this._sendAnswer({
        path: 'users/show.json',
        queryString: `?screen_name=${screenName}`,
        headers: {
            Authorization: this.apiKey.value,
            gzip: 'true'
        },
        cacheKey: {method: 'tweets', screenName},
    }, '.statuses_count').catch(this._handleError.bind(this));
};


//
/**
 * Searches the most recent tweets
 * @param {String} keyword Keyword to search for
 * @param {Integer} count Number of tweets to retrieve
 * @returns {Array} Most recent tweets matching keyword
 */
TwitterConsumer.search = function (keyword, count) {
    return this._requestData({
        path: 'search/tweets.json',
        queryString: `?q=${encodeURI(keyword)}&count=${count}`,
        headers: {
            Authorization: this.apiKey.value,
            gzip: 'true'
        },
        cacheKey: {method: 'search', keyword, count},
    }).then(res => {
        return res.statuses.map(tweet => `( ${tweet.retweet_count} RTs, ${tweet.favorite_count} Favs) @${tweet.user.screen_name}: ${tweet.text}`);
    }).catch(this._handleError.bind(this));
};


/**
 * Get how many tweets per day the user averages (most recent 200)
 * @param {String} screenName Name of user
 * @returns {Number} How many tweets per day the user averages
 */
TwitterConsumer.tweetsPerDay = function (screenName) {
    var oneDay = 24 * 60 * 60 * 1000, // hours*minutes*seconds*milliseconds
        dateToday = new Date();

    return this._requestData({
        path: 'statuses/user_timeline.json',
        queryString: `?screen_name=${screenName}&count=200`,
        headers: {
            Authorization: this.apiKey.value,
            gzip: 'true'
        },
        cacheKey: {method: 'tweetsPerDay', screenName},
    }).then(res => {
        var oldestDate = new Date(res[res.length - 1].created_at);
        var diffDays = Math.round(Math.abs((oldestDate.getTime() - dateToday.getTime()) / (oneDay)));
        return this.response.json(res.length / diffDays);
    }).catch(this._handleError.bind(this));
};

/**
 * Get the most recent tweets that a user has favorited
 * @param {String} screenName Name of user
 * @param {Integer} count Number of tweets to retrieve
 * @returns {Array} Most recent tweets that a user has favorited
 */
TwitterConsumer.favorites = function (screenName, count) {
    return this._requestData({
        path: 'favorites/list.json',
        queryString: `?screen_name=${screenName}&count=${count}`,
        headers: {
            Authorization: this.apiKey.value,
            gzip: 'true'
        },
        cacheKey: {method: 'favorites', screenName, count},
    }).then(res => {
        return res.map(fav => `@${fav.user.screen_name}: ${fav.text}`);
    }).catch(this._handleError.bind(this));
};


/**
 * Get the number of favorites someone has on Twitter
 * @param {String} screenName Name of user
 * @returns {Integer} Number of favorites user has
 */
TwitterConsumer.favoritesCount = function (screenName) {
    return this._sendAnswer({
        path: 'users/show.json',
        queryString: `?screen_name=${screenName}`,
        headers: {
            Authorization: this.apiKey.value,
            gzip: 'true'
        },
        cacheKey: {method: 'favoritesCount', screenName},
    }, '.favourites_count').catch(this._handleError.bind(this));
};

/**
 * Handle an error from a request
 * @param {Object} err Error thrown from _sendAnswer
 */
TwitterConsumer._handleError = function (err) {
    if (!rateCheck(err, this.response)) {
        const errors = err.error?.errors || [];
        throw new RPCError(errors[0]?.message);
    }
};

function rateCheck(response) {
    if (response.statusCode == 429) {
        throw new Error('Rate limit exceeded--wait before trying again');
    }
    return false;
}

module.exports = TwitterConsumer;
