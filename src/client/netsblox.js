// Netsblox IDE (subclass of IDE_Morph)
NetsBloxMorph.prototype = new IDE_Morph();
NetsBloxMorph.prototype.constructor = NetsBloxMorph;
NetsBloxMorph.uber = IDE_Morph.prototype;

function NetsBloxMorph(isAutoFill) {
    this.init(isAutoFill);
}

NetsBloxMorph.prototype.init = function (isAutoFill) {
    // Create the websocket manager
    this.sockets = new WebSocketManager(this);
    this.table = null;

    // initialize inherited properties:
    NetsBloxMorph.uber.init.call(this, isAutoFill);
};

NetsBloxMorph.prototype.buildPanes = function () {
    this.createTable();
    NetsBloxMorph.uber.buildPanes.call(this);
};

NetsBloxMorph.prototype.resourceURL = function (folder, file) {
    return 'api/' + folder + '/' + file;
};

NetsBloxMorph.prototype.clearProject = NetsBloxMorph.uber.newProject;

NetsBloxMorph.prototype.newProject = function (projectName) {
    this.clearProject();

    // Get new table name
    this.sockets.sendMessage({
        type: 'create-table',
        table: 'Table ' + (Date.now() % 100),
        seat: projectName || 'mySeat'
    });
    if (projectName) {
        this.setProjectName(projectName || '');
    }
    this.createTable();
    this.selectSprite(this.stage.children[0]);
};

NetsBloxMorph.prototype.createTable = function() {
    this.table = new TableMorph(this);
};

// Creating the 'projects' view for the table
NetsBloxMorph.prototype.createSpriteEditor = function() {
    if (this.currentTab === 'table') {
        if (this.spriteEditor) {
            this.spriteEditor.destroy();
        }

        this.spriteEditor = new ProjectsMorph(this.table, this.sliderColor);
        this.spriteEditor.color = this.groupColor;
        this.add(this.spriteEditor);
    } else {
        NetsBloxMorph.uber.createSpriteEditor.call(this);
    }
};

NetsBloxMorph.prototype.setProjectName = function (string) {
    this.table.setSeatName(string);
};

NetsBloxMorph.prototype.silentSetProjectName = function (string) {
    return NetsBloxMorph.uber.setProjectName.call(this, string);
};

NetsBloxMorph.prototype.loadNextTable = function () {
    // Check if the table has diverged and optionally fork
    // TODO
    if (this.table.nextTable) {
        var next = this.table.nextTable;
        console.log('next is', next);
        this.table._name = next.tableName;  // silent set
        this.table.leaderId = next.leaderId;
        this.silentSetProjectName(next.seatId);

        // Send the message to the server
        this.sockets.updateTableInfo();

        this.table.nextTable = null;
    }
};

NetsBloxMorph.prototype.rawOpenCloudDataString = function (str) {
    var model;
    StageMorph.prototype.hiddenPrimitives = {};
    StageMorph.prototype.codeMappings = {};
    StageMorph.prototype.codeHeaders = {};
    StageMorph.prototype.enableCodeMapping = false;
    StageMorph.prototype.enableInheritance = false;
    if (Process.prototype.isCatchingErrors) {
        try {
            model = this.serializer.parse(str);
            this.serializer.loadMediaModel(model.childNamed('media'));
            this.serializer.openProject(
                this.serializer.loadProjectModel(
                    model.childNamed('project'),
                    this
                ),
                this
            );
            // Join the table
            this.loadNextTable();
        } catch (err) {
            this.showMessage('Load failed: ' + err);
        }
    } else {
        model = this.serializer.parse(str);
        this.serializer.loadMediaModel(model.childNamed('media'));
        this.serializer.openProject(
            this.serializer.loadProjectModel(
                model.childNamed('project'),
                this
            ),
            this
        );
    }
    this.stopFastTracking();
};

NetsBloxMorph.prototype.createSpriteBar = function () {
    // assumes that the categories pane has already been created
    var rotationStyleButtons = [],
        thumbSize = new Point(45, 45),
        nameField,
        padlock,
        thumbnail,
        tabCorner = 15,
        tabColors = this.tabColors,
        tabBar = new AlignmentMorph('row', -tabCorner * 2),
        tab,
        symbols = ['\u2192', '\u21BB', '\u2194'],
        labels = ['don\'t rotate', 'can rotate', 'only face left/right'],
        myself = this;

    if (this.spriteBar) {
        this.spriteBar.destroy();
    }

    this.spriteBar = new Morph();
    this.spriteBar.color = this.frameColor;
    this.add(this.spriteBar);

    function addRotationStyleButton(rotationStyle) {
        var colors = myself.rotationStyleColors,
            button;

        button = new ToggleButtonMorph(
            colors,
            myself, // the IDE is the target
            function () {
                if (myself.currentSprite instanceof SpriteMorph) {
                    myself.currentSprite.rotationStyle = rotationStyle;
                    myself.currentSprite.changed();
                    myself.currentSprite.drawNew();
                    myself.currentSprite.changed();
                }
                rotationStyleButtons.forEach(function (each) {
                    each.refresh();
                });
            },
            symbols[rotationStyle], // label
            function () {  // query
                return myself.currentSprite instanceof SpriteMorph
                    && myself.currentSprite.rotationStyle === rotationStyle;
            },
            null, // environment
            localize(labels[rotationStyle])
        );

        button.corner = 8;
        button.labelMinExtent = new Point(11, 11);
        button.padding = 0;
        button.labelShadowOffset = new Point(-1, -1);
        button.labelShadowColor = colors[1];
        button.labelColor = myself.buttonLabelColor;
        button.fixLayout();
        button.refresh();
        rotationStyleButtons.push(button);
        button.setPosition(myself.spriteBar.position().add(2));
        button.setTop(button.top()
            + ((rotationStyleButtons.length - 1) * (button.height() + 2))
            );
        myself.spriteBar.add(button);
        if (myself.currentSprite instanceof StageMorph) {
            button.hide();
        }
        return button;
    }

    addRotationStyleButton(1);
    addRotationStyleButton(2);
    addRotationStyleButton(0);
    this.rotationStyleButtons = rotationStyleButtons;

    thumbnail = new Morph();
    thumbnail.setExtent(thumbSize);
    thumbnail.image = this.currentSprite.thumbnail(thumbSize);
    thumbnail.setPosition(
        rotationStyleButtons[0].topRight().add(new Point(5, 3))
    );
    this.spriteBar.add(thumbnail);

    thumbnail.fps = 3;

    thumbnail.step = function () {
        if (thumbnail.version !== myself.currentSprite.version) {
            thumbnail.image = myself.currentSprite.thumbnail(thumbSize);
            thumbnail.changed();
            thumbnail.version = myself.currentSprite.version;
        }
    };

    nameField = new InputFieldMorph(this.currentSprite.name);
    nameField.setWidth(100); // fixed dimensions
    nameField.contrast = 90;
    nameField.setPosition(thumbnail.topRight().add(new Point(10, 3)));
    this.spriteBar.add(nameField);
    nameField.drawNew();
    nameField.accept = function () {
        var newName = nameField.getValue();
        myself.currentSprite.setName(
            myself.newSpriteName(newName, myself.currentSprite)
        );
        nameField.setContents(myself.currentSprite.name);
    };
    this.spriteBar.reactToEdit = nameField.accept;

    // padlock
    padlock = new ToggleMorph(
        'checkbox',
        null,
        function () {
            myself.currentSprite.isDraggable =
                !myself.currentSprite.isDraggable;
        },
        localize('draggable'),
        function () {
            return myself.currentSprite.isDraggable;
        }
    );
    padlock.label.isBold = false;
    padlock.label.setColor(this.buttonLabelColor);
    padlock.color = tabColors[2];
    padlock.highlightColor = tabColors[0];
    padlock.pressColor = tabColors[1];

    padlock.tick.shadowOffset = MorphicPreferences.isFlat ?
            new Point() : new Point(-1, -1);
    padlock.tick.shadowColor = new Color(); // black
    padlock.tick.color = this.buttonLabelColor;
    padlock.tick.isBold = false;
    padlock.tick.drawNew();

    padlock.setPosition(nameField.bottomLeft().add(2));
    padlock.drawNew();
    this.spriteBar.add(padlock);
    if (this.currentSprite instanceof StageMorph) {
        padlock.hide();
    }

    // tab bar
    tabBar.tabTo = function (tabString) {
        var active;
        myself.currentTab = tabString;
        this.children.forEach(function (each) {
            each.refresh();
            if (each.state) {active = each; }
        });
        active.refresh(); // needed when programmatically tabbing
        myself.createSpriteEditor();
        myself.fixLayout('tabEditor');
    };

    tab = new TabMorph(
        tabColors,
        null, // target
        function () {tabBar.tabTo('scripts'); },
        localize('Scripts'), // label
        function () {  // query
            return myself.currentTab === 'scripts';
        }
    );
    tab.padding = 3;
    tab.corner = tabCorner;
    tab.edge = 1;
    tab.labelShadowOffset = new Point(-1, -1);
    tab.labelShadowColor = tabColors[1];
    tab.labelColor = this.buttonLabelColor;
    tab.drawNew();
    tab.fixLayout();
    tabBar.add(tab);

    tab = new TabMorph(
        tabColors,
        null, // target
        function () {tabBar.tabTo('costumes'); },
        localize('Costumes'), // label
        function () {  // query
            return myself.currentTab === 'costumes';
        }
    );
    tab.padding = 3;
    tab.corner = tabCorner;
    tab.edge = 1;
    tab.labelShadowOffset = new Point(-1, -1);
    tab.labelShadowColor = tabColors[1];
    tab.labelColor = this.buttonLabelColor;
    tab.drawNew();
    tab.fixLayout();
    tabBar.add(tab);

    tab = new TabMorph(
        tabColors,
        null, // target
        function () {tabBar.tabTo('sounds'); },
        localize('Sounds'), // label
        function () {  // query
            return myself.currentTab === 'sounds';
        }
    );
    tab.padding = 3;
    tab.corner = tabCorner;
    tab.edge = 1;
    tab.labelShadowOffset = new Point(-1, -1);
    tab.labelShadowColor = tabColors[1];
    tab.labelColor = this.buttonLabelColor;
    tab.drawNew();
    tab.fixLayout();
    tabBar.add(tab);

    tab = new TabMorph(
        tabColors,
        null, // target
        function () {tabBar.tabTo('table'); },
        localize('Table'), // label
        function () {  // query
            return myself.currentTab === 'table';
        }
    );
    tab.padding = 3;
    tab.corner = tabCorner;
    tab.edge = 1;
    tab.labelShadowOffset = new Point(-1, -1);
    tab.labelShadowColor = tabColors[1];
    tab.labelColor = this.buttonLabelColor;
    tab.drawNew();
    tab.fixLayout();
    tabBar.add(tab);

    tabBar.fixLayout();
    tabBar.children.forEach(function (each) {
        each.refresh();
    });
    this.spriteBar.tabBar = tabBar;
    this.spriteBar.add(this.spriteBar.tabBar);

    this.spriteBar.fixLayout = function () {
        this.tabBar.setLeft(this.left());
        this.tabBar.setBottom(this.bottom());
    };
};
