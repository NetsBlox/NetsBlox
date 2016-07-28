// A turn based base class to add turn based behavior to an RPC
'use strict';

class TurnBased {

    constructor(action, reset) {
        this._lastRoleToAct = null;
        this._rawAction = this[action];

        // replace "action" w/ a modified version
        this[action] = function(req, res) {
            var socket = req.netsbloxSocket,
                success;

            // Filter
            if (this._lastRoleToAct === socket.roleId) {
                return res.status(403).send('It\'s not your turn!');
            }

            // Call
            success = this._rawAction(req, res);

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

        // replace "reset" w/ a modified version
        this._resetAction = this[reset];
        this[reset] = function(req, res) {
            var success = this._resetAction(req, res);
            if (success) {
                this._lastRoleToAct = null;
            }
        };
    }
}

module.exports = TurnBased;
