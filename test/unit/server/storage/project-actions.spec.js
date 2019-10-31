describe('project-actions', function() {
    const utils = require('../../../assets/utils');
    const _ = require('lodash');
    const Q = require('q');
    const assert = require('assert');
    const ProjectActions = utils.reqSrc('storage/project-actions');
    const Projects = utils.reqSrc('storage/projects');

    let projectId = null;
    let roleId = null;

    async function setProjectRoleIds() {
        await utils.reset();
        let project = await Projects.get('brian', 'MultiRoles');
        projectId = project.getId();
        roleId = await project.getRoleId('r1');
        const actions = _.range(20).map((e, i) => {
            return {
                type: 'user-action',
                projectId: projectId,
                roleId: roleId,
                action: {id: i}
            };
        });

        for (let i = actions.length; i--;) {
            await ProjectActions.store(actions[i]);
        }
    }

    describe('getActionsAfter', function() {
        let requestedActions = [];

        beforeEach(async () => {
            await setProjectRoleIds();
            requestedActions = await ProjectActions.getActionsAfter(projectId, roleId, 9);
        });

        it('should retrieve previous actions following an action', function() {
            assert.equal(requestedActions.length, 10);
        });

        it('should return actions in increasing order', function() {
            // compare pairs of actions
            requestedActions.reduce((a1, a2) => {
                assert.equal(a1.action.id + 1, a2.action.id);
                return a2;
            });
        });

        it('should ignore cleared actions', function(done) {
            let pretty = actions => `Received ${JSON.stringify(actions)}. Expected 1.`;
            ProjectActions.clearActionsAfter(projectId, roleId, 10, new Date())
                .then(() => ProjectActions.getActionsAfter(projectId, roleId, 9))
                .then(actions => assert.equal(actions.length, 1, pretty(actions)))
                .nodeify(done);
        });

        it('should throw error if missing actions', async function() {
            try {
                await ProjectActions.getActionsAfter(projectId, roleId, 9);
                throw new Error('Did not throw error while getting actions');
            } catch (err) {
                assert(err.message.includes('Could not retrieve actions before'), err.message);
            }
        });
    });

    describe('clearActionsAfter', function() {
        beforeEach(async () => {
            await setProjectRoleIds();
        });

        it('should get correct number of actions', function(done) {
            ProjectActions.clearActionsAfter(projectId, roleId, 10, new Date())
                .then(count => assert.equal(count, 9))
                .nodeify(done);
        });

        it('should only update the actions after the actionId', function(done) {
            ProjectActions.clearActionsAfter(projectId, roleId, 10, new Date())
                .then(() => ProjectActions.getCollection().find({}).toArray())
                .then(actions => {
                    actions.forEach(action => {
                        assert.equal(!!action.notSaved, action.action.id > 10);
                    });
                })
                .nodeify(done);
        });
    });

    describe('latest action id', function() {
        beforeEach(() => utils.reset());

        it('should be able to update the latest action id', async function() {
            const projectId = 'test-action-id';
            const roleId = `${projectId}-role`;
            const newActionId = 10;

            await ProjectActions.setLatestActionId(projectId, roleId, newActionId);
            const currentActionId = await ProjectActions.getLatestActionId(projectId, roleId);
            assert.equal(newActionId, currentActionId);
        });
    });
});
