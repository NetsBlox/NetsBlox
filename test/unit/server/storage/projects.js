describe('projects', function() {
    this.timeout(5000);
    const utils = require('../../../assets/utils');
    const Q = require('q');
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

    before(() => utils.reset());

    let project = null;
    beforeEach(async function() {
        project = await getRoom();
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

    it('should get role by id', function(done) {
        Projects.get('brian', 'MultiRoles')
            .then(project => project.getRoleById('r1-ID'))
            .then(role => assert(role))
            .nodeify(done);
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

    it('should create cloned role', async function() {
        const project = await Projects.get('brian', 'MultiRoles');
        await project.cloneRole('r1', 'clone1');
        const role = await project.getRole('clone1');
        assert(role);
        assert.equal(role.ProjectName, 'clone1');
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

    it('should have the correct origin time', function() {
        let project = null;
        return Projects.get('brian', 'MultiRoles')
            .then(result => project = result)
            .then(() => project.getRawProject())
            .then(data => assert.equal(
                data.originTime.getTime(),
                project.originTime.getTime()
            ));
    });

    describe('deletion', function() {
        beforeEach(async function() {
            project = await getRoom();
            await project.destroy();
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


    describe('findOne caching..', function() {
        let project;
        const rId = 'r1-ID';
        const query = {owner: 'brian', name: 'MultiRoles'};
        const newName = 'newName';

        beforeEach(async () => {
            await utils.reset();
            let proj = await Projects.get('brian', 'MultiRoles');
            project = proj;
        });

        it('should be able opt out of caching', async function() {

            let initialProj = await Projects._findOne(query, false);

            // change the project in db
            const change = {$set: {}};
            change.$set[`roles.${rId}.ProjectName`] = newName;
            await Q(Projects._collection.update({_id: initialProj._id}, change));

            let reFetchedProj = await Projects._findOne(query, false);

            let initialRoleName = initialProj.roles[rId].ProjectName;
            let reFetchedRoleName = reFetchedProj.roles[rId].ProjectName;

            // should see the updated name
            assert.equal(reFetchedRoleName, newName);
            assert(initialRoleName !== reFetchedRoleName);
        });

        it('should be able to cache results', async function() {

            let initialProj = await Projects._findOne(query, true);

            // change the project in db
            const change = {$set: {}};
            change.$set[`roles.${rId}.ProjectName`] = newName;
            await Q(Projects._collection.update({_id: initialProj._id}, change));

            let reFetchedProj = await Projects._findOne(query, true);

            let initialRoleName = initialProj.roles[rId].ProjectName;
            let reFetchedRoleName = reFetchedProj.roles[rId].ProjectName;

            // should see the stale cached value
            assert.deepEqual(reFetchedRoleName, initialRoleName);
        });

        it('should not cache null values', async function() {
            const nullQuery = {owner: 'brian', name: newName};

            // query for a non-existing record
            let initialProj = await Projects._findOne(nullQuery, true);
            assert.deepEqual(initialProj, null);

            // create that record
            const change = {$set: {}};
            change.$set.name = newName;
            await Q(Projects._collection.update(query, change));

            // should find that record
            let reFetchedProj = await Projects._findOne(nullQuery, true);

            assert(reFetchedProj !== null);
            assert.equal(reFetchedProj.name, newName);
        });

    });

    describe('project by id', function() {
        let project = null;
        before(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'MultiRoles'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should not be able to get raw project by id', async function() {
            let fetchedProj = await Projects.getRawProjectById(project.getId());
            assert.deepEqual(fetchedProj.name, 'MultiRoles');
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

    describe('execUpdate', function() {
        let project = null;
        before(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'MultiRoles'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should record the update time ', function() {
            const startTime = new Date();
            const newName = 'someNewName';
            const query = {$set: {}};
            query.$set.name = newName;

            return project._execUpdate(query)
                .then(() => project.getRawProject())
                .then(json => {
                    const {lastUpdatedAt} = json;
                    assert(lastUpdatedAt >= startTime, 'last update time not recorded');
                });
        });
    });

    describe('removeRole', function() {
        let project = null;
        before(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'MultiRoles'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should remove role by name', function(done) {
            project.removeRole('r1')
                .then(() => project.getRoleNames())
                .nodeify(done);
        });

        it('should reject promise if name doesn\'t exist', function(done) {
            project.removeRole('r1000')
                .then(() => project.getRoleNames())
                .catch(() => done());
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
            let content = null;

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

        it('should get diff role id for cloned role', async function() {
            const firstId = await project.getRoleId('role');
            await project.cloneRole('role', 'clonedRole');
            const id = await project.getRoleId('clonedRole');
            assert.notEqual(firstId, id);
            const names = await project.getRoleNames();
            assert(id);
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

    describe('getRecordStartTime', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should not be recording messages by default', done => {
            project.isRecordingMessages()
                .then(recording => assert(!recording))
                .nodeify(done);
        });

        it('should not be recording messages by default', done => {
            project.isRecordingMessages()
                .then(recording => assert(!recording))
                .nodeify(done);
        });
    });

    describe('getLatestRecordStartTime', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should have default startTime of -Infinity', done => {
            project.getLatestRecordStartTime()
                .then(time => assert.equal(time, -Infinity))
                .nodeify(done);
        });

        it('should return latest time', done => {
            const times = [1000, 1500, 1200];
            Q.all(times.map(time => project.startRecordingMessages(`u${time}`, time)))
                .then(() => project.getLatestRecordStartTime())
                .then(time => assert.equal(time, 1500))
                .nodeify(done);
        });
    });

    describe('stopRecordingMessages', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should unset start time if matching', done => {
            project.startRecordingMessages('test')
                .then(time => project.stopRecordingMessages('test'))
                .then(() => project.getLatestRecordStartTime())
                .then(time => assert.equal(time, -Infinity))
                .nodeify(done);
        });

        it('should remove (clean up) old start times', done => {
            project.startRecordingMessages('test', 1000)
                .then(() => project.startRecordingMessages())
                .then(time => project.stopRecordingMessages('test', time))
                .then(() => project.getRawProject())
                .then(raw => assert(!raw.recordMessagesAfter.includes(1000)))
                .nodeify(done);
        });
    });

    describe('isRecordingMessages', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .nodeify(done);
        });

        it('should be recording messages after starting recording', () => {
            return project.startRecordingMessages('test')
                .then(() => project.isRecordingMessages())
                .then(recording => assert(recording));
        });

        it('should still record msgs while one person is recording', done => {
            // Two people start recording
            Q.all([
                project.startRecordingMessages('p1'),
                project.startRecordingMessages('p2')
            ])
                .then(() => project.stopRecordingMessages('p1'))
                .then(() => project.isRecordingMessages())
                .then(recording => assert(recording))
                .nodeify(done);
        });

        it('should not be recording if timeout reached', done => {
            project.startRecordingMessages('test', 10000)
                .then(() => project.isRecordingMessages())
                .then(recording => assert(!recording))
                .nodeify(done);
        });
    });

    describe('startRecordingMessages', function() {
        let result = null;
        beforeEach(done => {
            utils.reset()
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(proj => project = proj)
                .then(() => project.startRecordingMessages('test'))
                .then(res => result = res)
                .nodeify(done);
        });

        it('should set the start time', done => {
            project.getLatestRecordStartTime()
                .then(time => assert(time) && assert.equal(time, result))
                .nodeify(done);
        });

        it('should be recording messages', done => {
            project.isRecordingMessages()
                .then(recording => assert(recording))
                .nodeify(done);
        });
    });

    describe('archive', function() {
        let archives, project;

        before(done => {
            utils.reset()
                .then(db => archives = db.collection('project-archives'))
                .then(() => Projects.get('brian', 'PublicProject'))
                .then(result => project = result)
                .then(() => project.archive())
                .nodeify(done);
        });

        it('should store archive in project-archives', () => {
            return project.getRawProject()
                .then(result => Q(archives.findOne({projectId: result._id})))
                .then(archive => assert(archive));
        });

        it('should not update archive on project edit', () => {
            return project.setName('someNewName')
                .then(() => project.getRawProject())
                .then(result => Q(archives.findOne({projectId: result._id})))
                .then(archive => assert.equal(archive.name, 'PublicProject'));
        });
    });

    describe('getId', function() {
        let project;

        before(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should return a string', function() {
            assert.equal(typeof project.getId(), 'string');
        });
    });

    describe('toXML', function() {
        before(() => utils.reset());

        it('should generate project xml', async function() {
            const project = await Projects.get('brian', 'PublicProject');
            const xml = await project.toXML();
            assert(xml, 'Did not generate XML');
            assert(xml.startsWith('<room'));
            assert(xml.includes('<project'));
        });

    });
});
