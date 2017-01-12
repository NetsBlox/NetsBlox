/* globals UndoManager, ActionManager, SnapActions, NetsBloxSerializer,
   HintInputSlotMorph */
// NetsBlox Specific Actions
SnapActions.addActions(
    'addMessageType',
    'deleteMessageType'
);

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
};

ActionManager.prototype.onDeleteMessageType = function(name) {
    var ide = this.ide();
    ide.stage.deleteMessageType(name);
    ide.flushBlocksCache('services');  //  b/c of inheritance
    ide.refreshPalette();
};

UndoManager.Invert.addMessageType = function() {
    return 'deleteMessageType';
};

UndoManager.Invert.deleteMessageType = function() {
    return 'addMessageType';
};

SnapActions.supportsCollaboration = false;

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

SnapActions.serializer = new NetsBloxSerializer();
SnapActions.__sessionId = Date.now();

// Recording user actions
SnapActions.send = function(json) {
    var socket = this.ide().sockets,
        msg = {};

    json.id = json.id || this.lastSeen + 1;
    this.lastSent = json.id;

    msg.type = 'record-action';
    msg.sessionId = this.__sessionId;
    msg.action = json;
    socket.sendMessage(msg);
};

SnapActions.loadProject = function() {
    var event;

    this.__sessionId = Date.now();

    // Send the project state
    event = ActionManager.prototype.loadProject.apply(this, arguments);
    this.send(event);

    return event;
};

SnapActions._applyEvent = function() {
    try {
        return ActionManager.prototype._applyEvent.apply(this, arguments);
    } catch (e) {
        // Report the error!
        this.ide().submitBugReport('Auto-report:\n' + e.stack, true);
        throw e;
    }
};
