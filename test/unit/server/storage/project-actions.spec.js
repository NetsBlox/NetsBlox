describe('project-actions', function() {
    const utils = require('../../../assets/utils');
    const _ = require('lodash');
    const Q = require('q');
    const assert = require('assert');
    const ProjectActions = utils.reqSrc('storage/project-actions');
    const PROJECT_ID = 'testProjectId';
    const actions = _.range(20).map((e, i) => {
        return {
            type: 'user-action',
            projectId: PROJECT_ID,
            action: {id: i}
        };
    });
    let requestedActions = [];

    before(done => {
        utils.reset()
            .then(() => Q.all(actions.map(action => ProjectActions.store(action))))
            .then(() => ProjectActions.getActionsAfter(PROJECT_ID, 9))
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

});
