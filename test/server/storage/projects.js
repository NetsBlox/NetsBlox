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

    const OWNER = 'brian';
    const PROJECT_NAME = 'test-projects';
    const getRoom = function() {
        // Get the room and attach a project
        const room = utils.createRoom({
            name: PROJECT_NAME,
            owner: OWNER,
            roles: {
                p1: [OWNER],
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

    before(function(done) {
        utils.connect().then(() => done());
    });

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

    it('should return undefined for non-existent role', function(done) {
        project.getRole('i-am-not-real')
            .then(role => assert.equal(role, undefined))
            .then(() => done())
            .catch(done);
    });

    it('should start as transient', function(done) {
        project.isTransient()
            .then(isTransient => assert(isTransient))
            .then(() => done())
            .catch(done);
    });

    it('should set transient to true', function(done) {
        project.persist()
            .then(() => project.isTransient())
            .then(isTransient => assert(!isTransient))
            .then(() => done())
            .catch(done);
    });

    it('should set transient to true across duplicate projects', function(done) {
        Projects.get(OWNER, PROJECT_NAME)
            .then(p2 => {
                project.persist()
                    .then(() => p2.isTransient())
                    .then(isTransient => assert(!isTransient))
                    .then(() => done())
                    .catch(done);
            });
    });

    it('should get role', function(done) {
        project.getRole('p1')
            .then(role => {
                assert.equal(role.ProjectName, 'p1');
                assert.notEqual(role.SourceCode.length, 128);
                done();
            })
            .catch(done);
    });

    it('should rename role', function(done) {
        project.renameRole('p1', 'newName')
            .then(() => project.getRole('p1'))
            .then(role => assert(!role, 'original role still exists'))
            .then(() => project.getRole('newName'))
            .then(role => {
                assert(role);
                assert.equal(role.ProjectName, 'newName');
                done();
            })
            .catch(done);
    });

    it('should create cloned role', function(done) {
        project.cloneRole('p1', 'clone1')
            .then(() => project.getRole('clone1'))
            .then(role => {
                assert(role);
                assert.equal(role.ProjectName, 'clone1');
                done();
            })
        .catch(done);
    });
});
