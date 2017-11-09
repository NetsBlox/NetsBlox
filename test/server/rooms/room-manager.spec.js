describe('room-manager', () => {
    const utils = require('../../assets/utils');
    const assert = require('assert');
    const Rooms = utils.reqSrc('rooms/room-manager');
    const ActiveRoom = utils.reqSrc('rooms/active-room');

    describe('getRoom', () => {
        before(done => {
            utils.reset()
                .then(() => Rooms.init(utils.logger))
                .nodeify(done);
        });

        it('should return a room', function(done) {
            Rooms.getRoom(null, 'brian', 'PublicProject')
                .then(room => assert(room instanceof ActiveRoom))
                .then(() => done());
        });

        it('should return a room with the correct project', function() {
        });
    });
});
