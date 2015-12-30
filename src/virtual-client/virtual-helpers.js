/*globals InputFieldMorph,ToggleMorph,DialogBoxMorph,world,TextMorph,PushButtonMorph*/
// Helper functions for manipulating the NetsBlox UI
// These are loaded into the phantomjs browser during testing
var initHelpers = function (global) {
    'use strict';

    // Curried functions
    var isInstanceOf = function(type) {
        return function(element) {
            return element instanceof type;
        };
    };

    var hasLabel = function(txt) {
        return function(element) {
            return element.labelString === txt;
        };
    };

    // Extra utilities
    var extendOne = function(src, dst) {
        var keys = Object.keys(dst);
        for (var i = keys.length; i--;) {
            src[keys[i]] = dst[keys[i]];
        }
    };

    var extend = function(src) {
        var dsts = Array.prototype.slice.call(arguments, 1);
        for (var i = 0; i < dsts.length; i++) {
            extendOne(src, dsts[i]);
        }
    };

    var clickElement = function(item) {
        var pos = {};
        // populate the position
        ['x','y'].forEach(function(dim) {
            pos[dim] = (item.bounds.corner[dim]+item.bounds.corner[dim])/2;
        });
        item.mouseClickLeft(pos);
    };

    // Wrapper classes
    var WrappedMenu = function(menu) {
        this._element = menu;
        this.options = menu.items.map(function(item) {
            return item[0];
        });
    };

    WrappedMenu.prototype.click = function(name) {
        var item;
        for (var i = this._element.children.length; i--;) {
            item = this._element.children[i];
            if (item.labelString === name) {
                // Click the menu
                clickElement(item);
                return true;
            }
        }
        return false;
    };

    var WrappedDialogBox = function(dialog) {
        this._element = dialog;
        this.fields = this._element.allEntryFields()
            .map(WrappedDialogBox.getLabel);
    };

    /**
     * Recursive filter on elements
     *
     * @param {Function} fn
     * @param {Morph} element
     * @return {Boolean} passing
     */
    WrappedDialogBox.searchFor = function(fn, element) {
        var passing = [];
        if (fn(element)) {
            passing.push(element);
        }
        return element.children
                .reduce(function(prev, next) {
                    return prev.concat(WrappedDialogBox.searchFor(fn, next));
                }, passing);
    };

    WrappedDialogBox.prototype.getElements = function(fn) {
        return WrappedDialogBox.searchFor(fn, this._element);
    };

    /**
     * Click a button on the dialog box
     *
     * @param {String} name
     * @return {Boolean} result
     */
    WrappedDialogBox.prototype.click = function(name) {
        // Find the buttons
        var last,
            text,
            button;

        //len = world.children.length;
        //last = world.children[len-1];
        button = this.getElements(function(element) {
            return element instanceof PushButtonMorph && element.labelString === name;
        })[0];

        if (button) {
            clickElement(button);
            return true;
        }

        // If a new dialog box appears, return the text
        //len = world.children.length;
        //if (last !== world.children[len-1]) {  // Opened new box
            //text = world.children.filter(function(child) {
                //return child instanceof TextMorph;
            //});
            //return text
        //}
        return false;
    };

    /**
     * Fill in a text field with the given value
     *
     * @param {String} name
     * @param {String} value
     * @return {Boolean} success
     */
    WrappedDialogBox.prototype.fillIn = function(name, value) {
        var inputFields,
            labels,
            index;
            
        // Currently, it assumes that the label is the child immediately ahead
        // of the input field

        // Get all the input fields
        inputFields = this._element.allEntryFields();

        // Get the corresponding labels
        labels = inputFields.map(WrappedDialogBox.getLabel);

        // If label doesn't exist, return false
        index = this.fields.indexOf(name);
        if (index === -1) {
            return false;
        }

        // Else fill in the value and return true
        inputFields[index].text = value;
        return true;
    };

    /**
     * Get the label for the given text field
     *
     * @param {StringMorph} input
     * @return {String} label
     */
    WrappedDialogBox.getLabel = function(input) {
        // FIXME: This is not very sophisticated
        // Get the ancestor containing an InputFieldMorph
        var ancestor = input.parent,
            index;

        while (!WrappedDialogBox.containsMorphInstance(TextMorph, ancestor)) {
            input = ancestor;
            ancestor = input.parent || null;
        }

        if (ancestor === null) {
            return null;
        }

        // If it immediately precedes this container, return it's labelName
        index = ancestor.children.indexOf(input);
        if (ancestor.children[index-1] instanceof TextMorph) {
            return ancestor.children[index-1].text;
        }
        return null;
    };

    WrappedDialogBox.containsMorphInstance = function(morph, input) {
        return input.children.some(function(child) {
            return child instanceof morph;
        });
    };

    /**
     * Check a check box in the given dialog box
     *
     * @param {String} caption
     * @return {Boolean} success
     */
    WrappedDialogBox.prototype.check = function(caption) {
        var checkbox;
        
        checkbox = this.getElements(function(element) {
            return element instanceof ToggleMorph && element.captionString === caption;
        })[0];

        if (checkbox) {
            clickElement(checkbox);
            return true;
        }
        return false;
    };

    /**
     * Select from a dropdown menu
     *
     * @param {String} name
     * @param {String} value
     * @return {Boolean} success
     */
    WrappedDialogBox.prototype.select = function(name, value) {
        var dropdowns,
            dropdown,
            labels,
            index;

        dropdowns = this.getElements(function(element) {
            return element instanceof InputFieldMorph && element.choices;
        });
        labels = dropdowns.map(WrappedDialogBox.getLabel);
        index = labels.indexOf(name);
        if (index !== -1) {
            dropdown = dropdowns[index];
            if (dropdown.choices instanceof Array) {  // choices is an array
                dropdown.setChoice(value);
            } else {  // choices is an object
                dropdown.setChoice(dropdown.choices[value]);
            }
            return true;
        }
        return false;
    };

    //// TODO
    var WrappedProjectDialog = function(rawProjectDialog) {
        WrappedDialogBox.call(this, rawProjectDialog);
    };

    extend(WrappedProjectDialog.prototype, WrappedDialogBox.prototype);

    WrappedProjectDialog.prototype.getProjectList = function() {
        var elements = this.getElements(function(element) {
            return element instanceof MenuItemMorph;
        });
        return elements.map(function(element) {
            return element.labelString;
        });
    };

    WrappedProjectDialog.prototype.selectProject = function(projectName) {
        var project;

        project = detect(this.getElements(isInstanceOf(MenuItemMorph)),
            hasLabel(projectName));

        if (project) {
            clickElement(project);
            return true;
        }
        return false;
    };

    WrappedProjectDialog.prototype.open = function(project) {
        var valid = this.selectProject(project);

        if (valid) {
            this.click('  Open  ');
        }

        return valid;
    };

    WrappedProjectDialog.prototype.SOURCE = {
        CLOUD: 0,
        BROWSER: 1,
        EXAMPLES: 2
    };

    WrappedProjectDialog.prototype.setSource = function(index) {
        var srcButtons = this.getElements(isInstanceOf(ToggleButtonMorph));

        srcButtons[index].action.call(this._element);
    };

    // Functions
    var ide = world.children[0];
    var getButtonByAction = function(action) {
        var buttons = ide.controlBar.children;
        for (var i = buttons.length; i--;) {
            if (buttons[i].action === action) {
                return buttons[i];
            }
        }
        return null;
    };

    var getLastPopup = function() {
        var len = world.children.length;
        return world.children[len-1];
    };

    var getLastWrappedDialogBox = function() {
        var dialogBoxes = world.children.filter(function(child) {
            return child instanceof DialogBoxMorph;
        });
        return dialogBoxes[0] ? new WrappedDialogBox(dialogBoxes[0]) : null;
    };

    var TOOLBAR_BTNS = ['cloud', 'project', 'settings'];
    /*
     * Click the cloud button and return the dropdown morph
     *
     *@return {undefined}
     */
    var clickToolbarBtn = function(btnName) {
        if (TOOLBAR_BTNS.indexOf(btnName) === -1) {
            throw new Error('Button not found on toolbar');
        }
        ide[btnName + 'Menu']();  // Trigger menu popup
        var cloudButton = getButtonByAction('cloudMenu');
        return new WrappedMenu(getLastPopup());
    };

    var signInAs = function(username, password) {
        // Click the cloud dropdown
        var dropdown = clickToolbarBtn('cloud');

        // Click the Signup... button
        dropdown.click('Login...');

        // Fill in fields
        var signInBox = getLastWrappedDialogBox();
        signInBox.fillIn('User name:', username);
        signInBox.fillIn('Password:', password);
        return signInBox.click('  OK  ');
    };

    var openProject = function(projectName, callback) {
        var dropdown = clickToolbarBtn('project'),
            rawDialog,
            dialog;

        callback = callback || nop;
        dropdown.click('Open...');
        rawDialog = detect(world.children, isInstanceOf(ProjectDialogMorph));
        dialog = new WrappedProjectDialog(rawDialog);
        dialog.setSource(dialog.SOURCE.CLOUD);
        //dialog.setSource(dialog.SOURCE.EXAMPLES);

        // Wait to let the project list load...
        setTimeout(function() {
            dialog.open(projectName);
            callback(dialog);
        }, 1000);
        return dialog;
    };


    // Public API
    global.helpers = {
        clickToolbarBtn: clickToolbarBtn,
        getLastPopup: getLastPopup,
        getLastDialogBox: getLastWrappedDialogBox,

        // "Macro" helpers
        signInAs: signInAs,
        openProject: openProject
    };
};

if (typeof world !== 'undefined') {
    initHelpers(this);
}
