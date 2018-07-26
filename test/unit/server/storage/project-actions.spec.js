describe('project-actions', function() {
    const utils = require('../../../assets/utils');
    const _ = require('lodash');
    const Q = require('q');
    const assert = require('assert');
    const ProjectActions = utils.reqSrc('storage/project-actions');
    const PROJECT_ID = 'testProjectId';
    const ROLE_ID = 'testRoleId';
    const actions = _.range(20).map((e, i) => {
        return {
            type: 'user-action',
            projectId: PROJECT_ID,
            roleId: ROLE_ID,
            action: {id: i}
        };
    });

    describe('getActionsAfter', function() {
        let requestedActions = [];

        beforeEach(done => {
            utils.reset()
                .then(() => Q.all(actions.map(action => ProjectActions.store(action))))
                .then(() => ProjectActions.getActionsAfter(PROJECT_ID, ROLE_ID, 9))
                .then(_actions => requestedActions = _actions)
                .nodeify(done);
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
            ProjectActions.clearActionsAfter(PROJECT_ID, ROLE_ID, 10, new Date())
                .then(() => ProjectActions.getActionsAfter(PROJECT_ID, ROLE_ID, 9))
                .then(actions => assert.equal(actions.length, 1, pretty(actions)))
                .nodeify(done);
        });
    });

    describe('clearActionsAfter', function() {
        beforeEach(done => {
            utils.reset()
                .then(() => Q.all(actions.map(action => ProjectActions.store(action))))
                .then(() => ProjectActions.getActionsAfter(PROJECT_ID, ROLE_ID, 9))
                .nodeify(done);
        });

        it('should get correct number of actions', function(done) {
            ProjectActions.clearActionsAfter(PROJECT_ID, ROLE_ID, 10, new Date())
                .then(count => assert.equal(count, 9))
                .nodeify(done);
        });

        it('should only update the actions after the actionId', function(done) {
            ProjectActions.clearActionsAfter(PROJECT_ID, ROLE_ID, 10, new Date())
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
