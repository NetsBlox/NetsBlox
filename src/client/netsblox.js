/* global RoomMorph, IDE_Morph, StageMorph, List, SnapCloud, VariableFrame,
   WebSocketManager, SpriteMorph, Point, ProjectsMorph, localize, Process,
   Morph, AlignmentMorph, ToggleButtonMorph, StringMorph, Color, TabMorph,
   InputFieldMorph, MorphicPreferences, ToggleMorph, MenuMorph, TextMorph
   NetsBloxSerializer, nop, SnapActions, DialogBoxMorph, hex_sha512, SnapUndo,
   ScrollFrameMorph, SnapUndo*/
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
    this.room = null;

    // initialize inherited properties:
    NetsBloxMorph.uber.init.call(this, isAutoFill);
    this.serializer = new NetsBloxSerializer();
};

NetsBloxMorph.prototype.buildPanes = function () {
    this.createRoom();
    NetsBloxMorph.uber.buildPanes.call(this);
};

NetsBloxMorph.prototype.resourceURL = function () {
    return 'api/' + IDE_Morph.prototype.resourceURL.apply(this, arguments);
};

NetsBloxMorph.prototype.parseResourceFile = function (text) {
    // A Resource File lists all the files that could be loaded in a submenu
    // Examples are libraries/LIBRARIES, Costumes/COSTUMES, etc
    // The file format is tab-delimited, with unix newlines:
    // file-name, Display Name, Help Text (optional)
    var parts,
        items = [];

    text.split('\n').map(function (line) {
        return line.trim();
    }).filter(function (line) {
        return line.length > 0;
    }).forEach(function (line) {
        parts = line.split('\t').map(function (str) { return str.trim(); });

        if (parts.length < 2) {return; }

        items.push({
            fileName: parts[0],
            name: parts[1],
            // NetsBlox addition: start
            description: ''
            // NetsBlox addition: end
        });
    });

    return items;
};
NetsBloxMorph.prototype.clearProject = function () {
    this.source = SnapCloud.username ? 'cloud' : 'local';
    if (this.stage) {
        this.stage.destroy();
    }
    if (location.hash.substr(0, 6) !== '#lang:') {
        location.hash = '';
    }
    this.globalVariables = new VariableFrame();
    this.currentSprite = new SpriteMorph(this.globalVariables);
    this.sprites = new List([this.currentSprite]);
    StageMorph.prototype.dimensions = new Point(480, 360);
    StageMorph.prototype.hiddenPrimitives = {};
    StageMorph.prototype.codeMappings = {};
    StageMorph.prototype.codeHeaders = {};
    StageMorph.prototype.enableCodeMapping = false;
    StageMorph.prototype.enableInheritance = false;
    SpriteMorph.prototype.useFlatLineEnds = false;
    this.projectNotes = '';
    this.createStage();
    this.add(this.stage);
    this.createCorral();
    this.selectSprite(this.stage.children[0]);
    this.fixLayout();

    SnapActions.disableCollaboration();
    SnapActions.loadProject(this);
    SnapUndo.reset();
};


NetsBloxMorph.prototype.newProject = function (projectName) {
    this.clearProject();

    // Get new room name
    this.sockets.sendMessage({
        type: 'create-room',
        role: projectName || RoomMorph.DEFAULT_ROLE
    });

    this.silentSetProjectName(projectName || RoomMorph.DEFAULT_ROLE);
    this.createRoom();
    this.selectSprite(this.stage.children[0]);
};

NetsBloxMorph.prototype.createRoom = function() {
    this.room = new RoomMorph(this);
};

// Creating the 'projects' view for the room
NetsBloxMorph.prototype.createSpriteEditor = function() {
    if (this.currentTab === 'room') {
        if (this.spriteEditor) {
            this.spriteEditor.destroy();
        }

        this.spriteEditor = new ProjectsMorph(this.room, this.sliderColor);
        this.spriteEditor.color = this.groupColor;
        this.add(this.spriteEditor);
    } else {
        NetsBloxMorph.uber.createSpriteEditor.call(this);
    }
};

NetsBloxMorph.prototype.setProjectName = function (string) {
    this.room.setRoleName(string);
};

NetsBloxMorph.prototype.silentSetProjectName = function (string) {
    return NetsBloxMorph.uber.setProjectName.call(this, string);
};

NetsBloxMorph.prototype.createControlBar = function () {
    var myself = this,
        padding = 5;

    NetsBloxMorph.uber.createControlBar.call(this);

    this.controlBar.updateLabel = function () {
        var suffix = ' @ ' + myself.room.name;

        suffix += myself.world().isDevMode ?
                ' - ' + localize('development mode') : '';

        if (this.label) {
            this.label.destroy();
        }
        if (myself.isAppMode) {
            return;
        }

        this.label = new StringMorph(
            (myself.projectName || localize('untitled')) + suffix,
            14,
            'sans-serif',
            true,
            false,
            false,
            MorphicPreferences.isFlat ? null : new Point(2, 1),
            myself.frameColor.darker(myself.buttonContrast)
        );
        this.label.color = myself.buttonLabelColor;
        this.label.drawNew();
        this.add(this.label);
        this.label.setCenter(this.center());
        this.label.setLeft(this.settingsButton.right() + padding);
    };
};

NetsBloxMorph.prototype.loadNextRoom = function () {
    // Check if the room has diverged and optionally fork
    // TODO
    if (this.room.nextRoom) {
        var next = this.room.nextRoom;
        this.room._name = next.roomName;  // silent set
        this.room.leaderId = next.leaderId;
        this.silentSetProjectName(next.roleId);

        // Send the message to the server
        this.sockets.updateRoomInfo();

        this.room.nextRoom = null;
    }
};

NetsBloxMorph.prototype.rawOpenCloudDataString = function (model, parsed) {
    var project;
    StageMorph.prototype.hiddenPrimitives = {};
    StageMorph.prototype.codeMappings = {};
    StageMorph.prototype.codeHeaders = {};
    StageMorph.prototype.enableCodeMapping = false;
    StageMorph.prototype.enableInheritance = false;
    if (Process.prototype.isCatchingErrors) {
        try {
            model = parsed ? model : this.serializer.parse(model);
            this.serializer.loadMediaModel(model.childNamed('media'));
            project = this.serializer.openProject(
                this.serializer.loadProjectModel(
                    model.childNamed('project'),
                    this
                ),
                this
            );
            // Join the room
            this.loadNextRoom();
        } catch (err) {
            this.showMessage('Load failed: ' + err);
        }
    } else {
        model = parsed ? model : this.serializer.parse(model);
        this.serializer.loadMediaModel(model.childNamed('media'));
        project = this.serializer.openProject(
            this.serializer.loadProjectModel(
                model.childNamed('project'),
                this
            ),
            this
        );
        this.loadNextRoom();
    }
    SnapActions.loadProject(this, project.collabStartIndex, model.toString());
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
                    SnapActions.setRotationStyle(myself.currentSprite, rotationStyle);
                }
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
        var newName = nameField.getValue(),
            currentName = myself.currentSprite.name,
            safeName = myself.newSpriteName(newName, myself.currentSprite);

        if (safeName !== currentName) {
            SnapActions.renameSprite(myself.currentSprite, safeName);
        }
    };
    this.spriteBar.nameField = nameField;
    this.spriteBar.reactToEdit = nameField.accept;

    // padlock
    padlock = new ToggleMorph(
        'checkbox',
        null,
        function () {
            SnapActions.toggleDraggable(myself.currentSprite, !myself.currentSprite.isDraggable);
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
    this.spriteBar.padlock = padlock;
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

    // NetsBlox addition: start
    tab = new TabMorph(
        tabColors,
        null, // target
        function () {tabBar.tabTo('room'); },
        localize('Room'), // label
        function () {  // query
            return myself.currentTab === 'room';
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
    // NetsBlox addition: end

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

NetsBloxMorph.prototype.projectMenu = function () {
    var menu,
        myself = this,
        world = this.world(),
        pos = this.controlBar.projectButton.bottomLeft(),
        graphicsName = this.currentSprite instanceof SpriteMorph ?
                'Costumes' : 'Backgrounds',
        shiftClicked = (world.currentKey === 16);

    // Utility for creating Costumes, etc menus.
    // loadFunction takes in two parameters: a file URL, and a canonical name
    function createMediaMenu(mediaType, loadFunction, header) {
        return function () {
            var names = this.getMediaList(mediaType),
                headerText = header ? localize(header) :
                    localize('Import') + ' ' + localize(mediaType),
                mediaMenu = new MenuMorph(
                    myself,
                    headerText
                );

            names.forEach(function (item) {
                mediaMenu.addItem(
                    item.name,
                    function () {loadFunction(item.fileName, item.name); },
                    item.help
                );
            });
            mediaMenu.popup(world, pos);
        };
    }

    menu = new MenuMorph(this);
    menu.addItem('Project notes...', 'editProjectNotes');
    menu.addLine();
    menu.addItem('New', 'createNewProject');
    menu.addItem('Open...', 'openProjectsBrowser');
    menu.addItem('Save', 'save');
    menu.addItem('Save As...', 'saveProjectsBrowser');
    if (shiftClicked) {
        menu.addItem(
            localize('Download replay events'),
            function() {
                myself.saveFileAs(
                    JSON.stringify(SnapUndo.allEvents, null, 2),
                    'text/json;charset=utf-8,',
                    'replay-actions'
                );
            },
            'download events for debugging and troubleshooting',
            new Color(100, 0, 0)
        );
        menu.addItem(
            localize('Replay events from file'),
            function() {
                var inp = document.createElement('input');
                if (SnapUndo.allEvents.length) {
                    return this.showMessage('events can only be replayed on empty project');
                }

                if (myself.filePicker) {
                    document.body.removeChild(myself.filePicker);
                    myself.filePicker = null;
                }
                inp.type = 'file';
                inp.style.color = "transparent";
                inp.style.backgroundColor = "transparent";
                inp.style.border = "none";
                inp.style.outline = "none";
                inp.style.position = "absolute";
                inp.style.top = "0px";
                inp.style.left = "0px";
                inp.style.width = "0px";
                inp.style.height = "0px";
                inp.addEventListener(
                    'change',
                    function () {
                        var reader = new FileReader();
                        document.body.removeChild(inp);
                        myself.filePicker = null;

                        reader.onloadend = function(result) {
                            return myself.loadSnapActions(result.target.result);
                        };
                        reader.readAsText(inp.files[0]);
                    },
                    false
                );
                document.body.appendChild(inp);
                myself.filePicker = inp;
                inp.click();
            },
            'download events for debugging and troubleshooting',
            new Color(100, 0, 0)
        );
    }
    menu.addLine();
    menu.addItem(
        'Import...',
        function () {
            var inp = document.createElement('input');
            if (myself.filePicker) {
                document.body.removeChild(myself.filePicker);
                myself.filePicker = null;
            }
            inp.type = 'file';
            inp.style.color = 'transparent';
            inp.style.backgroundColor = 'transparent';
            inp.style.border = 'none';
            inp.style.outline = 'none';
            inp.style.position = 'absolute';
            inp.style.top = '0px';
            inp.style.left = '0px';
            inp.style.width = '0px';
            inp.style.height = '0px';
            inp.addEventListener(
                'change',
                function () {
                    document.body.removeChild(inp);
                    myself.filePicker = null;
                    world.hand.processDrop(inp.files);
                },
                false
            );
            document.body.appendChild(inp);
            myself.filePicker = inp;
            inp.click();
        },
        'file menu import hint' // looks up the actual text in the translator
    );

    if (shiftClicked) {
        // Netsblox addition: start
        menu.addItem(
            localize('Export role...'),
            function () {
                if (myself.projectName) {
                    myself.exportRole(myself.projectName, shiftClicked);
                } else {
                    myself.prompt('Export Project As...', function (name) {
                        // false - override the shiftClick setting to use XML
                        // true - open XML in a new tab
                        myself.exportRole(name, false, true);
                    }, null, 'exportRole');
                }
            },
            'save "' + myself.projectName + '" as XML\nto your downloads folder',
            new Color(100, 0, 0)
        );
        // Netsblox addition: end
    }
    menu.addItem(
        shiftClicked ?
                'Export project as plain text...' : 'Export project...',
        function () {
            if (myself.projectName) {
                myself.exportProject(myself.projectName, shiftClicked);
            } else {
                myself.prompt('Export Project As...', function (name) {
                    myself.exportProject(name, shiftClicked);
                }, null, 'exportProject');
            }
        },
        'save project data as XML\nto your downloads folder',
        shiftClicked ? new Color(100, 0, 0) : null
    );

    // Netsblox addition: start
    if (this.stage.globalBlocks.length || this.stage.deletableMessageNames().length) {
        menu.addItem(
            'Export blocks/msgs...',
            function () {myself.exportGlobalBlocks(); },
            'show global custom block definitions/message types as XML' +
                '\nin a new browser window'
        );
    // Netsblox addition: end
        menu.addItem(
            'Unused blocks...',
            function () {myself.removeUnusedBlocks(); },
            'find unused global custom blocks' +
                '\nand remove their definitions'
        );
    }

    menu.addItem(
        'Export summary...',
        function () {myself.exportProjectSummary(); },
        'open a new browser browser window\n with a summary of this project'
    );

    if (shiftClicked) {
        menu.addItem(
            'Export summary with drop-shadows...',
            function () {myself.exportProjectSummary(true); },
            'open a new browser browser window' +
                '\nwith a summary of this project' +
                '\nwith drop-shadows on all pictures.' +
                '\nnot supported by all browsers',
            new Color(100, 0, 0)
        );
        menu.addItem(
            'Export all scripts as pic...',
            function () {myself.exportScriptsPicture(); },
            'show a picture of all scripts\nand block definitions',
            new Color(100, 0, 0)
        );
    }

    menu.addLine();
    menu.addItem(
        'Import tools',
        function () {
            myself.getURL(
                myself.resourceURL('tools.xml'),
                function (txt) {
                    myself.droppedText(txt, 'tools');
                }
            );
        },
        'load the official library of\npowerful blocks'
    );
    //menu.addItem(
        //'Import tools',
        //function () {
            //myself.droppedText(
                //myself.getURL('api/tools.xml'),
                //'tools'
            //);
        //},
        //'load the official library of\npowerful blocks'
    //);
    menu.addItem(
        'Libraries...',
        createMediaMenu(
            'libraries',
            function (file, name) {
                myself.getURL(
                    myself.resourceURL('libraries', file),
                    function (txt) {
                        myself.droppedText(txt, name);
                    }
                );
            }
        ),
        'Select categories of additional blocks to add to this project.'
    );

    // Netsblox addition: start
    menu.addItem(
        'Services...',
        createMediaMenu(
            'rpc',
            function loadLib(file, name) {
                var url = myself.resourceURL('rpc', file);
                myself.droppedText(myself.getURL(url), name);
            },
            localize('Import') + ' ' + localize('Service')
        ),
        'Select services to include in this project.'
    );
    // Netsblox addition: end

    menu.addItem(
        localize(graphicsName) + '...',
        function () {
            myself.importMedia(graphicsName);
        },
        'Select a costume from the media library'
    );
    menu.addItem(
        localize('Sounds') + '...',
        function () {
            myself.importMedia('Sounds');
        },
        'Select a sound from the media library'
    );

    menu.popup(world, pos);
};

NetsBloxMorph.prototype.requestAndroidApp = function(name) {
    var myself = this,
        projectXml,
        req,
        params,
        baseURL = window.location.origin + '/';

    // FIXME: this baseURL stuff could cause problems
    if (name !== this.projectName) {
        this.setProjectName(name);
    }

    projectXml = encodeURIComponent(
        this.serializer.serialize(this.stage)
    );
    // POST request with projectName, xml, username
    req = new XMLHttpRequest();
    params = 'projectName=' + name + '&username=' +
        SnapCloud.username + '&xml=' + projectXml +
        '&baseURL=' + encodeURIComponent(baseURL);

    req.open('post', baseURL + 'api/mobile/compile', true);
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    req.onload = function() {
        myself.showMessage(req.responseText);
    };
    req.send(params);
};

NetsBloxMorph.prototype.exportRole = NetsBloxMorph.prototype.exportProject;

// Trigger the export
NetsBloxMorph.prototype.exportProject = function () {
    this.showMessage('Exporting...', 3);

    // Trigger server export of all roles
    this.sockets.sendMessage({
        type: 'export-room',
        action: 'export'
    });
};

NetsBloxMorph.prototype.exportRoom = function (roles) {
    var //dataPrefix,
        name = this.room.name,
        str;

    try {
        str = this.serializer.serializeRoom(name, roles);
        //this.setURL('#open:' + dataPrefix + encodeURIComponent(str));
        this.saveXMLAs(str, name);
        this.showMessage('Exported!', 1);
    } catch (err) {
        if (Process.prototype.isCatchingErrors) {
            this.showMessage('Export failed: ' + err);
        } else {
            throw err;
        }
    }
};

// Open the room
NetsBloxMorph.prototype.openRoomString = function (str) {
    var room = this.serializer.parse(str),
        roles = {},
        role;

    // remove empty (malformed) roles
    room.children = room.children.filter(function(role) {
        return role.children.length;
    });
    if (!room.children[0]) {
        this.showMessage('Malformed room - No roles found.');
        return;
    }

    room.children.forEach(function(role) {
        roles[role.attributes.name] = {
            SourceCode: role.children[0].toString(),
            Media: role.children[1].toString()
        };
    });
    role = room.children[0].attributes.name;

    this.showMessage('Opening room...', 3);
    // Create a room with the new name
    this.newProject(role);

    // Send 'import-room' message
    this.sockets.sendMessage({
        type: 'import-room',
        name: room.attributes.name,
        role: role,
        roles: roles
    });

    // load the given project
    this.openCloudDataString(room.children[0], true);
};

NetsBloxMorph.prototype.openCloudDataString = function (model, parsed) {
    var msg,
        myself = this,
        str = parsed ? model : model.toString(),
        size = Math.round(str.length / 1024);
    this.nextSteps([
        function () {
            msg = myself.showMessage('Opening project\n' + size + ' KB...');
        },
        function () {nop(); }, // yield (bug in Chrome)
        function () {
            myself.rawOpenCloudDataString(model, parsed);
        },
        function () {
            msg.destroy();
        }
    ]);
};

// Serialize a project and save to the browser.
NetsBloxMorph.prototype.rawSaveProject = function (name) {
    this.showMessage('Saving', 3);

    if (name) {
        this.room.name = name;
    }

    // Trigger server export of all roles
    this.sockets.sendMessage({
        type: 'export-room',
        action: 'save'
    });
};

NetsBloxMorph.prototype.saveRoomLocal = function (roles) {
    var str,
        name = this.room.name;

    if (Process.prototype.isCatchingErrors) {
        try {
            localStorage['-snap-project-' + name]
                = str = this.serializer.serializeRoom(name, roles);
        
            this.setURL('#open:' + str);
            this.showMessage('Saved!', 1);
        } catch (err) {
            this.showMessage('Save failed: ' + err);
        }
    } else {
        localStorage['-snap-project-' + name]
            = str = this.serializer.serializeRoom(name, roles);
        this.setURL('#open:' + str);
        this.showMessage('Saved!', 1);
    }
};

NetsBloxMorph.prototype.openProject = function (name) {
    var str;
    if (name) {
        this.showMessage('opening project\n' + name);
        str = localStorage['-snap-project-' + name];
        this.openRoomString(str);
        this.setURL('#open:' + str);
    }
};

NetsBloxMorph.prototype.save = function () {
    if (this.source === 'examples') {
        this.source = 'local'; // cannot save to examples
    }
    if (this.projectName) {
        if (this.source === 'local') { // as well as 'examples'
            // NetsBlox changes - start
            this.saveProject(this.room.name);
            // NetsBlox changes - end
        } else { // 'cloud'
            this.saveProjectToCloud(this.projectName);
        }
    } else {
        this.saveProjectsBrowser();
    }
};

NetsBloxMorph.prototype.saveProjectToCloud = function (name) {
    var myself = this,
        overwriteExisting;

    if (SnapCloud.username !== this.room.ownerId) {
        return IDE_Morph.prototype.saveProjectToCloud.call(myself, name);
    }

    overwriteExisting = function(overwrite) {
        if (name) {
            myself.showMessage('Saving project\nto the cloud...');
            myself.setProjectName(name);
            SnapCloud.saveProject(
                myself,
                function () {
                    if (overwrite) {
                        myself.showMessage('saved.', 2);
                    } else {
                        myself.showMessage('saved as ' + myself.room.name, 2);
                    }
                },
                myself.cloudError(),
                overwrite
            );
        }
    };

    // Check if it will overwrite the current one
    SnapCloud.hasConflictingStoredProject(
        function(hasConflicting) {
            if (!hasConflicting) {
                return IDE_Morph.prototype.saveProjectToCloud.call(myself, name);
            } else {  // doesn't match the stored version!
                var dialog = new DialogBoxMorph(null, function() {
                    overwriteExisting(true);
                });

                dialog.cancel = function() {  // don't overwrite
                    overwriteExisting();
                    dialog.destroy();
                };
                dialog.askYesNo(
                    localize('Overwrite Existing Project'),
                    localize('A project with the given name already exists.\n' +
                        'Would you like to overwrite it?'),
                    myself.world()
                );
            }
        },
        myself.cloudError()
    );
};

NetsBloxMorph.prototype.logout = function () {
    NetsBloxMorph.uber.logout.call(this);
    this.room.update();
};

// RPC import support (both custom blocks and message types)
NetsBloxMorph.prototype.droppedText = function (aString, name) {
    if (aString.indexOf('<rpc') === 0) {
        return this.openBlocksMsgTypeString(aString);
    } else if (aString.indexOf('<room') === 0) {
        location.hash = '';
        return this.openRoomString(aString);
    } else {
        return IDE_Morph.prototype.droppedText.call(this, aString, name);
    }
};

NetsBloxMorph.prototype.openBlocksMsgTypeString = function (aString) {
    var msg,
        myself = this;

    this.nextSteps([
        function () {
            msg = myself.showMessage('Opening...');
        },
        function () {nop(); }, // yield (bug in Chrome)
        function () {
            if (Process.prototype.isCatchingErrors) {
                try {
                    myself.rawOpenBlocksMsgTypeString(aString);
                } catch (err) {
                    myself.showMessage('Load failed: ' + err);
                }
            } else {
                myself.rawOpenBlocksMsgTypeString(aString);
            }
        },
        function () {
            msg.destroy();
        }
    ]);
};

NetsBloxMorph.prototype.rawOpenBlocksMsgTypeString = function (aString) {
    // load messageTypes
    var content = this.serializer.parse(aString),
        messageTypes = content.childNamed('messageTypes'),
        blocksStr = content.childNamed('blocks').toString(),
        types;

    if (messageTypes) {
        types = messageTypes.children;
        types.forEach(this.serializer.loadMessageType.bind(this, this.stage));
    }

    // load blocks
    this.rawOpenBlocksString(blocksStr, '', true);
};

NetsBloxMorph.prototype.initializeCloud = function () {
    var myself = this,
        world = this.world();

    new DialogBoxMorph(
        null,
        function (user) {
            var pwh = hex_sha512(user.password),
                str;
            SnapCloud.login(
                user.username,
                pwh,
                user.choice,
                function () {
                    if (user.choice) {
                        str = SnapCloud.encodeDict(
                            {
                                username: user.username,
                                password: pwh
                            }
                        );
                        localStorage['-snap-user'] = str;
                    }
                    myself.source = 'cloud';
                    myself.showMessage('now connected.', 2);
                },
                myself.cloudError()
            );
        }
    ).withKey('cloudlogin').promptCredentials(
        'Sign in',
        'login',
        null,
        null,
        null,
        null,
        'stay signed in on this computer\nuntil logging out',
        world,
        myself.cloudIcon(),
        myself.cloudMsg
    );
};

NetsBloxMorph.prototype.rawLoadCloudProject = function (project, isPublic) {
    var newRoom = project.RoomName,
        isNewRole = project.NewRole === 'true',
        roleId = project.ProjectName;  // src proj name

    this.source = 'cloud';
    if (project.SourceCode) {
        this.droppedText(project.SourceCode);
        this.room.nextRoom = {
            ownerId: SnapCloud.username,
            roomName: newRoom,
            roleId: roleId
        };
    } else {  // initialize an empty code base
        this.clearProject();
        this.room._name = newRoom;  // silent set name
        // FIXME: this could cause problems later
        this.room.ownerId = SnapCloud.username;
        this.silentSetProjectName(roleId);
        this.sockets.updateRoomInfo();
        if (isNewRole) {
            this.showMessage(localize('A new role has been created for you at ' + newRoom));
        }
    }
    if (isPublic === 'true') {
        location.hash = '#present:Username=' +
            encodeURIComponent(SnapCloud.username) +
            '&ProjectName=' +
            encodeURIComponent(newRoom);
    }
};

// Bug reporting assistance
NetsBloxMorph.prototype.snapMenu = function () {
    var menu,
        myself = this,
        world = this.world();

    menu = new MenuMorph(this);
    menu.addItem('About...', 'aboutNetsBlox');
    menu.addLine();
    menu.addItem(
        'NetsBlox website',
        function () {
            window.open('https://netsblox.org', 'NetsBloxWebsite');
        }
    );
    menu.addItem(
        'Snap! manual',
        function () {
            var url = myself.resourceURL('help', 'SnapManual.pdf');
            window.open(url, 'SnapReferenceManual');
        }
    );
    menu.addItem(
        'Source code',
        function () {
            window.open(
                'https://github.com/netsblox/netsblox'
            );
        }
    );
    menu.addLine();
    menu.addItem(
        'Report a bug',
        'reportBug'
    );
    if (world.currentKey === 16) {
        menu.addItem(
            'Load reported bug',
            'loadBugReport',
            undefined,
            new Color(100, 0, 0)
        );
    }
    if (world.isDevMode) {
        menu.addLine();
        menu.addItem(
            'Switch back to user mode',
            'switchToUserMode',
            'disable deep-Morphic\ncontext menus'
                + '\nand show user-friendly ones',
            new Color(0, 100, 0)
        );
    } else if (world.currentKey === 16) { // shift-click
        menu.addLine();
        menu.addItem(
            'Switch to dev mode',
            'switchToDevMode',
            'enable Morphic\ncontext menus\nand inspectors,'
                + '\nnot user-friendly!',
            new Color(100, 0, 0)
        );
    }
    menu.popup(world, this.logo.bottomLeft());
};

NetsBloxMorph.prototype.aboutNetsBlox = function () {
    var dlg,
        version = NetsBloxSerializer.prototype.app.split(',')[0],
        aboutTxt,
        world = this.world();

    version = NetsBloxSerializer.prototype.app
        .split(',')[0] // NetsBlox <version>
        .replace(/NetsBlox /, '');

    aboutTxt = 'NetsBlox v' + version + '\n\n'

        + 'NetsBlox is developed by Vanderbilt University with support\n'
        + '          from the National Science Foundation (NSF)\n\n'

        + 'NetsBlox extends Snap!, from the University of California, Berkeley and \n'
        + 'is influenced and inspired by Scratch, from the Lifelong Kindergarten\n'
        + 'group at the MIT Media Lab\n\n'
        
        + 'for more information see https://netsblox.org,\nhttp://snap.berkeley.edu '
        + 'and http://scratch.mit.edu';

    dlg = new DialogBoxMorph();
    dlg.inform('About NetsBlox', aboutTxt, world);
    dlg.fixLayout();
    dlg.drawNew();
};

NetsBloxMorph.prototype.reportBug = function () {
    // Prompt for a description of the bug
    var dialog = new DialogBoxMorph().withKey('bugReport'),
        frame = new ScrollFrameMorph(),
        text = new TextMorph(''),
        ok = dialog.ok,
        myself = this,
        size = 250,
        world = this.world();

    frame.padding = 6;
    frame.setWidth(size);
    frame.acceptsDrops = false;
    frame.contents.acceptsDrops = false;

    text.setWidth(size - frame.padding * 2);
    text.setPosition(frame.topLeft().add(frame.padding));
    text.enableSelecting();
    text.isEditable = true;

    frame.setHeight(size);
    frame.fixLayout = nop;
    frame.edge = InputFieldMorph.prototype.edge;
    frame.fontSize = InputFieldMorph.prototype.fontSize;
    frame.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    frame.contrast = InputFieldMorph.prototype.contrast;
    frame.drawNew = InputFieldMorph.prototype.drawNew;
    frame.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    frame.addContents(text);
    text.drawNew();

    dialog.ok = function () {
        myself.submitBugReport(text.text);
        ok.call(this);
    };

    dialog.justDropped = function () {
        text.edit();
    };

    dialog.labelString = localize('What went wrong?');
    dialog.createLabel();
    dialog.addBody(frame);
    frame.drawNew();
    dialog.addButton('ok', 'OK');
    dialog.addButton('cancel', 'Cancel');
    dialog.fixLayout();
    dialog.drawNew();
    dialog.popUp(world);
    dialog.setCenter(world.center());
    text.edit();
};

NetsBloxMorph.prototype.submitBugReport = function (desc, silent) {
    var myself = this,
        canvas = document.getElementsByTagName('canvas')[0],
        report = {};

    // Add the description
    report.description = desc;
    report.timestamp = Date.now();
    report.userAgent = navigator.userAgent;
    report.version = NetsBloxSerializer.prototype.app;

    // Add screenshot
    report.screenshot = canvas.toDataURL();

    // Add project state
    report.project = this.serializer.serialize(this.stage);
    report.undoState = SnapUndo;

    // Add username (if logged in)
    report.user = SnapCloud.username;
    report.isAutoReport = !!silent;

    // Report to the server
    var request = new XMLHttpRequest(),
        url = SnapCloud.url + '/BugReport';

    request.open('post', url);
    request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
    request.onreadystatechange = function () {
        if (request.readyState === 4 && !silent) {
            if (request.status > 199 && request.status < 400) {  // success
                myself.showMessage(localize('Bug has been reported!'), 2);
            } else {  // failed...
                myself.cloudError()(url, localize('bug could not be reported:') +
                    request.responseText);
            }
        }
    };
    request.send(JSON.stringify(report));
};

NetsBloxMorph.prototype.loadBugReport = function () {
    var myself = this,
        inp = document.createElement('input');

    if (myself.filePicker) {
        document.body.removeChild(myself.filePicker);
        myself.filePicker = null;
    }
    inp.type = 'file';
    inp.style.color = 'transparent';
    inp.style.backgroundColor = 'transparent';
    inp.style.border = 'none';
    inp.style.outline = 'none';
    inp.style.position = 'absolute';
    inp.style.top = '0px';
    inp.style.left = '0px';
    inp.style.width = '0px';
    inp.style.height = '0px';
    inp.addEventListener(
        'change',
        function () {
            var reader = new FileReader();
            document.body.removeChild(inp);
            myself.filePicker = null;

            reader.onloadend = function(result) {
                var report = JSON.parse(result.target.result),
                    allEvents = report.undoState.allEvents,
                    dialog = new DialogBoxMorph(null, nop),
                    date,
                    msg,
                    choices = {};

                choices['Replay All Events'] = function() {
                    // Replay from 'allEvents'
                    myself.replayEvents(allEvents);
                    dialog.destroy();
                };

                choices['Replay Some Events'] = function() {
                    var range = new Point(0, allEvents.length);

                    new DialogBoxMorph(
                        myself,
                        function(point) {
                            myself.replayEvents(allEvents.slice(point.x, point.y));
                        },
                        myself
                    ).promptVector(
                        'Which events?',
                        range,
                        range,
                        'Start (inclusive)',
                        'End (exclusive)',
                        this.world(),
                        null, // pic
                        null // msg
                    );
                    dialog.destroy();
                };

                choices['Load Project'] = function() {
                    myself.droppedText(report.project);
                    setTimeout(function() {
                        var keys = Object.keys(report.undoState);
                        for (var i = keys.length; i--;) {
                            SnapUndo[keys[i]] = report.undoState[keys[i]];
                        }
                        myself.showMessage('Loaded bug report!');
                    }, 10);
                    dialog.destroy();
                };

                date = new Date(report.timestamp);
                msg = [
                    'User: ' + report.user,
                    'Date: ' + date.toDateString() + ' ' + date.toLocaleTimeString(),
                    'Version: ' + report.version,
                    'Browser: ' + report.userAgent,
                    'Event Count: ' + allEvents.length,
                    'Description:\n\n' + report.description
                ].join('\n');

                choices['Cancel'] = 'cancel';
                dialog.ask(
                    localize('Bug Report'),
                    msg,
                    myself.world(),
                    choices
                );

                return;
            };
            reader.readAsText(inp.files[0]);
        },
        false
    );
    document.body.appendChild(inp);
    myself.filePicker = inp;
    inp.click();
};

NetsBloxMorph.prototype.replayEvents = function (events) {
    var myself = this;

    events.forEach(function(event, i) {
        setTimeout(function() {
            SnapActions.applyEvent(event)
                .accept(function() {
                    myself.showMessage('applied #' + i + ' (' + event.type + ')');
                })
                .reject(function() {
                    myself.showMessage('Action failed: ' + event.type);
                });
        }, 500 * i);
    });

};
