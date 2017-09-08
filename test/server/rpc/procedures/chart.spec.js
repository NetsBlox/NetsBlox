describe('chart', function() {
    var Chart = require('../../../../src/server/rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
        utils = require('../../../assets/utils'),
        assert = require('assert');
    
    utils.verifyRPCInterfaces(chart,[

   ]);

});
