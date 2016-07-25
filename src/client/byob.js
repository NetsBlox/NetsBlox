InputSlotDialogMorph.prototype.init = function (
    fragment,
    target,
    action,
    environment,
    category
) {
    var scale = SyntaxElementMorph.prototype.scale,
        fh = fontHeight(10) / 1.2 * scale; // "raw height"

    // additional properties:
    this.fragment = fragment || new BlockLabelFragment();
    this.textfield = null;
    this.types = null;
    this.slots = null;
    this.isExpanded = false;
    this.category = category || 'other';
    this.cachedRadioButton = null; // "template" for radio button backgrounds

    // initialize inherited properties:
    BlockDialogMorph.uber.init.call(
        this,
        target,
        action,
        environment
    );

    // override inherited properites:
    this.types = new AlignmentMorph('row', this.padding);
    this.types.respectHiddens = true; // prevent the arrow from flipping
    this.add(this.types);
    this.slots = new BoxMorph();
    this.slots.color = new Color(55, 55, 55); // same as palette
    this.slots.borderColor = this.slots.color.lighter(50);
    // NetsBlox addition: start
    this.slots.setExtent(new Point((fh + 10) * 24, (fh + 10 * scale) * 11.4));
    // NetsBlox addition: end
    this.add(this.slots);
    this.createSlotTypeButtons();
    this.fixSlotsLayout();
    this.addSlotsMenu();
    this.createTypeButtons();
    this.fixLayout();
};

InputSlotDialogMorph.prototype.fixSlotsLayout = function () {
    var slots = this.slots,
        scale = SyntaxElementMorph.prototype.scale,
        xPadding = 10 * scale,
        ypadding = 14 * scale,
        bh = (fontHeight(10) / 1.2 + 15) * scale, // slot type button height
        ah = (fontHeight(10) / 1.2 + 10) * scale, // arity button height
        size = 12, // number slot type radio buttons
        cols = [
            slots.left() + xPadding,
            slots.left() + slots.width() / 3,
            slots.left() + slots.width() * 2 / 3
        ],
        rows = [
            slots.top() + ypadding,
            slots.top() + ypadding + bh,
            slots.top() + ypadding + bh * 2,
            slots.top() + ypadding + bh * 3,
            slots.top() + ypadding + bh * 4,
            slots.top() + ypadding + bh * 5,

            slots.top() + ypadding + bh * 5 + ah,
            slots.top() + ypadding + bh * 5 + ah * 2,
            // Netsblox additions: start
            slots.top() + ypadding + bh * 5 + ah * 3
            // Netsblox additions: end
        ],
        idx,
        row = -1,
        col,
        oldFlag = Morph.prototype.trackChanges;

    Morph.prototype.trackChanges = false;

    // slot types:

    for (idx = 0; idx < size; idx += 1) {
        col = idx % 3;
        if (idx % 3 === 0) {row += 1; }
        slots.children[idx].setPosition(new Point(
            cols[col],
            rows[row]
        ));
    }

    // arity:

    col = 0;
    row = 5;
    // Netsblox additions: start
    for (idx = size; idx < size + 4; idx += 1) {
    // Netsblox additions: end
        slots.children[idx].setPosition(new Point(
            cols[col],
            rows[row + idx - size]
        ));
    }

    // default input

    this.slots.defaultInputLabel.setPosition(
        this.slots.radioButtonSingle.label.topRight().add(new Point(5, 0))
    );
    this.slots.defaultInputField.setCenter(
        this.slots.defaultInputLabel.center().add(new Point(
            this.slots.defaultInputField.width() / 2
                + this.slots.defaultInputLabel.width() / 2 + 5,
            0
        ))
    );
    Morph.prototype.trackChanges = oldFlag;
    this.slots.changed();
};

BlockLabelFragment.prototype.setToSingleInput = function () {
    if (!this.type) {return null; } // not an input at all
    // NetsBlox addition: start
    if (this.type === '%upvar' || this.type === '%msgType') {
    // NetsBlox addition: end
        this.type = '%s';
    } else {
        this.type = this.singleInputType();
    }
};

BlockLabelFragment.prototype.setToMultipleInput = function () {
    if (!this.type) {return null; } // not an input at all
    // NetsBlox addition: start
    if (this.type === '%upvar' || this.type === '%msgType') {
    // NetsBlox addition: end
        this.type = '%s';
    }
    this.type = '%mult'.concat(this.singleInputType());
};

BlockLabelFragment.prototype.isSingleInput = function () {
    return !this.isMultipleInput() &&
        (this.type !== '%upvar') && (this.type !== '%msgType');
};

InputSlotDialogMorph.prototype.setSlotArity = function (arity) {
    if (arity === 'single') {
        this.fragment.setToSingleInput();
    } else if (arity === 'message') {
        this.fragment.type = '%msgType';
    } else if (arity === 'multiple') {
        this.fragment.setToMultipleInput();
    } else if (arity === 'upvar') {
        this.fragment.setToUpvar();
        // hide other options - under construction
    }
    this.slots.children.forEach(function (c) {
        c.refresh();
    });
    this.edit();
};

InputSlotDialogMorph.prototype.createSlotTypeButtons = function () {
    // populate my 'slots' area with radio buttons, labels and input fields
    var myself = this, defLabel, defInput,
        oldFlag = Morph.prototype.trackChanges;

    Morph.prototype.trackChanges = false;

    // slot types
    this.addSlotTypeButton('Object', '%obj');
    this.addSlotTypeButton('Text', '%txt');
    this.addSlotTypeButton('List', '%l');
    this.addSlotTypeButton('Number', '%n');
    this.addSlotTypeButton('Any type', '%s');
    this.addSlotTypeButton('Boolean (T/F)', '%b');
    this.addSlotTypeButton('Command\n(inline)', '%cmdRing'); //'%cmd');
    this.addSlotTypeButton('Reporter', '%repRing'); //'%r');
    this.addSlotTypeButton('Predicate', '%predRing'); //'%p');
    this.addSlotTypeButton('Command\n(C-shape)', '%cs');
    this.addSlotTypeButton('Any\n(unevaluated)', '%anyUE');
    this.addSlotTypeButton('Boolean\n(unevaluated)', '%boolUE');

    // arity and upvars
    this.slots.radioButtonSingle = this.addSlotArityButton(
        function () {
            myself.setSlotArity('single');
        },
        "Single input.",
        function () {
            return myself.fragment.isSingleInput();
        }
    );
    // NetsBlox addition: start
    this.addSlotArityButton(
        function () { myself.setSlotArity('message');},
        "Message Type",
        function () {
            return myself.fragment.type === '%msgType';
        }
    );
    // NetsBlox addition: end

    this.addSlotArityButton(
        function () {myself.setSlotArity('multiple'); },
        "Multiple inputs (value is list of inputs)",
        function () {return myself.fragment.isMultipleInput(); }
    );
    this.addSlotArityButton(
        function () {myself.setSlotArity('upvar'); },
        "Upvar - make internal variable visible to caller",
        function () {return myself.fragment.isUpvar(); }
    );

    // default values
    defLabel = new StringMorph(localize('Default Value:'));
    defLabel.fontSize = this.slots.radioButtonSingle.fontSize;
    defLabel.setColor(new Color(255, 255, 255));
    defLabel.refresh = function () {
        if (myself.isExpanded && contains(
                ['%s', '%n', '%txt', '%anyUE'],
                myself.fragment.type
            )) {
            defLabel.show();
        } else {
            defLabel.hide();
        }
    };
    this.slots.defaultInputLabel = defLabel;
    this.slots.add(defLabel);

    defInput = new InputFieldMorph(this.fragment.defaultValue);
    defInput.contents().fontSize = defLabel.fontSize;
    defInput.contrast = 90;
    defInput.contents().drawNew();
    defInput.setWidth(50);
    defInput.refresh = function () {
        if (defLabel.isVisible) {
            defInput.show();
            if (myself.fragment.type === '%n') {
                defInput.setIsNumeric(true);
            } else {
                defInput.setIsNumeric(false);
            }
        } else {
            defInput.hide();
        }
    };
    this.slots.defaultInputField = defInput;
    this.slots.add(defInput);
    defInput.drawNew();

    Morph.prototype.trackChanges = oldFlag;
};

////////////////////////////////////////////////////
// Override submodule for exporting of message types
////////////////////////////////////////////////////

// BlockExportDialogMorph inherits from DialogBoxMorph:

BlockExportDialogMorph.prototype = new DialogBoxMorph();
BlockExportDialogMorph.prototype.constructor = BlockExportDialogMorph;
BlockExportDialogMorph.uber = DialogBoxMorph.prototype;

// BlockExportDialogMorph instance creation:

function BlockExportDialogMorph(serializer, blocks, stage) {
    this.init(serializer, blocks, stage);
}

BlockExportDialogMorph.prototype.init = function (serializer, blocks, stage) {
    var myself = this;

    // additional properties:
    this.serializer = serializer;
    this.blocks = blocks.slice(0);
    this.handle = null;

    // initialize inherited properties:
    BlockExportDialogMorph.uber.init.call(
        this,
        null, // target
        function () {myself.exportBlocks(stage); },
        null // environment
    );

    // override inherited properites:
    this.labelString = 'Export blocks / message types';
    this.createLabel();

    // build contents
    this.buildContents(stage);
};

BlockExportDialogMorph.prototype.buildContents = function (stage) {
    var palette, x, y, block, checkBox, lastCat,
        myself = this,
        padding = 4;
    this.msgs = [];

    // create plaette
    palette = new ScrollFrameMorph(
        null,
        null,
        SpriteMorph.prototype.sliderColor
    );
    palette.color = SpriteMorph.prototype.paletteColor;
    palette.padding = padding;
    palette.isDraggable = false;
    palette.acceptsDrops = false;
    palette.contents.acceptsDrops = false;

    // populate palette
    x = palette.left() + padding;
    y = palette.top() + padding;
    // custom blocks first...
    SpriteMorph.prototype.categories.forEach(function (category) {
        myself.blocks.forEach(function (definition) {
            if (definition.category === category) {
                if (lastCat && (category !== lastCat)) {
                    y += padding;
                }
                lastCat = category;
                block = definition.templateInstance();
                checkBox = new ToggleMorph(
                    'checkbox',
                    myself,
                    function () {
                        var idx = myself.blocks.indexOf(definition);
                        if (idx > -1) {
                            myself.blocks.splice(idx, 1);
                        } else {
                            myself.blocks.push(definition);
                        }
                    },
                    null,
                    function () {
                        return contains(
                            myself.blocks,
                            definition
                        );
                    },
                    null,
                    null,
                    null,
                    block.fullImage()
                );
                checkBox.setPosition(new Point(
                    x,
                    y + (checkBox.top() - checkBox.toggleElement.top())
                ));
                palette.addContents(checkBox);
                y += checkBox.fullBounds().height() + padding;
            }
        });
    });


    // ...custom message types second
    for (var i = 0; i < stage.deletableMessageNames().length; i++) {
        // assume that the user wants to export ALL message types at first
        var msg = new ReporterBlockMorph();
        msg.setSpec(stage.deletableMessageNames()[i]);
        msg.setColor(new Color(217,77,17));
        this.msgs.push(msg);
    }

    this.msgs.forEach(function (msg) {
        checkBox = new ToggleMorph(
            'checkbox',
            this,
            function() {
               if (this.msgs.includes(msg)) {
                    this.msgs.splice(this.msgs.indexOf(msg), 1);
               } else {
                    this.msgs.push(msg);
               }
            },
            null,
            function() {
                return this.msgs.includes(msg);
            },
            null,
            null,
            null,
            msg.fullImage()
        );
        checkBox.setPosition(new Point(
            x,
            y + (checkBox.top() - checkBox.toggleElement.top())
            ));
        palette.addContents(checkBox);
        y += checkBox.fullBounds().height() + padding;
    }.bind(this));

    palette.scrollX(padding);
    palette.scrollY(padding);
    this.addBody(palette);

    this.addButton('ok', 'OK');
    this.addButton('cancel', 'Cancel');

    this.setExtent(new Point(220, 300));
    this.fixLayout();
};

// BlockExportDialogMorph ops

BlockExportDialogMorph.prototype.exportBlocks = function (stage) {
    var str = this.serializer.serialize(this.blocks),
        ide = this.world().children[0],
        msgs = '';

    // Use JSON to serialize message types
    for (var i = 0; i < this.msgs.length; i++) {
        msgs = msgs + '<block-definition s=\'' + JSON.stringify((stage.messageTypes.getMsgType(this.msgs[i].blockSpec))) + '\' category=\'msg\'/>' ;
    }

    if (this.blocks.length > 0 || this.msgs.length > 0) {
        str = '<blocks app="'
            + this.serializer.app
            + '" version="'
            + this.serializer.version
            + '">'
            + str
            + msgs
            + '</blocks>';
        ide.saveXMLAs(
            str,
            ide.projectName || localize('Untitled') + ' ' + localize('blocks')
        );
    } else {
        new DialogBoxMorph().inform(
            'Export blocks / message types',
            'no blocks or message types were selected',
            this.world()
        );
    }
};

// BlockExportDialogMorph layout

BlockExportDialogMorph.prototype.fixLayout
    = BlockEditorMorph.prototype.fixLayout;

// BlockImportDialogMorph ops

BlockImportDialogMorph.prototype.importBlocks = function (name) {
    var ide = this.target.parentThatIsA(IDE_Morph);
    if (!ide) {return; }
    if (this.blocks.length > 0) {
        this.blocks.forEach(function (def) {
            // Message type import
            if (def.category === 'msg') {
                ide.stage.addMessageType(JSON.parse(def.spec));
            } else {  // Block import
                def.receiver = ide.stage;
                ide.stage.globalBlocks.push(def);
                ide.stage.replaceDoubleDefinitionsFor(def);
            }
        });
        ide.flushPaletteCache();
        ide.refreshPalette();
        ide.showMessage(
            'Imported Blocks / Message Types Module' + (name ? ': ' + name : '') + '.',
            2
        );
    } else {
        new DialogBoxMorph().inform(
            'Import blocks/msg types',
            'no blocks or message types were selected',
            this.world()
        );
    }
};