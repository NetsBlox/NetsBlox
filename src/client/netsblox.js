/* global RoomMorph, IDE_Morph, StageMorph, List, SnapCloud, VariableFrame,
   WebSocketManager, SpriteMorph, Point, ProjectsMorph, localize, Process,
   Morph, AlignmentMorph, ToggleButtonMorph, StringMorph, Color, TabMorph,
   InputFieldMorph, MorphicPreferences, ToggleMorph, MenuMorph, newCanvas,
   NetsBloxSerializer*/
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

NetsBloxMorph.prototype.resourceURL = function (folder, file) {
    return 'api/' + folder + '/' + file;
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
    StageMorph.prototype.hiddenPrimitives = {};
    StageMorph.prototype.codeMappings = {};
    StageMorph.prototype.codeHeaders = {};
    StageMorph.prototype.enableCodeMapping = false;
    StageMorph.prototype.enableInheritance = false;
    if (Process.prototype.isCatchingErrors) {
        try {
            model = parsed ? model : this.serializer.parse(model);
            this.serializer.loadMediaModel(model.childNamed('media'));
            this.serializer.openProject(
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
        this.serializer.openProject(
            this.serializer.loadProjectModel(
                model.childNamed('project'),
                this
            ),
            this
        );
        this.loadNextRoom();
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
    function createMediaMenu(mediaType, loadFunction) {
        return function () {
            var names = this.getMediaList(mediaType),
                mediaMenu = new MenuMorph(
                    myself,
                    localize('Import') + ' ' + localize(mediaType)
                );

            names.forEach(function (item) {
                mediaMenu.addItem(
                    item.name,
                    function () {loadFunction(item.file, item.name); },
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

    if (this.stage.globalBlocks.length || this.stage.deletableMessageNames().length) {
        menu.addItem(
            'Export blocks/msgs...',
            function () {myself.exportGlobalBlocks(); },
            'show global custom block definitions/message types as XML' +
                '\nin a new browser window'
        );
        menu.addItem(
            'Unused blocks...',
            function () {myself.removeUnusedBlocks(); },
            'find unused global custom blocks' +
                '\nand remove their definitions'
        );
    }

    /*
    if (SnapCloud.username) {  // If logged in
        menu.addItem(
            'Export as Android App...',
            function () {
                if (myself.projectName) {
                    myself.requestAndroidApp(myself.projectName);
                } else {
                    myself.prompt('What is the name of this project?', function (name) {
                        myself.requestAndroidApp(name);
                    }, null, 'requestAndroidApp');
                }
            },
            'create an Android app from the current project'
        );
    }
    */

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
            myself.droppedText(
                myself.getURL('api/tools.xml'),
                'tools'
            );
        },
        'load the official library of\npowerful blocks'
    );
    menu.addItem(
        'Libraries...',
        createMediaMenu(
            'libraries',
            function loadLib(file, name) {
                var url = myself.resourceURL('libraries', file);
                myself.droppedText(myself.getURL(url), name);
            }
        ),
        'Select categories of additional blocks to add to this project.'
    );

    menu.addItem(
        'Remote Calls...',
        createMediaMenu(
            'rpc',
            function loadLib(file, name) {
                var url = myself.resourceURL('rpc', file);
                myself.droppedText(myself.getURL(url), name);
            }
        ),
        'Select remote procedure calls to add to this project.'
    );

    menu.addItem(
        'Message Types...',
        function () {
            // read a list of libraries from an external file,
            var MsgTypeMenu = new MenuMorph(this, 'Import Network Message Type'),
                msgTypeUrl = '/api/MessageTypes/index';

            function loadMessageType(name) {
                var url = '/api/MessageTypes/' + name;
                try {
                    var msgType = JSON.parse(myself.getURL(url));
                    myself.stage.addMessageType(msgType);
                } catch (e) {
                    console.error('could not load the message type "' + name + '"');
                }
            }

            var msgTypes = [];

            try {
                msgTypes = JSON.parse(myself.getURL(msgTypeUrl));
            } catch(e) {
                console.error('could not load the message types');
            }

            msgTypes.forEach(function (name) {
                MsgTypeMenu.addItem(
                    name,
                    loadMessageType.bind(null, name)
                );
            });

            MsgTypeMenu.popup(world, pos);
        },
        'Add new types of messages to your project!'
    );

    menu.addItem(
        localize(graphicsName) + '...',
        createMediaMenu(
            graphicsName,
            function loadCostume(file, name) {
                var url = myself.resourceURL(graphicsName, file),
                    img = new Image();
                img.onload = function () {
                    var canvas = newCanvas(new Point(img.width, img.height));
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    myself.droppedImage(canvas, name);
                };
                img.src = url;
            }
        ),
        'Select a costume from the media library'
    );
    menu.addItem(
        localize('Sounds') + '...',
        createMediaMenu(
            'Sounds',
            function loadSound(file, name) {
                var url = myself.resourceURL('Sounds', file),
                    audio = new Audio();
                audio.src = url;
                audio.load();
                myself.droppedAudio(audio, name);
            }
        ),
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
NetsBloxMorph.prototype.exportProject = function (name) {
    this.showMessage('Exporting', 3);

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

NetsBloxMorph.prototype.getURL = function (url) {
    var request = new XMLHttpRequest(),
        myself = this;
    try {
        request.open('GET', url, false);
        request.send();
        if (request.status === 200) {
            return request.responseText;
        }
        var msg = request.responseText.indexOf('ERROR') === 0 ?
            request.responseText : 'unable to retrieve ' + url;

        throw new Error(msg);
    } catch (err) {
        myself.showMessage(err.message);
        return;
    }
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
    this.rawOpenBlocksString(blocksStr, '', true)
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

