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
SnapActions.__connect = function() {
    var self = this;

    this._ws = new WebSocket(ActionManager.URL);
    this._ws.onclose = function() {
        setTimeout(self.__connect.bind(self), ActionManager.RECONNECT_INTERVAL);
    };
};
SnapActions.__connect();

SnapActions.send = function(json) {
    json.id = json.id || this.lastSeen + 1;
    this.lastSent = json.id;
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        var msg = {};
        msg.type = 'record-action';
        msg.sessionId = this.__sessionId;
        msg.action = json;
        this._ws.send(JSON.stringify(msg));
    }
};

SnapActions.loadProject = function() {
    this.__sessionId = Date.now();
    return ActionManager.prototype.loadProject.apply(this, arguments);
};
