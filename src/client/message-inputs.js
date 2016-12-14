/* global StringMorph, Color, InputSlotMorph, ScriptsMorph, BlockMorph, StageMorph,
 CommandBlockMorph, SyntaxElementMorph, nop*/

// I should refactor the MessageInputSlotMorph to a generic base class. This
// base class should be a dropdown which dynamically inserts input fields (w/
// hint text) after itself
StructInputSlotMorph.prototype = new InputSlotMorph();
StructInputSlotMorph.prototype.constructor = StructInputSlotMorph;
StructInputSlotMorph.uber = InputSlotMorph.prototype;

// StructInputSlotMorph preferences settings:

StructInputSlotMorph.prototype.executeOnSliderEdit = false;

// This should be converted into a container for an inputslotmorph and the inputfields
// (not reaching through the parent to edit things)
// TODO
function StructInputSlotMorph(
    value,
    isNumeric,
    choiceDict,
    fieldValues,
    isReadOnly
) {
    this.fields = [];
    this.fieldContent = [];
    this.getFieldNames = typeof fieldValues === 'string' ? this[fieldValues] : fieldValues || nop;

    InputSlotMorph.call(this, value, isNumeric, choiceDict, isReadOnly);
    this.isStatic = true;
}

StructInputSlotMorph.prototype.setContents = function(name, values) {
    // Set the value for the dropdown
    InputSlotMorph.prototype.setContents.call(this, name);

    if (this.parent) {  // update fields
        var children = this.parent.children,
            myIndex = children.indexOf(this),
            currentFields = this.fields,
            i = currentFields.length + myIndex + 1,
            input = children[--i],
            removed = [],
            scripts = this.parentThatIsA(ScriptsMorph);

        // Remove the "i" fields after the current morph
        while (i-- > myIndex) {
            removed.push(input);
            this.parent.removeChild(input);
            input = children[i];
        }
        this.fields = this.getFieldNames(name);

        if (scripts) {
            removed
                .filter(function(arg) {
                    return arg instanceof BlockMorph;
                })
                .forEach(scripts.add.bind(scripts));
        }

        // Create new struct fields
        values = values || [];
        this.fieldContent = [];
        for (i = 0; i < this.fields.length; i++) {
            this.fieldContent.push(this.updateField(this.fields[i], values[i]));
        }
        this.fixLayout();
        this.drawNew();
        this.parent.cachedInputs = null;
        this.parent.fixLayout();
        this.parent.changed();
    }
};

StructInputSlotMorph.prototype.getFieldValue = function(fieldname, value) {
    // Input slot is empty or has a string
    if (!value || typeof value === 'string') {
        var result = new HintInputSlotMorph(value || '', fieldname);
        return result;
    }

    return value;  // The input slot is occupied by another block
};

StructInputSlotMorph.prototype.setDefaultFieldArg = function(index) {
    // Reset the field and return it
    var isStructField = index < this.fields.length,
        oldArg,
        arg;

    if (isStructField) {
        arg = this.fieldContent[index] = this.getFieldValue(this.fields[index]);

        index++;
        oldArg = this.parent.inputs()[index];

        index = this.parent.children.indexOf(oldArg);
        this.parent.children.splice(index, 1, arg);
        arg.parent = this.parent;
    } else {  // recipient field
        var specIndex,
            spec;

        index++;
        specIndex = index - this.fields.length;
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


StructInputSlotMorph.prototype.updateField = function(field, value) {
    // Create the input slot w/ greyed out text
    // Value is either:
    // + scripts
    // + blocks
    // + values
    // + colors
    // + undefined
    // + string

    // Add the fields at the correct place wrt the current morph
    var index = this.parent.children.indexOf(this) + this.fields.indexOf(field) + 1,
        result = this.getFieldValue(field, value);

    this.parent.children.splice(index, 0, result);
    result.parent = this.parent;

    return result;
};


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

// HintInputSlotMorph //////////////////////////////////////////////
// I am an input slot with greyed out hint text when I am empty

HintInputSlotMorph.prototype = new InputSlotMorph();
HintInputSlotMorph.prototype.constructor = HintInputSlotMorph;
HintInputSlotMorph.uber = InputSlotMorph.prototype;

function HintInputSlotMorph(text, hint, isNumeric) {
    var self = this;

    this.hintText = hint;
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
 * @return {undefined}
 */
CommandBlockMorph.prototype.revertToDefaultInput = function (arg) {
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

    // TODO: Check the length :(
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

