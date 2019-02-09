describe('roboscape', function () {
    const utils = require('../../../../assets/utils'),
        ROBOSCAPE_MODE = process.env.ROBOSCAPE_MODE || 'both',
        ROBOSCAPE_PORT = process.env.ROBOSCAPE_PORT || 1973,
        assert = require('assert'),
        Logger = utils.reqSrc('logger'),
        logger = new Logger('netsblox:test:services:roboscape'),
        dgram = require('dgram'),
        util = require('util');


    var RoboScape = utils.reqSrc('rpc/procedures/roboscape/roboscape'),
        RPCMock = require('../../../../assets/mock-rpc'),
        roboscape = new RPCMock(RoboScape),
        robosock = dgram.createSocket('udp4');

    if (ROBOSCAPE_MODE === 'native' || ROBOSCAPE_MODE === 'both') {
        utils.verifyRPCInterfaces(roboscape, [
            ['isAlive', ['robot']],
            ['setSpeed', ['robot', 'left', 'right']],
            ['setLed', ['robot', 'led', 'command']],
            ['beep', ['robot', 'msec', 'tone']],
            ['infraLight', ['robot', 'msec', 'pwr']],
            ['getRange', ['robot']],
            ['getTicks', ['robot']],
            ['drive', ['robot', 'left', 'right']],
            ['setTotalRate', ['robot', 'rate']],
            ['setClientRate', ['robot', 'rate', 'penalty']],
        ], 'roboscape native');
    }

    if (ROBOSCAPE_MODE === 'security' || ROBOSCAPE_MODE === 'both') {
        utils.verifyRPCInterfaces(roboscape, [
            ['send', ['robot', 'command']],
        ], 'roboscape security');
    }

    describe('Test Features', () => {

        let fakeRobotMAC = 0xDEADDD;

        it('Robots list initially empty', () => assert.equal(roboscape.getRobots().length, 0));

        it('Robots list has a robot', (done) => {
            
            let message = fakeRobotMAC + new Date().getTime() +  'I';

            robosock.send(message, ROBOSCAPE_PORT, '127.0.0.1');
            setTimeout( () =>
            {
                assert.equal(roboscape.getRobots().length, 1, 'one robot in list');
                assert.equal(roboscape.getRobots()[0], new Buffer(message).toString('hex', 0, 6), 'robot has correct name');
                done();
            }, 1000);
        }).timeout(2000);

        it('Robots list not empty', () => assert.equal(roboscape.getRobots().length, 1));
    });
});
