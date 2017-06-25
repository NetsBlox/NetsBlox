describe('projects', function() {
    const utils = require('../../assets/utils');
    const assert = require('assert');
    const serverUtils = utils.reqSrc('server-utils');
    const Projects = require('../../../src/server/storage/projects');
    const sendEmptyRole = function(msg) {
        return {
            type: 'project-response',
            id: msg.id,
            project: serverUtils.getEmptyRole(this.roleId)
        };
    };

    const getRoom = function() {
        // Get the room and attach a project
        const room = utils.createRoom({
            name: 'test-projects',
            owner: 'brian',
            roles: {
                p1: ['brian'],
                p2: ['cassie'],
                third: null
            }
        });
        const owner = room.getSocketsAt('p1')[0];

        //  Add response capabilities
        room.sockets().forEach(socket => {
            socket._socket.addResponse('project-request', sendEmptyRole.bind(socket));
        });

        return Projects.new(owner, room)
            .then(project => {
                room.setStorage(project);
                return room;
            });
    };

    const getProject = function() {
        return getRoom().then(room => room.getProject());
    };

    before(function(done) {
        utils.connect().then(() => done());
    });

    describe.only('persist', function() {
        let project = null;
        beforeEach(function(done) {
            getRoom().then(room => {
                project = room.getProject();
                done();
            })
            .catch(done);
        });

        afterEach(function(done) {
            project.destroy()
                .then(() => done())
                .catch(done);
        });

        it('should start as transient', function(done) {
            project.isTransient()
                .then(isTransient => assert(isTransient))
                .then(() => done())
                .catch(done);
        });

        it.skip('should set transient to true', function(done) {
            project.persist()
                .then(() => project.isTransient())
                .then(isTransient => assert(!isTransient))
                .then(() => done())
                .catch(done);
        });

        it.skip('should set transient to true across duplicate projects', function(done) {
            //var p2 = Projects.get()
            // open another project
            // TODO
        });
    });

    describe('roles', function() {
        it('should get role', function() {
            // TODO
        });

        it('should set role', function() {
            // TODO
        });

        it('should rename role', function() {
            // TODO
        });
    });

    describe('clone role', function() {
        it('should create role', function() {
            // TODO
        });

        it('should set role name correctly', function() {
            // TODO
        });
    });

    // TODO: test public project stuff
    //  - persist
    //    - transient (with shared project)
    //    - transient (with shared project)
});
