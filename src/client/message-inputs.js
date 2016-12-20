/* global BlockMorph, StageMorph, ReporterBlockMorph
 CommandBlockMorph, SyntaxElementMorph, StructInputSlotMorph */


// MessageInputSlotMorph //////////////////////////////////////////////
// I am a dropdown menu with an associated message type
// InputSlotMorph inherits from ArgMorph:

MessageInputSlotMorph.prototype = new StructInputSlotMorph();
MessageInputSlotMorph.prototype.constructor = MessageInputSlotMorph;
MessageInputSlotMorph.uber = StructInputSlotMorph.prototype;

// MessageInputSlotMorph instance creation:
function MessageInputSlotMorph() {
    StructInputSlotMorph.call(this, null, false, 'messageTypesMenu', 'getMsgFields', true);
}

MessageInputSlotMorph.prototype.setContents = function(name, values, msgType) {
    if (msgType) {
        this.cachedMsgType = msgType;
    } else {
        this.cachedMsgType = null;
    }
    MessageInputSlotMorph.uber.setContents.call(this, name, values);
};

MessageInputSlotMorph.prototype.getMsgFields = function(name) {
    var block = this.parentThatIsA(BlockMorph),
        messageType = null,
        stage,
        fields;

    if (block && block.receiver()) {
        stage = block.receiver().parentThatIsA(StageMorph);
        messageType = stage.messageTypes.getMsgType(name);
        fields = messageType && messageType.fields;
    } else {
        fields = this.cachedMsgType && this.cachedMsgType.fields;
    }

    return fields || [];
};

var addStructReplaceSupport = function(fn) {
    return function(arg) {
        var structInput,
            structInputIndex = -1,
            inputs = this.inputs(),
            inputIndex = inputs.indexOf(arg),
            relIndex;

        // Check if 'arg' follows a MessageInputSlotMorph (these are a special case)
        for (var i = inputs.length; i--;) {
            if (inputs[i] instanceof StructInputSlotMorph) {
                structInputIndex = i;
                structInput = inputs[i];
            }
        }

        if (structInput && structInputIndex < inputIndex &&
            structInput.fields.length >= inputIndex - structInputIndex) {

            relIndex = inputIndex - structInputIndex - 1;
            var defaultArg = structInput.setDefaultFieldArg(relIndex);
            this.silentReplaceInput(arg, defaultArg);
            this.cachedInputs = null;
        } else {
            fn.apply(this, arguments);
        }
    };
};

ReporterBlockMorph.prototype.revertToDefaultInput =
    addStructReplaceSupport(ReporterBlockMorph.prototype.revertToDefaultInput);

CommandBlockMorph.prototype.revertToDefaultInput =
    addStructReplaceSupport(CommandBlockMorph.prototype.revertToDefaultInput);
