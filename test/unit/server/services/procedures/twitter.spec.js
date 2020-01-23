describe('twitter', function() {
    const utils = require('../../../../assets/utils');
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
