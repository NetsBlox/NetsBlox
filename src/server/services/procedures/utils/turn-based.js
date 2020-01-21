// A turn based base class to add turn based behavior to an RPC
'use strict';
var getArgs = require('../../../server-utils').getArgumentsFor;
const NetworkTopology = require('../../../network-topology');

class TurnBased {

    constructor(action, reset) {
        this._state = {};
        this._state._lastRoleToAct = null;
        this._rawAction = this[action];

        // replace "action" w/ a modified version
        this[action] = function() {
            const {projectId, roleId} = this.caller;

            // Filter
            if (this._state._lastRoleToAct === roleId) {
                return this.response.status(403).send('It\'s not your turn!');
            }

            // Call
            const result = this._rawAction.apply(this, arguments);
            if (result && result.then) {  // returned promise
                return result.then(success => {
                    if (success) {
                        const nextId = this._state._lastRoleToAct;
                        const sockets = NetworkTopology.getSocketsAt(projectId, nextId);
                        sockets.forEach(s => s.sendMessage('your turn'));
                        this._state._lastRoleToAct = roleId;
                    }
                });
            } else {
                // Notify
                const success = result;
                if (success) {
                    const nextId = this._state._lastRoleToAct;
                    const sockets = NetworkTopology.getSocketsAt(projectId, nextId);
                    sockets.forEach(s => s.sendMessage('your turn'));
                    this._state._lastRoleToAct = roleId;
                }
            }

        };
        this[action].args = getArgs(this._rawAction);

        // replace "reset" w/ a modified version
        this._resetAction = this[reset];
        this[reset] = function() {
            var success = this._resetAction.apply(this, arguments);
            if (success) {
                this._state._lastRoleToAct = null;
            }
        };
        this[reset].args = getArgs(this._resetAction);
    }
}

module.exports = TurnBased;
