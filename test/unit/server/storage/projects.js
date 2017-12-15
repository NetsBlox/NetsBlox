describe('projects', function() {
    const utils = require('../../../assets/utils');
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
        utils.reset().nodeify(done);
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
        project.getRoleNames()
            .then(() => project.getRole('p1'))
            .then(role => {
                assert.equal(role.ProjectName, 'p1');
                assert.notEqual(role.SourceCode.length, 128);
            })
            .nodeify(done);
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

    it('should not change id on rename role', function(done) {
        let roleId = null;
        project.getRoleId('p1')
            .then(id => roleId = id)
            .then(() => project.renameRole('p1', 'newName'))
            .then(() => project.getRoleId('newName'))
            .then(id => assert.equal(id, roleId))
            .nodeify(done);
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

    describe('getLastUpdatedRoleName', function() {
        let project = null;
        before(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'MultiRoles'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should return a name', done => {
            project.getLastUpdatedRoleName()
                .then(name => assert.equal(typeof name, 'string'))
                .nodeify(done);
        });

        it('should return the last role based on the "Updated" field', done => {
            project.getRawRole('r2')
                .then(role => {
                    let time = new Date(role.Updated).getTime();
                    role.Updated = new Date(time + 100000);
                    return project.setRawRole('r1', role);
                })
                .then(() => project.getLastUpdatedRoleName())
                .then(name => assert.equal(name, 'r1'))
                .nodeify(done);
        });
    });

    describe('getLastUpdatedRole', function() {
        let project = null;
        before(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'MultiRoles'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should return a role', done => {
            project.getLastUpdatedRole()
                .then(role => assert(role.ProjectName))
                .nodeify(done);
        });

        it('should not return a raw role', done => {
            project.getLastUpdatedRole()
                .then(role => assert.equal(role.SourceCode[0], '<'))
                .nodeify(done);
        });

        it('should return the last role based on the "Updated" field', done => {
            project.getRawRole('r2')
                .then(role => {
                    let time = new Date(role.Updated).getTime();
                    role.Updated = new Date(time + 100000);
                    return project.setRawRole('r1', role);
                })
                .then(() => project.getLastUpdatedRole())
                .then(role => assert.equal(role.ProjectName, 'r1'))
                .nodeify(done);
        });
    });

    describe('setRawRoleById', function() {
        let roleName = 'role';
        let roleId = null;
        beforeEach(done => {
            let content = null;
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .then(() => project.getRawRole('role'))
                .then(role => {
                    content = role;
                    content.ProjectName = 'NewName';
                    return project.getRoleId(roleName)
                        .then(id => roleId = id);
                })
                .then(() => project.setRawRoleById(roleId, content))
                .nodeify(done);
        });

        it('should add new role name', function(done) {
            project.getRoleNames()
                .then(names => assert(names.includes('NewName')))
                .nodeify(done);
        });

        it('should not keep old role name', function(done) {
            project.getRawProject()
                .then(() => project.getRoleNames())
                .then(names => assert(!names.includes('role')))
                .nodeify(done);
        });

        it('should not change the role id', function(done) {
            project.getRoleId('NewName')
                .then(id => assert.equal(id, roleId))
                .nodeify(done);
        });

        it.skip('should get new role id', function(done) {
            project.getRoleId('NewName')
                .then(id => assert(id))
                .nodeify(done);
        });

        it('should add new role id', function(done) {
            project.getRoleIds()
                .then(ids => assert.equal(ids.length, 1, `expected one id but got: ${ids.join(',')}`))
                .nodeify(done);
        });
    });

    describe('renameRole', function() {
        let firstId = null;
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .then(() => project.getRoleId('role'))
                .then(id => firstId = id)
                .then(() => project.renameRole('role', 'role2'))
                .nodeify(done);
        });

        it('should preserve the role id on rename', function(done) {
            project.getRoleId('role2')
                .then(id => assert.equal(firstId, id))
                .nodeify(done);
        });

        it('should remove the old role', function(done) {
            project.getRoleNames()
                .then(names => assert(!names.includes('role')))
                .nodeify(done);
        });
    });

    describe('getRoleId', function() {
        let project = null;
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should get the role id', function(done) {
            project.getRoleId('role')
                .then(id => assert(id))
                .nodeify(done);
        });

        it('should preserve the role id on setRawRole', function(done) {
            let firstId = null;

            project.getRawRole('role')
                .then(role => {
                    content = role;
                    content.ProjectName = 'NewName';
                })
                .then(() => project.getRoleId('role'))
                .then(id => firstId = id)
                .then(() => project.setRawRoleById(firstId, content))
                .then(() => project.getRoleId('NewName'))
                .then(id => assert.equal(firstId, id))
                .nodeify(done);
        });

        it('should get diff role id for cloned role', function(done) {
            project.getRoleId('role')
                .then(id => firstId = id)
                .then(() => project.cloneRole('role', 'clonedRole'))
                .then(() => project.getRoleId('role2'))
                .then(id => assert.notEqual(firstId, id))
                .nodeify(done);
        });
    });

    describe('setRawRole', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .then(() => project.getRawRole('role'))
                .then(content => project.setRawRole('r2', content))
                .nodeify(done);
        });

        it('should update the role name', function(done) {
            project.getRoleNames()
                .then(names => assert(names.includes('r2')))
                .nodeify(done);
        });

        it('should update the role id', function(done) {
            let firstId = null;
            project.getRoleId('role')
                .then(id => firstId = id)
                .then(() => project.getRoleId('r2'))
                .then(secondId => assert.notEqual(firstId, secondId))
                .nodeify(done);
        });
    });

    describe('cloneRole', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .then(() => project.cloneRole('role', 'clonedRole'))
                .nodeify(done);
        });

        it('should create a new role name', function(done) {
            project.getRoleNames()
                .then(names => assert.equal(names.length, 2))
                .nodeify(done);
        });

        it('should create a new role id', function(done) {
            project.getRoleIds()
                .then(ids => assert.notEqual(ids[0], ids[1]))
                .nodeify(done);
        });
    });

    describe('getRoleIds', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should return role id(s)', function(done) {
            project.getRoleIds()
                .then(ids => assert.equal(ids.length, 1))
                .nodeify(done);
        });
    });

    describe('getRoleNames', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should be able to get role names', function(done) {
            project.getRoleNames()
                .then(names => assert.equal(names[0], 'role'))
                .nodeify(done);
        });
    });


});
