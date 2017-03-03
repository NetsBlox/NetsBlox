/* globals UndoManager, ActionManager, SnapActions, NetsBloxSerializer,
   HintInputSlotMorph */
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
SnapActions.enableCollaboration = function() {};

// Recording user actions
SnapActions.send = function(json) {
    var socket = this.ide().sockets,
        msg = {},
        result;

    this._ws = socket.websocket;
    result = ActionManager.prototype.send.apply(this, arguments);

    this.recordActionNB(result);

    return result;
};

SnapActions.onMessage = function(msg) {
    console.log('msg:', msg);
    return ActionManager.prototype.onMessage.call(this, msg);
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
