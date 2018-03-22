describe('Eclipse 2017', function() {
    const utils = require('../../../../assets/utils');
    const Eclipse = utils.reqSrc('rpc/procedures/eclipse-2017/eclipse-2017'),
        { cronString } = utils.reqSrc('rpc/procedures/eclipse-2017/utils'),
        assert = require('assert'),
        RPCMock = require('../../../../assets/mock-rpc'),
        rpcStorage = utils.reqSrc('rpc/storage'),
        eclipsePath = utils.reqSrc('../../utils/rpc/eclipse-2017/eclipsePath'),
        eclipse = new RPCMock(Eclipse);

    utils.verifyRPCInterfaces(eclipse, [
        ['stations', []],
        ['stationsInfo', []],
        ['eclipsePath', []],
        ['stationInfo', ['stationId']],
        ['temperature', ['stationId']],
        ['temperatureHistory', ['stationId', 'limit']],
        ['condition', ['stationId']],
        ['conditionHistory', ['stationId', 'limit']],
        ['pastTemperature', ['stationId', 'time']],
        ['pastCondition', ['stationId', 'time']],
        ['temperatureHistoryRange', ['stationId', 'startTime', 'endTime']],
        ['conditionHistoryRange', ['stationId', 'startTime', 'endTime']],
    ]);

    describe('eclipsePath', function() {
        it('should have more than 100 points', function() {
            assert(eclipsePath.center().length > 100);
        });

        it('should have time as third item', function() {
            assert(eclipsePath.center()[0][2] = '17:16');
        });

        it('should be able to work with clock strings', function(){
            const start = '3:48';
            const end = '4:10:0';
            let seconds = eclipsePath.clockToSeconds(start)+ 22*60;
            assert.equal(eclipsePath.secondsToClock(seconds), end);
        });

        it('should calculate correct midpoints', function(){

            const basePoints = [[42.11833333, -103.11666667, 10000], [41.875, -102.115, 11000]];
            let interpolated = eclipsePath.addMidPoints(basePoints);
            // do this without changing basePoints
            basePoints.splice(1,0,[41.99775513804161, -102.61487583112805, 10500]);
            assert.deepEqual(interpolated, basePoints);
        });

    });


    describe('eclipse utils', function() {
        let delay = 10;
        it('cronString should convert 300 secs correctly', function() {
            assert.equal(cronString(300, delay), `10 */5 * * * *`);
        });

        it('cronString should convert 30 secs correctly', function() {
            assert.equal(cronString(30, delay), `40 * * * * *`);
        });

    });

    describe('database', function(){

        const baseSeconds = new Date('2017-08-23T11:00:30.000Z').getTime();
        // returns a date relative to a predefined base
        function rDate(delta){
            let mSeconds = baseSeconds + (delta * 1000);
            return new Date(mSeconds);
        }

        const sampleUpdates = [
            {
                id: 0,
                pws: 'si',
                requestTime: rDate(150),
                readAt: rDate(115),
                temp: 98
            },
            {
                id: 1,
                pws: 'si',
                requestTime: rDate(160),
                readAt: rDate(115),
                temp: 98
            },
            {
                id: 2,
                pws: 'si',
                requestTime: rDate(140),
                readAt: rDate(110),
                temp: 98
            },
            {
                id: 3,
                pws: 'si',
                requestTime: rDate(130),
                readAt: rDate(95),
                temp: 98
            },
            {
                id: 4,
                pws: 'si',
                requestTime: rDate(120),
                readAt: rDate(105),
                temp: 98
            },
            {
                id: 5,
                pws: 'asdf',
                requestTime: rDate(110),
                readAt: rDate(100),
                temp: 98
            },
            {
                id: 6,
                pws: 'si',
                requestTime: rDate(110),
                readAt: rDate(100),
                temp: 98
            }
        ];

        let readingsCol;
        let getReadingsCol = () => {
            if (!readingsCol) {
                readingsCol = rpcStorage.create('wu:readings').collection;
            }
            return readingsCol;
        };

        before(function(){
            return utils.connect()
                .then(getReadingsCol)
                .then(() => getReadingsCol().insertMany(sampleUpdates));
        });

        it('_stationReading should get the latest update', function(){
            return Eclipse._stationReading('si')
                .then(reading => assert.equal(reading.id, 1));
        });

        it('_stationReading should get the proper update from history', function(){
            return Eclipse._stationReading('si', rDate(106).toISOString())
                .then(reading => assert.equal(reading.id, 4));
        });

        it('_stationReading should get the proper update from history 2', function(){
            return Eclipse._stationReading('si', rDate(110).toISOString())
                .then(reading => assert.equal(reading.id, 2));
        });

        it('_stationReadings should handle only startTime', function(){
            return Eclipse._stationReadings('si',rDate(105).toISOString())
                .then(readings => assert.deepEqual(readings.map(r=>r.id),[1,0,2,4]));
        });

        it('_stationReadings should handle only endTime', function(){
            return Eclipse._stationReadings('si',null, rDate(106).toISOString())
                .then(readings => assert.deepEqual(readings.map(r=>r.id),[4,6,3]));
        });

        it('_stationReadings should handle a range', function(){
            return Eclipse._stationReadings('si', rDate(109).toISOString(), rDate(130).toISOString())
                .then(readings => assert.deepEqual(readings.map(r=>r.id),[1,0,2]));
        });

        after(function(){
            getReadingsCol().drop();
        });

    });

    // describe('station utils', function() {
        //     it('should export selected stations', function() {
            //         assert(stationUtils.selected);
            //     });

            //     it.only('.selected should return station ids as an array', function(done) {
                //         stationUtils.selected().then(stations => {
                    //             assert(Array.isArray(stations));
                    //             assert(stations.length > 100);
                    //             done();
                    //         })
                    //     });
                    // });

});
