describe('twitter', function() {
    var Twitter = require('../../../../src/server/rpc/procedures/Twitter/Twitter'),
        RPCMock = require('../../../assets/MockRPC'),
        utils = require('../../../assets/utils'),
        twitter = new RPCMock(Twitter);

    utils.verifyRPCInterfaces(twitter, [
        ['recentTweets', ['screenName', 'count']],
        ['followers', ['screenName']],
        ['tweets', ['screenName']],
        ['search', ['keyword', 'count']],
        ['tweetsPerDay', ['screenName']],
        ['favorites', ['screenName', 'count']],
        ['favoritesCount', ['screenName']]
    ]);
});
