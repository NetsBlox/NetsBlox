describe('projects', function() {
    const utils = require('../../assets/utils');
    const assert = require('assert');
    const Projects = utils.reqSrc('storage/projects');
    const PublicProjects = utils.reqSrc('storage/public-projects');
    const OWNER = 'brian';
    const PROJECT_NAME = 'test-projects-' + Date.now();
    const getRoom = function() {
        // Get the room and attach a project
        return utils.createRoom({
            name: PROJECT_NAME,
            owner: OWNER,
            roles: {
                p1: [OWNER],
                p2: ['cassie'],
                third: null
            }
        });
    };

    before(function(done) {
        utils.reset().then(() => done());
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
            'persist',
            'unpersist',
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

        it('should log on save when deleted but continue', function(done) {
            let traceFn = project._logger.trace;  // mock this out for the test
            project._logger.trace = msg => {
                if (msg.includes('project has been deleted')) {
                    done();
                    project._logger.trace = traceFn;
                }
            };
            project.save();
        });
    });

    describe('setName', function() {
        // setName should change the name in place and not create a copy

        before(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(project => project.setName('MyNewProject'))
                .then(() => done());
        });

        it('should not create a copy of saved project', function(done) {
            // check for the old version
            Projects.get('brian', 'PublicProject')
                .then(project => assert(!project))
                .then(() => done());
        });

        it('should update the project version in public-projects', function(done) {
            PublicProjects.get('brian', 'MyNewProject')
                .then(project => assert(project))
                .nodeify(done);
        });
    });

    describe('id', function() {
        it('should have an _id field on create', function() {
            assert(project._id);
        });

        it('should have an _id field on get from database', function(done) {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(project => assert(project._id))
                .nodeify(done);
        });
    });

});
