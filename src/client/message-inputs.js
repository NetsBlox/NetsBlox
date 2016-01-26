// MessageInputSlotMorph //////////////////////////////////////////////
// I am a dropdown menu with an associated message type
// InputSlotMorph inherits from ArgMorph:

MessageInputSlotMorph.prototype = new InputSlotMorph();
MessageInputSlotMorph.prototype.constructor = MessageInputSlotMorph;
MessageInputSlotMorph.uber = InputSlotMorph.prototype;

// MessageInputSlotMorph preferences settings:

MessageInputSlotMorph.prototype.executeOnSliderEdit = false;

// MessageInputSlotMorph instance creation:

function MessageInputSlotMorph() {
    // When dropdown changes, the input morph should be updated
    this.msgFields = [];
    this._msgContent = [];

    // Create the dropdown menu
    InputSlotMorph.call(this, null, false, 'messageTypesMenu', true);
    this.isStatic = true;
}

MessageInputSlotMorph.prototype.setContents = function(messageType, inputs) {
    var self = this,
        targetSeat = inputs && inputs.pop ? inputs.pop() : '',
        targetDropdown,
        len;

    // Set the value for the dropdown
    InputSlotMorph.prototype.setContents.call(this, messageType);

    // Create the message fields
    this._updateMessage(messageType, function() {
        if (self.parent) {
            self._updateFields(inputs);
        }
    });

    // Set the target
    if (targetSeat) {
        len = this.parent.inputs().length;
        targetDropdown = this.parent.inputs()[len-1];
        targetDropdown.setContents(targetSeat);
    }
};

MessageInputSlotMorph.prototype._updateMessage = function(name, cb) {
    // Get the message type
    var messageType = this._getMsgType();

    this.msgFields = [];
    if (name) {
        if (!messageType) {  // the message types are being retrieved from the server... waiting
            return setTimeout(this._updateMessage.bind(this, name, cb), 100);
        }
        this.msgFields = messageType.fields;
    }
    cb();
};

MessageInputSlotMorph.prototype._updateFields = function(values) {
    // Remove the old message fields (parent's inputs)
    var children = this.parent.children,
        myIndex = children.indexOf(this),
        i = this._msgContent.length + myIndex + 1,
        input = children[--i],
        removed = [],
        scripts = this.parentThatIsA(ScriptsMorph);

    // Remove the "i" fields after the current morph
    while (i-- > myIndex) {
        removed.push(input);
        this.parent.removeChild(input);
        input = children[i];
    }

    if (scripts) {
        removed
            .filter(function(arg) {
                return arg instanceof BlockMorph;
            })
            .forEach(scripts.add.bind(scripts));
    }

    // Create new message fields
    this._msgContent = [];
    values = values || [];
    for (i = 0; i < this.msgFields.length; i++) {
        this._msgContent.push(this._updateField(this.msgFields[i], values[i]));
    }
    this.fixLayout();
    this.drawNew();
};

MessageInputSlotMorph.prototype.setDefaultFieldArg = function(index) {
    // Reset the field and return it
    var isMessageField = index < this.msgFields.length,
        oldArg,
        arg;

    if (isMessageField) {
        arg = this._msgContent[index] = this._getFieldValue(this.msgFields[index]);

        index++;
        oldArg = this.parent.inputs()[index];

        index = this.parent.children.indexOf(oldArg);
        this.parent.children.splice(index, 1, arg);
        arg.parent = this.parent;
    } else {  // recipient field
        var specIndex,
            spec;

        index++;
        specIndex = index - this.msgFields.length;
        spec = this.parent.blockSpec.split(' ')
            .filter(function(spec) {
                return spec[0] === '%';
            })[specIndex];
        arg = this.labelPart(spec);

        oldArg = this.parent.inputs()[index];

        index = this.parent.children.indexOf(oldArg);
        this.parent.children.splice(index, 1, arg);
        arg.parent = this.parent;
    }

    arg.drawNew();
    arg.fixLayout();
    arg.drawNew();

    this.parent.drawNew();
    this.parent.fixLayout();
    this.parent.drawNew();

    return arg;
};

MessageInputSlotMorph.prototype._getFieldValue = function(field, value) {
    // Input slot is empty or has a string
    if (!value || typeof value === 'string') {
        var result = new HintInputSlotMorph(value || '', field);
        return result;
    }

    return value;  // The input slot is occupied by another block
};

MessageInputSlotMorph.prototype._updateField = function(field, value) {
    // Create the input slot w/ greyed out text
    // Value is either:
    // + scripts
    // + blocks
    // + values
    // + colors
    // + undefined
    // + string

    // Add the fields at the correct place wrt the current morph
    var index = this.parent.children.indexOf(this) + this.msgFields.indexOf(field) + 1,
        result = this._getFieldValue(field, value);

    this.parent.children.splice(index, 0, result);
    result.parent = this.parent;

    return value;
};

MessageInputSlotMorph.prototype._getMsgType = function() {
    var name = this.contents().text || null,
        block = this.parentThatIsA(BlockMorph),
        stage,
        messageType = null;

    if (block && block.receiver()) {
        stage = block.receiver().parentThatIsA(StageMorph);
        messageType = stage.messageTypes.getMsgType(name);
    }
    return messageType;
};

// HintInputSlotMorph //////////////////////////////////////////////
// I am an input slot with greyed out hint text when I am empty

HintInputSlotMorph.prototype = new InputSlotMorph();
HintInputSlotMorph.prototype.constructor = HintInputSlotMorph;
HintInputSlotMorph.uber = InputSlotMorph.prototype;

function HintInputSlotMorph(text, hint, isNumeric) {
    var self = this; this.hintText = hint;
    this.empty = true;
    InputSlotMorph.call(this, text, isNumeric);

    // If the StringMorph gets clicked on when empty, the hint text
    // should be "ghostly"
    this.contents().mouseDownLeft = function() {
        if (self.empty) {
            this.text = '';
        }
        StringMorph.prototype.mouseDownLeft.apply(this, arguments);
    };
}

HintInputSlotMorph.prototype.evaluate = function() {
    if (this.empty) {  // ignore grey text
        return this.isNumeric ? 0 : '';
    }
    return InputSlotMorph.prototype.evaluate.call(this);
};

HintInputSlotMorph.prototype.setContents = function(value) {
    var color = new Color(0, 0, 0),
        contents = this.contents();

    // If empty, set to the hint text
    InputSlotMorph.prototype.setContents.apply(this, arguments);
    this.empty = value === '';
    if (this.empty) {  // Set the contents to the hint text
        // Set the text to the hint text
        contents.text = this.hintText;
        color = new Color(100, 100, 100);
    }
    contents.color = color;
    contents.drawNew();
};

// Check if the given morph has been changed
HintInputSlotMorph.prototype.changed = function() {
    var txtMorph = this.contents();
    if (txtMorph) {
        this.empty = txtMorph.text === this.hintText;
    }
    return InputSlotMorph.prototype.changed.call(this);
};

/**
 * Overrides the SyntaxElementMorph implementation to check if the 
 * block contains a MessageInputSlotMorph. If so, the default block
 * is retrieved from the MessageInputSlotMorph. Otherwise, it simply
 * calls the original implementation (chain of responsibility pattern).
 *
 * @override 
 * @param arg
 * @param noValues
 * @return {undefined}
 */
CommandBlockMorph.prototype.revertToDefaultInput = function (arg, noValues) {
    var messageInput,
        messageInputIndex = -1,
        inputs = this.inputs(),
        inputIndex = inputs.indexOf(arg),
        relIndex;

    // Check if 'arg' follows a MessageInputSlotMorph (these are a special case)
    for (var i = inputs.length; i--;) {
        if (inputs[i] instanceof MessageInputSlotMorph) {
            messageInputIndex = i;
            messageInput = inputs[i];
        }
    }

    if (messageInput && messageInputIndex < inputIndex) {
        relIndex = inputIndex - messageInputIndex - 1;
        var defaultArg = messageInput.setDefaultFieldArg(relIndex);
        this.silentReplaceInput(arg, defaultArg);
        this.cachedInputs = null;
    } else {
        // Else, call SyntaxElementMorph.prototype.revertToDefaultInput
        SyntaxElementMorph.prototype.revertToDefaultInput.apply(this, arguments);
    }
};

