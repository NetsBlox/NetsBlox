describe('thingspeak-iot', function() {
    var ThingSpeak = require('../../../../src/server/rpc/procedures/thingspeak-iot/thingspeak-iot'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        thingspeak = new RPCMock(ThingSpeak);
    
    before(function() {
        thingspeak = new RPCMock(ThingSpeak);
    });
    
    describe('interfaces', function() {
        utils.verifyRPCInterfaces(thingspeak, [
            ['searchPublicChannel', ['tagString']],
            ['channelFeed', ['id', 'numResult']],
            ['channelDetail', ['id']]
        ]);
    });
    
});