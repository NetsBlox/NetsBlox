// NetsBlox Specific Actions
SnapActions.addActions(
    'addMessageType',
    'deleteMessageType'
);

// TODO: Add actions for importing message types
ActionManager.prototype._deleteMessageType = function(name) {
    var fields = this.ide().stage.getMsgType(name).fields;
    return [name, fields];
};

ActionManager.prototype.onAddMessageType = function(name, fields) {
    this.ide().stage.addMessageType(msgType);
};

ActionManager.prototype.onDeleteMessageType = function(name) {
    this.ide().stage.deleteMessageType(msgType);
};

UndoManager.Invert.addMessageType = function(args) {
    return {
        type: 'deleteMessageType',
        args: [args[0].name]
    };
};

UndoManager.Invert.deleteMessageType = function(args) {
    return 'addMessageType';
};

