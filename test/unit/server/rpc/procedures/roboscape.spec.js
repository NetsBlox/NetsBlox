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
        robots = [];

    // Add and announce a simulated robot
    const makeFakeBot = (mac) => {
        robots[mac] = dgram.createSocket('udp4');

        let message = mac.toString() + new Date().getTime() +  'I';
        robots[mac].send(message, ROBOSCAPE_PORT, '127.0.0.1');
    };

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
        let fakeRobotMAC2 = 0xABCDEF;

        it('Robots list initially empty', () => assert.equal(roboscape.getRobots().length, 0));

        it('Test adding two robots', () => {
            it('Robots list has a robot', (done) => {
                makeFakeBot(fakeRobotMAC);

                // Wait for robot in list
                utils.waitUntil(() => { return roboscape.getRobots().length > 0; }, 2000).catch((err) => {
                    assert.fail("Robot not added to list");
                }).then(() => {
                    assert.equal(roboscape.getRobots().length, 1, 'one robot in list');
                    assert.equal(roboscape.getRobots()[0], new Buffer(fakeRobotMAC.toString()).toString('hex', 0, 6), 'robot has correct name');
                    done();
                });

            }).timeout(2000);

            it('Robots list has second robot', (done) => {
                assert.equal(roboscape.getRobots().length, 1, 'Robot list should still contain previous robot');
                makeFakeBot(fakeRobotMAC2);

                utils.waitUntil(() => { return roboscape.getRobots().length > 1; }, 2000).catch((err) => {
                    assert.fail("Robot not added to list");
                }).then(() => {
                    assert.equal(roboscape.getRobots().length, 2, 'two robots in list');
                    assert.equal(roboscape.getRobots()[1], new Buffer(fakeRobotMAC2.toString()).toString('hex', 0, 6), 'robot has correct name');
                    done();
                });

            }).timeout(2000);


            it('Robots list reset', () => {
                        // Clear for next test
                RoboScape.prototype._robots = {};
                robots = [];
                assert.equal(roboscape.getRobots().length, 0);
            });
        });

        let fakeRobotMACs = [0x111111,0x222222,0x333333,0x444444,0x555555,0x666666,0x777777,0x888888,0x999999,0xBBBBBB,0xCCCCCC,0xDDDDDD,0xEEEEEE];

        it('Robots list with many robots', (done) => {
            
            // Simulate many robots at once
            fakeRobotMACs.forEach((mac) => 
            {
                makeFakeBot(mac);
            });

            utils.waitUntil(() => { return roboscape.getRobots().length > 12; }, 3000).catch((err) => {
                assert.fail("Robots not added to list");
                done();
            }).then(() => {
                let robolist = roboscape.getRobots();
                
                assert.equal(robolist.length, fakeRobotMACs.length, 'List does not contain enough robots');

                // Verify robots in list are correct
                fakeRobotMACs.forEach((mac) => {
                    assert.notEqual(robolist.indexOf(new Buffer(mac.toString()).toString('hex', 0, 6)), -1, `Contains all robot MACs (${mac} is missing)`);
                });                

                done();
            });

        }).timeout(3500);
    });
});
