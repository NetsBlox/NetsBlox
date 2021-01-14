const utils = require('../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    this.timeout(5000);
    const Q = require('q');
    const assert = require('assert');
    const Projects = utils.reqSrc('storage/projects');
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

    it('should return undefined for non-existent role', async function() {
        const role = await project.getRole('i-am-not-real');
        assert.equal(role, undefined);
    });

    it('should start as transient', async function() {
        const isTransient = await project.isTransient();
        assert(isTransient);
    });

    it('should set transient to true', async function() {
        await project.persist();
        const isTransient = await project.isTransient();
        assert(!isTransient);
    });

    it('should set transient to true across duplicate projects', async () => {
        const p2 = await Projects.get(OWNER, PROJECT_NAME);
        await project.persist();
        const isTransient = await p2.isTransient();
        assert(!isTransient);
    });

    it('should get role by id', async function() {
        const project = await Projects.get('brian', 'MultiRoles');
        const role = await project.getRoleById('r1-ID');
        assert(role);
    });

    it('should get role', async function() {
        const role = await project.getRole('p1');
        assert.equal(role.ProjectName, 'p1');
        assert.notEqual(role.SourceCode.length, 128);
    });

    it('should rename role', async function() {
        await project.renameRole('p1', 'newName');
        const originalRole = await project.getRole('p1');
        assert(!originalRole, 'original role still exists');
        const role = await project.getRole('newName');
        assert(role);
        assert.equal(role.ProjectName, 'newName');
    });

    it('should not change id on rename role', async function() {
        const roleId = await project.getRoleId('p1');
        await project.renameRole('p1', 'newName');
        const id = await project.getRoleId('newName');
        assert.equal(id, roleId);
    });

    it('should create cloned role', async function() {
        const project = await Projects.get('brian', 'MultiRoles');
        await project.cloneRole('r1', 'clone1');
        const role = await project.getRole('clone1');
        assert(role);
        assert.equal(role.ProjectName, 'clone1');
    });

    it('should remove the project from db on destroy', async function() {
        await project.destroy();
        const data = await Projects.get(OWNER, PROJECT_NAME);
        assert(!data);
    });

    it('should have the correct origin time', async function() {
        const project = await Projects.get('brian', 'MultiRoles');
        const data = await project.getProjectMetadata();
        assert.equal(
            data.originTime.getTime(),
            project.originTime.getTime()
        );
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

        before(async () => {
            await utils.reset();
            const project = await Projects.get('brian', 'PublicProject');
            await project.setName('MyNewProject');
        });

        it('should not create a copy of saved project', async function() {
            // check for the old version
            const project = await Projects.get('brian', 'PublicProject');
            assert(!project);
        });

        it('should update the project version in public-projects', async function() {
            const project = await Projects.getPublicProject('brian', 'MyNewProject');
            assert(project);
        });
    });

    describe('id', function() {
        it('should have an _id field on create', function() {
            assert(project._id);
        });

        it('should have an _id field on get from database', async function() {
            await utils.reset();
            const project = await Projects.get('brian', 'PublicProject');
            assert(project._id);
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
        before(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'MultiRoles');
        });

        it('should not be able to get raw project by id', async function() {
            let fetchedProj = await Projects.getProjectMetadataById(project.getId());
            assert.deepEqual(fetchedProj.name, 'MultiRoles');
        });

    });


    describe('getLastUpdatedRoleName', function() {
        let project = null;
        before(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'MultiRoles');
        });

        it('should return a name', async () => {
            const name = await project.getLastUpdatedRoleName();
            assert.equal(typeof name, 'string');
        });

        it('should return the last role based on the "Updated" field', async () => {
            const role = await project.getRawRole('r2');
            let time = new Date(role.Updated).getTime();
            role.Updated = new Date(time + 100000);
            await project.setRawRole('r1', role);
            const name = await project.getLastUpdatedRoleName();
            assert.equal(name, 'r1');
        });
    });

    describe('execUpdate', function() {
        let project = null;
        before(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'MultiRoles');
        });

        it('should record the update time ', function() {
            const startTime = new Date();
            const newName = 'someNewName';
            const query = {$set: {}};
            query.$set.name = newName;

            return project._execUpdate(query)
                .then(() => project.getProjectMetadata())
                .then(json => {
                    const {lastUpdatedAt} = json;
                    assert(lastUpdatedAt >= startTime, 'last update time not recorded');
                });
        });
    });

    describe('removeRole', function() {
        let project = null;
        before(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'MultiRoles');
        });

        it('should remove role by name', async () => {
            await project.removeRole('r1');
            const names = await project.getRoleNames();
            assert(!names.includes('r1'), 'Role name has not been removed');
        });

        it('should reject promise if name doesn\'t exist', async function() {
            await utils.shouldThrow(() => project.removeRole('r1000'));
        });
    });

    describe('getLastUpdatedRole', function() {
        let project = null;
        before(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'MultiRoles');
        });

        it('should return a role', async () => {
            const role = await project.getLastUpdatedRole();
            assert(role.ProjectName);
        });

        it('should not return a raw role', async () => {
            const role = await project.getLastUpdatedRole();
            assert.equal(role.SourceCode[0], '<');
        });

        it('should return the last role based on the "Updated" field', async () => {
            const rawRole = await project.getRawRole('r2');
            const time = new Date(rawRole.Updated).getTime();
            rawRole.Updated = new Date(time + 100000);
            await project.setRawRole('r1', rawRole);
            const role = await project.getLastUpdatedRole();
            assert.equal(role.ProjectName, 'r1');
        });
    });

    describe('setRawRoleById', function() {
        let roleName = 'role';
        let roleId = null;
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
            const content = await project.getRawRole('role');
            content.ProjectName = 'NewName';
            roleId = await project.getRoleId(roleName);
            await project.setRawRoleById(roleId, content);
        });

        it('should add new role name', async () => {
            const names = await project.getRoleNames();
            assert(names.includes('NewName'));
        });

        it('should not keep old role name', async function() {
            await project.getProjectMetadata();
            const names = await project.getRoleNames();
            assert(!names.includes('role'));
        });

        it('should not change the role id', async function() {
            const id = await project.getRoleId('NewName');
            assert.equal(id, roleId);
        });

        it.skip('should get new role id', async function() {
            const id = await project.getRoleId('NewName');
            assert(id);
        });

        it('should add new role id', async function() {
            const ids = await project.getRoleIds();
            assert.equal(ids.length, 1, `expected one id but got: ${ids.join(',')}`);
        });
    });

    describe('renameRole', function() {
        let firstId = null;
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
            firstId = await project.getRoleId('role');
            await project.renameRole('role', 'role2');
        });

        it('should preserve the role id on rename', async function() {
            const id = await project.getRoleId('role2');
            assert.equal(firstId, id);
        });

        it('should remove the old role', async function() {
            const names = await project.getRoleNames();
            assert(!names.includes('role'));
        });
    });

    describe('getRoleId', function() {
        let project = null;
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should get the role id', async function() {
            const id = await project.getRoleId('role');
            assert(id);
        });

        it('should preserve the role id on setRawRole', async function() {
            const content = await project.getRawRole('role');
            content.ProjectName = 'NewName';
            const firstId = await project.getRoleId('role');
            await project.setRawRoleById(firstId, content);
            const id = await project.getRoleId('NewName');
            assert.equal(firstId, id);
        });

        it('should get diff role id for cloned role', async function() {
            const firstId = await project.getRoleId('role');
            await project.cloneRole('role', 'clonedRole');
            const id = await project.getRoleId('clonedRole');
            assert.notEqual(firstId, id);
            assert(id);
        });
    });

    describe('setRawRole', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
            const content = await project.getRawRole('role');
            await project.setRawRole('r2', content);
        });

        it('should update the role name', async function() {
            const names = await project.getRoleNames();
            assert(names.includes('r2'));
        });

        it('should update the role id', async function() {
            const firstId = await project.getRoleId('role');
            const secondId = await project.getRoleId('r2');
            assert.notEqual(firstId, secondId);
        });
    });

    describe('cloneRole', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
            await project.cloneRole('role', 'clonedRole');
        });

        it('should create a new role name', async function() {
            const names = await project.getRoleNames();
            assert.equal(names.length, 2);
        });

        it('should create a new role id', async function() {
            const [id1, id2] = await project.getRoleIds();
            assert.notEqual(id1, id2);
        });
    });

    describe('getRoleIds', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should return role id(s)', async function() {
            const ids = await project.getRoleIds();
            assert.equal(ids.length, 1);
        });
    });

    describe('getRoleNames', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should be able to get role names', async function() {
            const [name] = await project.getRoleNames();
            assert.equal(name, 'role');
        });
    });

    describe('getRecordStartTime', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should not be recording messages by default', async () => {
            const recording = await project.isRecordingMessages();
            assert(!recording);
        });

        it('should not be recording messages by default', async () => {
            const recording = await project.isRecordingMessages();
            assert(!recording);
        });
    });

    describe('getLatestRecordStartTime', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should have default startTime of -Infinity', async () => {
            const time = await project.getLatestRecordStartTime();
            assert.equal(time, -Infinity);
        });

        it('should return latest time', async () => {
            const times = [1000, 1500, 1200];
            await Promise.all(times.map(time => project.startRecordingMessages(`u${time}`, time)));
            const time = await project.getLatestRecordStartTime();
            assert.equal(time, 1500);
        });
    });

    describe('stopRecordingMessages', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should unset start time if matching', async () => {
            await project.startRecordingMessages('test');
            await project.stopRecordingMessages('test');
            const time = await project.getLatestRecordStartTime();
            assert.equal(time, -Infinity);
        });

        it('should remove (clean up) old start times', async () => {
            await project.startRecordingMessages('test', 1000);
            const time = await project.startRecordingMessages();
            await project.stopRecordingMessages('test', time);
            const raw = await project.getProjectMetadata();
            assert(!raw.recordMessagesAfter.includes(1000));
        });
    });

    describe('isRecordingMessages', function() {
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
        });

        it('should be recording messages after starting recording', async () => {
            await project.startRecordingMessages('test');
            const recording = await project.isRecordingMessages();
            assert(recording);
        });

        it('should still record msgs while one person is recording', async () => {
            // Two people start recording
            await Promise.all([
                project.startRecordingMessages('p1'),
                project.startRecordingMessages('p2')
            ]);
            await project.stopRecordingMessages('p1');
            const recording = await project.isRecordingMessages();
            assert(recording);
        });

        it('should not be recording if timeout reached', async () => {
            await project.startRecordingMessages('test', 10000);
            const recording = await project.isRecordingMessages();
            assert(!recording);
        });
    });

    describe('startRecordingMessages', function() {
        let result = null;
        beforeEach(async () => {
            await utils.reset();
            project = await Projects.get('brian', 'PublicProject');
            result = await project.startRecordingMessages('test');
        });

        it('should set the start time', async () => {
            const time = await project.getLatestRecordStartTime();
            assert(time);
            assert.equal(time, result);
        });

        it('should be recording messages', async () => {
            const recording = await project.isRecordingMessages();
            assert(recording);
        });
    });

    describe('archive', function() {
        let archives, project;

        before(async () => {
            const db = await utils.reset();
            archives = db.collection('project-archives');
            project = await Projects.get('brian', 'PublicProject');
            await project.archive();
        });

        it('should store archive in project-archives', async () => {
            const result = await project.getProjectMetadata();
            const archive = await archives.findOne({projectId: result._id});
            assert(archive);
        });

        it('should not update archive on project edit', async () => {
            await project.setName('someNewName');
            const result = await project.getProjectMetadata();
            const archive = await archives.findOne({projectId: result._id});
            assert.equal(archive.name, 'PublicProject');
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
