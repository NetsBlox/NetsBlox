// A turn based base class to add turn based behavior to an RPC
'use strict';
var getArgs = require('../../../ServerUtils').getArgumentsFor;

class TurnBased {

    constructor(action, reset) {
        this._lastRoleToAct = null;
        this._rawAction = this[action];

        // replace "action" w/ a modified version
        this[action] = function() {
            var socket = this.socket,
                success;

            // Filter
            if (this._lastRoleToAct === socket.roleId) {
                return this.response.status(403).send('It\'s not your turn!');
            }

            // Call
            success = this._rawAction.apply(this, arguments);

            // Notify
            if (success) {
                socket._room.sockets().forEach(s => s.send({
                    type: 'message',
                    msgType: 'your turn',
                    dstId: this._lastRoleToAct
                }));
                this._lastRoleToAct = socket.roleId;
            }
        };
        this[action].args = getArgs(this._rawAction);

        // replace "reset" w/ a modified version
        this._resetAction = this[reset];
        this[reset] = function() {
            var success = this._resetAction.apply(this, arguments);
            if (success) {
                this._lastRoleToAct = null;
            }
        };
        this[reset].args = getArgs(this._resetAction);
    }
}

module.exports = TurnBased;
