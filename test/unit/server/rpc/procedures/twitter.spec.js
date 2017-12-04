describe('twitter', function() {
    const utils = require('../../../../assets/utils');
    var Twitter = utils.reqSrc('rpc/procedures/twitter/twitter'),
        RPCMock = require('../../../../assets/mock-rpc'),
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
