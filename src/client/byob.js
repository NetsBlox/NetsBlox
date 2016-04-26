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


