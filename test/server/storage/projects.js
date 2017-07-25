describe('projects', function() {
    const utils = require('../../assets/utils');
    const assert = require('assert');
    const Projects = require('../../../src/server/storage/projects');
    const OWNER = 'brian';
    const PROJECT_NAME = 'test-projects-' + Date.now();
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
            socket._socket.addResponse('project-request', utils.sendEmptyRole.bind(socket));
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

    it('should remove the project from db on destroy', function(done) {
        project.destroy()
            .then(() => Projects.get(OWNER, PROJECT_NAME))
            .then(data => {
                assert(!data);
                done();
            })
            .catch(done);
    });

    it('should create copy if name changed after persist', function(done) {
        project.persist()
            .then(() => project.addCollaborator('spartacus'))
            .then(() => {
                project._room.name = 'name-changed';
                return project.save();
            })
            .then(() => project.getRawProject())
            .then(data => {
                assert(data.collaborators.includes('spartacus'));
                return Projects.get(OWNER, PROJECT_NAME);
            })
            .then(original => original.destroy())
            .then(() => {
                done();
            })
            .catch(done);
    });

    it('should have the correct origin time', function(done) {
        project.getRawProject()
            .then(data => {
                assert.equal(data.originTime, project.originTime);
                done();
            })
            .catch(done);
    });

    describe('deletion', function() {
        beforeEach(function(done) {
            getRoom().then(room => {
                project = room.getProject();
                project.destroy().then(() => done());
            })
            .catch(done);
        });

        [
            'save',
            'persist',
            'setPublic',

            'setRawRole',
            'setRoles',
            'removeRole',
            'renameRole',

            'addCollaborator'
        ].forEach(action => {
            it(`should stop ${action} if deleted`, function(done) {
                project[action]()
                    .then(() => done(`${action} completed...`))
                    .catch(err => {
                        assert(err.includes('project has been deleted'));
                        done();
                    });
            });
        });
    });
});
