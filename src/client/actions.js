/* globals UndoManager, ActionManager, SnapActions, NetsBloxSerializer,
   HintInputSlotMorph, SnapCloud, Action*/
// NetsBlox Specific Actions
SnapActions.addActions(
    'addMessageType',
    'deleteMessageType'
);

ActionManager.URL = 'ws://' + window.location.host + '/collaboration';
ActionManager.prototype._deleteMessageType = function(name) {
    var fields = this.ide().stage.messageTypes.getMsgType(name).fields;
    return [name, fields];
};

ActionManager.prototype.onAddMessageType = function(name, fields) {
    var ide = this.ide();
    ide.stage.addMessageType({
        name: name,
        fields: fields
    });
    ide.flushBlocksCache('services');  //  b/c of inheritance
    ide.refreshPalette();
    this.completeAction();
};

ActionManager.prototype.onDeleteMessageType = function(name) {
    var ide = this.ide();
    ide.stage.deleteMessageType(name);
    ide.flushBlocksCache('services');  //  b/c of inheritance
    ide.refreshPalette();
    this.completeAction();
};

// HintInputSlotMorph support
ActionManager.prototype._setField = function(field, value) {
    var fieldId = this.getId(field),
        oldValue = field.contents().text;

    if (field instanceof HintInputSlotMorph && field.empty) {
        oldValue = '';
    }

    return [
        fieldId,
        value,
        oldValue
    ];
};

UndoManager.Invert.addMessageType = function() {
    return 'deleteMessageType';
};

UndoManager.Invert.deleteMessageType = function() {
    return 'addMessageType';
};

SnapActions.serializer = new NetsBloxSerializer();
SnapActions.__sessionId = Date.now();
SnapActions.enableCollaboration =
SnapActions.disableCollaboration = function() {};
SnapActions.isCollaborating = function() {
    return this.ide().room.getCurrentOccupants() > 1;
};

// Recording user actions
SnapActions.send = function(event) {
    // Netsblox addition: start
    var socket = this.ide().sockets;

    this._ws = socket.websocket;

    // Netsblox addition: end
    event.id = event.id || this.lastSeen + 1;
    this.lastSent = event.id;
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        // Netsblox addition: start
        this._ws.send(JSON.stringify({
            type: 'user-action',
            action: event
        }));
        // Netsblox addition: end
    }
    // Netsblox addition: start
    this.recordActionNB(event);

    return event;
    // Netsblox addition: end
};

SnapActions.onMessage = function(msg) {
    ActionManager.prototype.onMessage.apply(this, arguments);
    if (location.hash.indexOf('collaborate') !== -1) {
        location.hash = '';
    }
    if (msg.type === 'session-user-count') {
        this.sessionUsersCount = msg.value;
    }
};

SnapActions.recordActionNB = function(action) {
    var socket = this.ide().sockets,
        msg = {};

    // Record the action
    msg.type = 'record-action';
    msg.sessionId = this.__sessionId;
    msg.action = action;
    socket.sendMessage(msg);
};

SnapActions.loadProject = function() {
    var event;

    this.__sessionId = Date.now();

    // Send the project state
    event = ActionManager.prototype.loadProject.apply(this, arguments);
    this.recordActionNB(event);

    return event;
};

SnapActions._applyEvent = function(event) {
    try {
        return ActionManager.prototype._applyEvent.apply(this, arguments);
    } catch (e) {
        var msg = [
            '## Auto-report',
            'Error:',
            e.stack,
            '---',
            'Failing Event:',
            JSON.stringify(event, null, 2)
        ].join('\n');

        // Report the error!
        this.ide().submitBugReport(msg, true);
        throw e;
    }
};

SnapActions.applyEvent = function(event) {
    var ide = this.ide();
    if (ide.room.isEditable()) {
        event.user = this.id;
        event.id = event.id || this.lastSeen + 1;
        event.time = event.time || Date.now();

        // Skip duplicate undo/redo events
        if (event.replayType && this.lastSent === event.id) {
            return;
        }

        // if in replay mode, check that the event is a replay event
        var myself = this;

        if (ide.isReplayMode && !event.isReplay) {
            ide.promptExitReplay(function() {
            // Netsblox addition: start
                if (!myself.isCollaborating() || myself.isLeader) {
            // Netsblox addition: end
                    myself.acceptEvent(event);
                } else {
                    myself.send(event);
                }
            });
        } else {
            // Netsblox addition: start
            if (!this.isCollaborating() || this.isLeader) {
            // Netsblox addition: end
                this.acceptEvent(event);
            } else {
                this.send(event);
            }
        }

        return new Action(this, event);
    } else {
        // ask the user if he/she would like to request to be a collaborator
        // TODO: Add option for saving your own copy
        ide.confirm(
            'Edits cannot be made on projects by guests.\n\nWould ' +
            'you like to request to be made a collaborator?',
            'Request Collaborator Priviledges?',
            function () {
                ide.sockets.sendMessage({
                    type: 'permission-elevation-request',
                    guest: SnapCloud.username
                });
            }
        );
    }
};
