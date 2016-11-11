// NetsBlox Specific Actions
SnapActions.addActions(
    'addMessageType',
    'deleteMessageType'
);

// TODO: Add actions for importing message types
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
    var ide = this.ide()
    ide.stage.deleteMessageType(name);
    ide.flushBlocksCache('services');  //  b/c of inheritance
    ide.refreshPalette();
};

UndoManager.Invert.addMessageType = function(args) {
    return 'deleteMessageType';
};

UndoManager.Invert.deleteMessageType = function(args) {
    return 'addMessageType';
};

SnapActions._ws.close();  // FIXME: Enable collaboration
