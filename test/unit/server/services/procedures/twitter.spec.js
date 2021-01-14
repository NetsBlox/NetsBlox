const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Twitter', [
        ['recentTweets', ['screenName', 'count']],
        ['followers', ['screenName']],
        ['tweets', ['screenName']],
        ['search', ['keyword', 'count']],
        ['tweetsPerDay', ['screenName']],
        ['favorites', ['screenName', 'count']],
        ['favoritesCount', ['screenName']]
    ]);
});
