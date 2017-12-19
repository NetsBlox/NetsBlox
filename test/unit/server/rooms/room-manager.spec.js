describe('room-manager', () => {
    const utils = require('../../../assets/utils');
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

        it('should only return one room for a project', function(done) {
            let newName = 'newName';
            let room = null;
            Rooms.getRoom(null, 'brian', 'PublicProject')
                .then(firstRoom => {
                    // request a project with the new name
                    room = firstRoom;
                    return room.getProject().setName(newName);
                })
                .then(() => Rooms.getRoom(null, 'brian', newName))
                .then(newRoom => assert(room === newRoom))
                .nodeify(done);
        });
    });
});
