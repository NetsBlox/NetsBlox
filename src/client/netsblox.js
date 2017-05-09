/* global RoomMorph, IDE_Morph, StageMorph, List, SnapCloud, VariableFrame,
   WebSocketManager, SpriteMorph, Point, ProjectsMorph, localize, Process,
   Morph, AlignmentMorph, ToggleButtonMorph, StringMorph, Color, TabMorph,
   InputFieldMorph, MorphicPreferences, ToggleMorph, MenuMorph, TextMorph
   NetsBloxSerializer, nop, SnapActions, DialogBoxMorph, hex_sha512, SnapUndo,
   ScrollFrameMorph, SnapUndo, LibraryImportDialogMorph, CollaboratorDialogMorph,
   BooleanSlotMorph, isRetinaSupported, isRetinaEnabled, useBlurredShadows,
   BlockMorph, SyntaxElementMorph, ScriptsMorph, InputSlotDialogMorph, ArgMorph,
   BlockLabelPlaceHolderMorph, TableMorph*/
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

NetsBloxMorph.prototype.openIn = function (world) {
    var hash, usr, myself = this, urlLanguage = null;

    // get persistent user data, if any
    if (localStorage) {
        usr = localStorage['-snap-user'];
        if (usr) {
            usr = SnapCloud.parseResponse(usr)[0];
            if (usr) {
                SnapCloud.username = usr.username || null;
                SnapCloud.password = usr.password || null;
                if (SnapCloud.username) {
                    this.source = 'cloud';
                }
            }
        }
    }

    this.buildPanes();
    SnapActions.disableCollaboration();
    SnapUndo.reset();
    SnapActions.loadProject(this);
    world.add(this);
    world.userMenu = this.userMenu;

    // override SnapCloud's user message with Morphic
    SnapCloud.message = function (string) {
        var m = new MenuMorph(null, string),
            intervalHandle;
        m.popUpCenteredInWorld(world);
        intervalHandle = setInterval(function () {
            m.destroy();
            clearInterval(intervalHandle);
        }, 2000);
    };

    // prevent non-DialogBoxMorphs from being dropped
    // onto the World in user-mode
    world.reactToDropOf = function (morph) {
        if (!(morph instanceof DialogBoxMorph)) {
            if (world.hand.grabOrigin) {
                morph.slideBackTo(world.hand.grabOrigin);
            } else {
                world.hand.grab(morph);
            }
        }
    };

    this.reactToWorldResize(world.bounds);

    function getURL(url) {
        try {
            var request = new XMLHttpRequest();
            request.open('GET', url, false);
            request.send();
            if (request.status === 200) {
                return request.responseText;
            }
            throw new Error('unable to retrieve ' + url);
        } catch (err) {
            myself.showMessage('unable to retrieve project');
            return '';
        }
    }

	function applyFlags(dict) {
        if (dict.editMode) {
            myself.toggleAppMode(false);
        } else {
            myself.toggleAppMode(true);
        }
        if (!dict.noRun) {
            myself.runScripts();
        }
        if (dict.hideControls) {
            myself.controlBar.hide();
            window.onbeforeunload = nop;
        }
        if (dict.noExitWarning) {
            window.onbeforeunload = nop;
        }
	}

    // dynamic notifications from non-source text files
    // has some issues, commented out for now
    /*
    this.cloudMsg = getURL('http://snap.berkeley.edu/cloudmsg.txt');
    motd = getURL('http://snap.berkeley.edu/motd.txt');
    if (motd) {
        this.inform('Snap!', motd);
    }
    */

    function interpretUrlAnchors() {
        var dict = {}, idx;

        // Netsblox addition: start
        if (location.href.indexOf('?') > -1) {
            var querystring = location.href
                .replace(/^.*\?/, '')
                .replace('#' + location.hash, '');

            dict = SnapCloud.parseDict(querystring);
        }
        // Netsblox addition: end

        if (location.hash.substr(0, 6) === '#open:') {
            hash = location.hash.substr(6);
            if (hash.charAt(0) === '%'
                    || hash.search(/\%(?:[0-9a-f]{2})/i) > -1) {
                hash = decodeURIComponent(hash);
            }
            if (contains(
                    ['project', 'blocks', 'sprites', 'snapdata'].map(
                        function (each) {
                            return hash.substr(0, 8).indexOf(each);
                        }
                    ),
                    1
                )) {
                this.droppedText(hash);
            } else {
                this.droppedText(getURL(hash));
            }
        } else if (location.hash.substr(0, 5) === '#run:') {
            hash = location.hash.substr(5);
            idx = hash.indexOf("&");
            if (idx > 0) {
                hash = hash.slice(0, idx);
            }
            if (hash.charAt(0) === '%'
                    || hash.search(/\%(?:[0-9a-f]{2})/i) > -1) {
                hash = decodeURIComponent(hash);
            }
            if (hash.substr(0, 8) === '<project>') {
                this.rawOpenProjectString(hash);
            } else {
                this.rawOpenProjectString(getURL(hash));
            }
            applyFlags(SnapCloud.parseDict(location.hash.substr(5)));
        // Netsblox addition: start
        } else if (location.hash.substr(0, 9) === '#present:' || dict.action === 'present') {
        // Netsblox addition: end
            this.shield = new Morph();
            this.shield.color = this.color;
            this.shield.setExtent(this.parent.extent());
            this.parent.add(this.shield);
            myself.showMessage('Fetching project\nfrom the cloud...');

            // Netsblox addition: start
            if (location.hash.substr(0, 9) === '#present:') {
                dict = SnapCloud.parseDict(location.hash.substr(9));
            }
            // (removed lowercasing the username)
            // Netsblox addition: end

            SnapCloud.getPublicProject(
                SnapCloud.encodeDict(dict),
                function (projectData) {
                    var msg;
                    myself.nextSteps([
                        function () {
                            msg = myself.showMessage('Opening project...');
                        },
                        function () {nop(); }, // yield (bug in Chrome)
                        function () {
                            // Netsblox addition: start
                            myself.openRoomString(projectData, true);
                            // Netsblox addition: end
                            myself.hasChangedMedia = true;
                        },
                        function () {
                            myself.shield.destroy();
                            myself.shield = null;
                            msg.destroy();
                            applyFlags(dict);
                        }
                    ]);
                },
                this.cloudError()
            );
        } else if (location.hash.substr(0, 7) === '#cloud:') {
            this.shield = new Morph();
            this.shield.alpha = 0;
            this.shield.setExtent(this.parent.extent());
            this.parent.add(this.shield);
            myself.showMessage('Fetching project\nfrom the cloud...');

            // make sure to lowercase the username
            dict = SnapCloud.parseDict(location.hash.substr(7));
            dict.Username = dict.Username.toLowerCase();

            SnapCloud.getPublicProject(
                SnapCloud.encodeDict(dict),
                function (projectData) {
                    var msg;
                    myself.nextSteps([
                        function () {
                            msg = myself.showMessage('Opening project...');
                        },
                        function () {nop(); }, // yield (bug in Chrome)
                        function () {
                            if (projectData.indexOf('<snapdata') === 0) {
                                myself.rawOpenCloudDataString(projectData);
                            } else if (
                                projectData.indexOf('<project') === 0
                            ) {
                                myself.rawOpenProjectString(projectData);
                            }
                            myself.hasChangedMedia = true;
                        },
                        function () {
                            myself.shield.destroy();
                            myself.shield = null;
                            msg.destroy();
                            myself.toggleAppMode(false);
                        }
                    ]);
                },
                this.cloudError()
            );
        } else if (location.hash.substr(0, 4) === '#dl:') {
            myself.showMessage('Fetching project\nfrom the cloud...');

            // make sure to lowercase the username
            dict = SnapCloud.parseDict(location.hash.substr(4));
            dict.Username = dict.Username.toLowerCase();

            SnapCloud.getPublicProject(
                SnapCloud.encodeDict(dict),
                function (projectData) {
                    window.open('data:text/xml,' + projectData);
                },
                this.cloudError()
            );
        } else if (location.hash.substr(0, 6) === '#lang:') {
            urlLanguage = location.hash.substr(6);
            this.setLanguage(urlLanguage);
            this.loadNewProject = true;
        } else if (location.hash.substr(0, 7) === '#signup') {
            this.createCloudAccount();
        } else if (location.hash.substr(0, 12) === '#collaborate') {
            var sessionId = location.hash.substr(13);
            // Get the session id and join it!
            SnapActions.enableCollaboration();
            SnapActions.joinSession(sessionId, this.cloudError());

        // Netsblox addition: start
        } else if (location.hash.substr(0, 9) === '#example:' || dict.action === 'example') {
            var example = dict ? dict.ProjectName : location.hash.substr(9),
                onConnect = this.sockets.onConnect,
                msg;

            this.sockets.onConnect = function() {
                SnapCloud.passiveLogin(myself, function() {
                    var response = SnapCloud.parseDict(myself.getURL('api/Examples/' + example +
                        '?socketId=' + myself.sockets.uuid));

                    myself.room.nextRoom = {
                        ownerId: response.OwnerId,
                        roomName: response.RoomName,
                        roleId: response.ProjectName
                    };

                    // role name
                    myself.nextSteps([
                        function () {
                            msg = this.showMessage('Opening ' + example + ' example...');
                        },
                        function () {nop(); }, // yield (bug in Chrome)
                        function () {
                            if (response.SourceCode) {
                                myself.rawOpenCloudDataString(
                                    response.SourceCode
                                );
                            } else {
                                myself.clearProject();
                            }
                            myself.loadNextRoom();
                            myself.sockets.onConnect = onConnect;
                            myself.hasChangedMedia = true;
                        },
                        function () {
                            msg.destroy();
                            applyFlags(dict);
                        }
                    ]);
                }, true);
            };
        } else if (location.hash.substr(0, 9) === '#private:' || dict.action === 'private') {
            var name = dict ? dict.ProjectName : location.hash.substr(9);
            onConnect = this.sockets.onConnect;

            this.sockets.onConnect = function() {
                SnapCloud.passiveLogin(myself, function(isLoggedIn) {
                    if (!isLoggedIn) {
                        myself.showMessage('You are not logged in. Cannot open ' + name);
                        return;
                    }

                    myself.nextSteps([
                        function () {
                            msg = this.showMessage('Opening ' + name + ' example...');
                        },
                        function () {nop(); }, // yield (bug in Chrome)
                        function () {
                            SnapCloud.callService(
                                'getProject',
                                function (response) {
                                    myself.rawLoadCloudProject(response[0], dict.Public);
                                },
                                myself.cloudError(),
                                [dict.ProjectName, SnapCloud.socketId()]
                            );
                        }
                    ]);
                }, true);
                myself.sockets.onConnect = onConnect;
            };
        // Netsblox addition: end
        }
    }

    if (this.userLanguage) {
        this.loadNewProject = true;
        this.setLanguage(this.userLanguage, interpretUrlAnchors);
    } else {
        interpretUrlAnchors.call(this);
    }
};

NetsBloxMorph.prototype.resourceURL = function () {
    return 'api/' + IDE_Morph.prototype.resourceURL.apply(this, arguments);
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
    SnapUndo.reset();
    SnapActions.loadProject(this);
};

NetsBloxMorph.prototype.cloudMenu = function () {
    var menu,
        myself = this,
        world = this.world(),
        pos = this.controlBar.cloudButton.bottomLeft(),
        shiftClicked = (world.currentKey === 16);

    menu = new MenuMorph(this);
    if (shiftClicked) {
        menu.addItem(
            'url...',
            'setCloudURL',
            null,
            new Color(100, 0, 0)
        );
        menu.addLine();
    }
    if (!SnapCloud.username) {
        menu.addItem(
            'Login...',
            'initializeCloud'
        );
        menu.addItem(
            'Signup...',
            'createCloudAccount'
        );
        menu.addItem(
            'Reset Password...',
            'resetCloudPassword'
        );
    } else {
        menu.addItem(
            localize('Logout') + ' ' + SnapCloud.username,
            'logout'
        );
        menu.addItem(
            'Change Password...',
            'changeCloudPassword'
        );
        if (SnapActions.supportsCollaboration !== false) {
            menu.addLine();
            menu.addItem(
                'Collaborators...',
                'manageCollaborators'
            );
        }
    }
    if (shiftClicked) {
        menu.addLine();
        menu.addItem(
            'export project media only...',
            function () {
                if (myself.projectName) {
                    myself.exportProjectMedia(myself.projectName);
                } else {
                    myself.prompt('Export Project As...', function (name) {
                        myself.exportProjectMedia(name);
                    }, null, 'exportProject');
                }
            },
            null,
            this.hasChangedMedia ? new Color(100, 0, 0) : new Color(0, 100, 0)
        );
        menu.addItem(
            'export project without media...',
            function () {
                if (myself.projectName) {
                    myself.exportProjectNoMedia(myself.projectName);
                } else {
                    myself.prompt('Export Project As...', function (name) {
                        myself.exportProjectNoMedia(name);
                    }, null, 'exportProject');
                }
            },
            null,
            new Color(100, 0, 0)
        );
        menu.addItem(
            'export project as cloud data...',
            function () {
                if (myself.projectName) {
                    myself.exportProjectAsCloudData(myself.projectName);
                } else {
                    myself.prompt('Export Project As...', function (name) {
                        myself.exportProjectAsCloudData(name);
                    }, null, 'exportProject');
                }
            },
            null,
            new Color(100, 0, 0)
        );
        menu.addLine();
        menu.addItem(
            'open shared project from cloud...',
            function () {
                myself.prompt('Author name…', function (usr) {
                    myself.prompt('Project name...', function (prj) {
                        var id = 'Username=' +
                            encodeURIComponent(usr.toLowerCase()) +
                            '&ProjectName=' +
                            encodeURIComponent(prj);
                        myself.showMessage(
                            'Fetching project\nfrom the cloud...'
                        );
                        SnapCloud.getPublicProject(
                            id,
                            function (projectData) {
                                var msg;
                                if (!Process.prototype.isCatchingErrors) {
                                    window.open(
                                        'data:text/xml,' + projectData
                                    );
                                }
                                myself.nextSteps([
                                    function () {
                                        msg = myself.showMessage(
                                            'Opening project...'
                                        );
                                    },
                                    function () {nop(); }, // yield (Chrome)
                                    function () {
                                        myself.rawOpenCloudDataString(
                                            projectData
                                        );
                                    },
                                    function () {
                                        msg.destroy();
                                    }
                                ]);
                            },
                            myself.cloudError()
                        );

                    }, null, 'project');
                }, null, 'project');
            },
            null,
            new Color(100, 0, 0)
        );
    }
    menu.popup(world, pos);
};

NetsBloxMorph.prototype.settingsMenu = function () {
    var menu,
        stage = this.stage,
        world = this.world(),
        myself = this,
        pos = this.controlBar.settingsButton.bottomLeft(),
        shiftClicked = (world.currentKey === 16);

    function addPreference(label, toggle, test, onHint, offHint, hide) {
        var on = '\u2611 ',
            off = '\u2610 ';
        if (!hide || shiftClicked) {
            menu.addItem(
                (test ? on : off) + localize(label),
                toggle,
                test ? onHint : offHint,
                hide ? new Color(100, 0, 0) : null
            );
        }
    }

    menu = new MenuMorph(this);
    menu.addItem('Language...', 'languageMenu');
    menu.addItem(
        'Zoom blocks...',
        'userSetBlocksScale'
    );
    menu.addItem(
        'Stage size...',
        'userSetStageSize'
    );
    if (shiftClicked) {
        menu.addItem(
            'Dragging threshold...',
            'userSetDragThreshold',
            'specify the distance the hand has to move\n' +
                'before it picks up an object',
            new Color(100, 0, 0)
        );
    }
    menu.addLine();
    /*
    addPreference(
        'JavaScript',
        function () {
            Process.prototype.enableJS = !Process.prototype.enableJS;
            myself.currentSprite.blocksCache.operators = null;
            myself.currentSprite.paletteCache.operators = null;
            myself.refreshPalette();
        },
        Process.prototype.enableJS,
        'uncheck to disable support for\nnative JavaScript functions',
        'check to support\nnative JavaScript functions'
    );
    */
    if (isRetinaSupported()) {
        addPreference(
            'Retina display support',
            'toggleRetina',
            isRetinaEnabled(),
            'uncheck for lower resolution,\nsaves computing resources',
            'check for higher resolution,\nuses more computing resources'
        );
    }
    addPreference(
        'Blurred shadows',
        'toggleBlurredShadows',
        useBlurredShadows,
        'uncheck to use solid drop\nshadows and highlights',
        'check to use blurred drop\nshadows and highlights',
        true
    );
    addPreference(
        'Zebra coloring',
        'toggleZebraColoring',
        BlockMorph.prototype.zebraContrast,
        'uncheck to disable alternating\ncolors for nested block',
        'check to enable alternating\ncolors for nested blocks',
        true
    );
    addPreference(
        'Dynamic input labels',
        'toggleDynamicInputLabels',
        SyntaxElementMorph.prototype.dynamicInputLabels,
        'uncheck to disable dynamic\nlabels for variadic inputs',
        'check to enable dynamic\nlabels for variadic inputs',
        true
    );
    addPreference(
        'Prefer empty slot drops',
        'togglePreferEmptySlotDrops',
        ScriptsMorph.prototype.isPreferringEmptySlots,
        'uncheck to allow dropped\nreporters to kick out others',
        'settings menu prefer empty slots hint',
        true
    );
    addPreference(
        'Long form input dialog',
        'toggleLongFormInputDialog',
        InputSlotDialogMorph.prototype.isLaunchingExpanded,
        'uncheck to use the input\ndialog in short form',
        'check to always show slot\ntypes in the input dialog'
    );
    addPreference(
        'Plain prototype labels',
        'togglePlainPrototypeLabels',
        BlockLabelPlaceHolderMorph.prototype.plainLabel,
        'uncheck to always show (+) symbols\nin block prototype labels',
        'check to hide (+) symbols\nin block prototype labels'
    );
    addPreference(
        'Virtual keyboard',
        'toggleVirtualKeyboard',
        MorphicPreferences.useVirtualKeyboard,
        'uncheck to disable\nvirtual keyboard support\nfor mobile devices',
        'check to enable\nvirtual keyboard support\nfor mobile devices',
        true
    );
    addPreference(
        'Input sliders',
        'toggleInputSliders',
        MorphicPreferences.useSliderForInput,
        'uncheck to disable\ninput sliders for\nentry fields',
        'check to enable\ninput sliders for\nentry fields'
    );
    if (MorphicPreferences.useSliderForInput) {
        addPreference(
            'Execute on slider change',
            'toggleSliderExecute',
            ArgMorph.prototype.executeOnSliderEdit,
            'uncheck to suppress\nrunning scripts\nwhen moving the slider',
            'check to run\nthe edited script\nwhen moving the slider'
        );
    }
    addPreference(
        'Clicking sound',
        function () {
            BlockMorph.prototype.toggleSnapSound();
            if (BlockMorph.prototype.snapSound) {
                myself.saveSetting('click', true);
            } else {
                myself.removeSetting('click');
            }
        },
        BlockMorph.prototype.snapSound,
        'uncheck to turn\nblock clicking\nsound off',
        'check to turn\nblock clicking\nsound on'
    );
    addPreference(
        'Animations',
        function () {myself.isAnimating = !myself.isAnimating; },
        myself.isAnimating,
        'uncheck to disable\nIDE animations',
        'check to enable\nIDE animations',
        true
    );
    addPreference(
        'Turbo mode',
        'toggleFastTracking',
        this.stage.isFastTracked,
        'uncheck to run scripts\nat normal speed',
        'check to prioritize\nscript execution'
    );
    addPreference(
        'Cache Inputs',
        function () {
            BlockMorph.prototype.isCachingInputs =
                !BlockMorph.prototype.isCachingInputs;
        },
        BlockMorph.prototype.isCachingInputs,
        'uncheck to stop caching\ninputs (for debugging the evaluator)',
        'check to cache inputs\nboosts recursion',
        true
    );
    addPreference(
        'Rasterize SVGs',
        function () {
            MorphicPreferences.rasterizeSVGs =
                !MorphicPreferences.rasterizeSVGs;
        },
        MorphicPreferences.rasterizeSVGs,
        'uncheck for smooth\nscaling of vector costumes',
        'check to rasterize\nSVGs on import',
        true
    );
    addPreference(
        'Flat design',
        function () {
            if (MorphicPreferences.isFlat) {
                return myself.defaultDesign();
            }
            myself.flatDesign();
        },
        MorphicPreferences.isFlat,
        'uncheck for default\nGUI design',
        'check for alternative\nGUI design',
        false
    );
    addPreference(
        'Nested auto-wrapping',
        function () {
            ScriptsMorph.prototype.enableNestedAutoWrapping =
                !ScriptsMorph.prototype.enableNestedAutoWrapping;
            if (ScriptsMorph.prototype.enableNestedAutoWrapping) {
                myself.removeSetting('autowrapping');
            } else {
                myself.saveSetting('autowrapping', false);
            }
        },
        ScriptsMorph.prototype.enableNestedAutoWrapping,
        'uncheck to confine auto-wrapping\nto top-level block stacks',
        'check to enable auto-wrapping\ninside nested block stacks',
        false
    );
    addPreference(
        'Project URLs',
        function () {
            myself.projectsInURLs = !myself.projectsInURLs;
            if (myself.projectsInURLs) {
                myself.saveSetting('longurls', true);
            } else {
                myself.removeSetting('longurls');
            }
        },
        myself.projectsInURLs,
        'uncheck to disable\nproject data in URLs',
        'check to enable\nproject data in URLs',
        true
    );
    addPreference(
        'Sprite Nesting',
        function () {
            SpriteMorph.prototype.enableNesting =
                !SpriteMorph.prototype.enableNesting;
        },
        SpriteMorph.prototype.enableNesting,
        'uncheck to disable\nsprite composition',
        'check to enable\nsprite composition',
        true
    );
    addPreference(
        'First-Class Sprites',
        function () {
            SpriteMorph.prototype.enableFirstClass =
                !SpriteMorph.prototype.enableFirstClass;
            myself.currentSprite.blocksCache.sensing = null;
            myself.currentSprite.paletteCache.sensing = null;
            myself.refreshPalette();
        },
        SpriteMorph.prototype.enableFirstClass,
        'uncheck to disable support\nfor first-class sprites',
        'check to enable support\n for first-class sprite',
        true
    );
    addPreference(
        'Keyboard Editing',
        function () {
            ScriptsMorph.prototype.enableKeyboard =
                !ScriptsMorph.prototype.enableKeyboard;
            if (ScriptsMorph.prototype.enableKeyboard) {
                myself.removeSetting('keyboard');
            } else {
                myself.saveSetting('keyboard', false);
            }
        },
        ScriptsMorph.prototype.enableKeyboard,
        'uncheck to disable\nkeyboard editing support',
        'check to enable\nkeyboard editing support',
        false
    );
    addPreference(
        'Table support',
        function () {
            List.prototype.enableTables =
                !List.prototype.enableTables;
            if (List.prototype.enableTables) {
                myself.removeSetting('tables');
            } else {
                myself.saveSetting('tables', false);
            }
        },
        List.prototype.enableTables,
        'uncheck to disable\nmulti-column list views',
        'check for multi-column\nlist view support',
        false
    );
    if (List.prototype.enableTables) {
        addPreference(
            'Table lines',
            function () {
                TableMorph.prototype.highContrast =
                    !TableMorph.prototype.highContrast;
                if (TableMorph.prototype.highContrast) {
                    myself.saveSetting('tableLines', true);
                } else {
                    myself.removeSetting('tableLines');
                }
            },
            TableMorph.prototype.highContrast,
            'uncheck for less contrast\nmulti-column list views',
            'check for higher contrast\ntable views',
            false
        );
    }
    addPreference(
        'Live coding support',
        function () {
            Process.prototype.enableLiveCoding =
                !Process.prototype.enableLiveCoding;
        },
        Process.prototype.enableLiveCoding,
        'EXPERIMENTAL! uncheck to disable live\ncustom control structures',
        'EXPERIMENTAL! check to enable\n live custom control structures',
        true
    );
    addPreference(
        'Visible stepping',
        'toggleSingleStepping',
        Process.prototype.enableSingleStepping,
        'uncheck to turn off\nvisible stepping',
        'check to turn on\n visible stepping (slow)',
        false
    );
    // Netsblox addition: start
    // (Removed the collaboration option)
    // Netsblox addition: end
    addPreference(
        'Replay Mode',
        function() {
            if (myself.isReplayMode) {  // exiting replay mode

                if (myself.isPreviousVersion()) {
                    myself.confirm(
                        'Exiting replay mode now will revert the project to\n' +
                        'the current point in history (losing any unapplied ' + 
                        'changes)\n\nAre you sure you want to exit replay mode?',
                        'Exit Replay Mode?',
                        function () {
                            myself.exitReplayMode();
                        }
                    );
                    return;
                }
                return myself.exitReplayMode();
            }
            // entering replay mode
            if (SnapUndo.allEvents.length < 2) {
                return myself.showMessage('Nothing to replay!', 2);
            }
            if (SnapActions.isCollaborating()) {
                this.confirm(
                    'Cannot enter replay mode while collaborating. \nWould you ' +
                    'like to disable collaboration and enter replay mode?',
                    'Disable Collaboration?',
                    function () {
                        SnapActions.disableCollaboration();
                        myself.replayEvents();
                    }
                );
            } else {
                myself.replayEvents();
            }
        },
        myself.isReplayMode,
        'uncheck to disable replay mode',
        'check to enable replay mode',
        false
    );
    menu.addLine(); // everything below this line is stored in the project
    addPreference(
        'Thread safe scripts',
        function () {stage.isThreadSafe = !stage.isThreadSafe; },
        this.stage.isThreadSafe,
        'uncheck to allow\nscript reentrance',
        'check to disallow\nscript reentrance'
    );
    addPreference(
        'Prefer smooth animations',
        'toggleVariableFrameRate',
        StageMorph.prototype.frameRate,
        'uncheck for greater speed\nat variable frame rates',
        'check for smooth, predictable\nanimations across computers',
        true
    );
    addPreference(
        'Flat line ends',
        function () {
            SpriteMorph.prototype.useFlatLineEnds =
                !SpriteMorph.prototype.useFlatLineEnds;
        },
        SpriteMorph.prototype.useFlatLineEnds,
        'uncheck for round ends of lines',
        'check for flat ends of lines'
    );
    addPreference(
        'Ternary Boolean slots',
        function () {
            BooleanSlotMorph.prototype.isTernary =
                !BooleanSlotMorph.prototype.isTernary;
        },
        BooleanSlotMorph.prototype.isTernary,
        'uncheck to only\ntoggle true / false\noutside of rings',
        'check to enable toggling\nBoolean slots to empty'
    );
    addPreference(
        'Codification support',
        function () {
            StageMorph.prototype.enableCodeMapping =
                !StageMorph.prototype.enableCodeMapping;
            myself.currentSprite.blocksCache.variables = null;
            myself.currentSprite.paletteCache.variables = null;
            myself.refreshPalette();
        },
        StageMorph.prototype.enableCodeMapping,
        'uncheck to disable\nblock to text mapping features',
        'check for block\nto text mapping features',
        false
    );
    addPreference(
        'Inheritance support',
        function () {
            StageMorph.prototype.enableInheritance =
                !StageMorph.prototype.enableInheritance;
            myself.currentSprite.blocksCache.variables = null;
            myself.currentSprite.paletteCache.variables = null;
            myself.refreshPalette();
        },
        StageMorph.prototype.enableInheritance,
        'uncheck to disable\nsprite inheritance features',
        'check for sprite\ninheritance features',
        false
    );
    addPreference(
        'Persist linked sublist IDs',
        function () {
            StageMorph.prototype.enableSublistIDs =
                !StageMorph.prototype.enableSublistIDs;
        },
        StageMorph.prototype.enableSublistIDs,
        'uncheck to disable\nsaving linked sublist identities',
        'check to enable\nsaving linked sublist identities',
        true
    );
    menu.popup(world, pos);
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
    if (!projectName) {
        this.updateUrlQueryString();
    }
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
        this.room.ownerId = next.ownerId;
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
    SnapUndo.reset();
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

    // Netsblox addition: start
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
    // Netsblox addition: end

    menu = new MenuMorph(this);
    menu.addItem('Project notes...', 'editProjectNotes');
    menu.addLine();
    menu.addPair('New', 'createNewProject', '^N');
    menu.addPair('Open...', 'openProjectsBrowser', '^O');
    menu.addPair('Save', "save", '^S');
    menu.addItem('Save As...', function() {
        if (myself.isPreviousVersion()) {
            return myself.showMessage('Please exit replay mode before saving');
        }

        myself.saveProjectsBrowser();
    });
    if (shiftClicked) {
        menu.addItem(
            localize('Download replay events'),
            function() {
                myself.saveFileAs(
                    JSON.stringify(SnapUndo.allEvents, null, 2),
                    'text/json;charset=utf-8',
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
                if (SnapUndo.allEvents.length > 1) {
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
            inp.style.color = "transparent";
            inp.style.backgroundColor = "transparent";
            inp.style.border = "none";
            inp.style.outline = "none";
            inp.style.position = "absolute";
            inp.style.top = "0px";
            inp.style.left = "0px";
            inp.style.width = "0px";
            inp.style.height = "0px";
            inp.style.display = "none";
            inp.addEventListener(
                "change",
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
    menu.addItem(
        'Libraries...',
        function() {
            myself.getURL(
                myself.resourceURL('libraries', 'LIBRARIES'),
                function (txt) {
                    var libraries = myself.parseResourceFile(txt);
                    new LibraryImportDialogMorph(myself, libraries).popUp();
                }
            );
        },
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
NetsBloxMorph.prototype.openRoomString = function (str, isRaw) {
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
    if (isRaw) {
        this.rawOpenCloudDataString(room.children[0], true);
    } else {
        this.openCloudDataString(room.children[0], true);
    }
};

NetsBloxMorph.prototype.openCloudDataString = function (model, parsed) {
    var msg,
        myself = this,
        str = parsed ? model : model.toString(),
        size = Math.round(str.length / 1024);

    this.exitReplayMode();
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
    if (this.isPreviousVersion()) {
        return this.showMessage('Please exit replay mode before saving');
    }

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
                myself.updateUrlQueryString();
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
    this.updateUrlQueryString(newRoom, isPublic === 'true');
};

NetsBloxMorph.prototype.updateUrlQueryString = function (room, isPublic, isExample) {
    var url = location.pathname;

    room = room || this.room._name;
    if (isExample) {
        url += '?action=example&ProjectName=' + encodeURIComponent(room);
    } else if (isPublic) {
        url += '?action=present&Username=' + encodeURIComponent(SnapCloud.username) +
            '&ProjectName=' + encodeURIComponent(room);
    }

    window.history.pushState(room, room, url);
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

// Collaboration
NetsBloxMorph.prototype.manageCollaborators = function () {
    var myself = this,
        ownerId = this.room.ownerId,
        name = this.room.name,
        role = this.projectName,
        socketId = this.sockets.uuid;

    if (!SnapActions.isCollaborating()) {
        SnapActions.enableCollaboration();
    }

    SnapCloud.getCollaboratorList(
        function(friends) {
            friends.sort(function(a, b) {
                return a.username.toLowerCase() < b.username.toLowerCase() ? -1 : 1;
            });
            new CollaboratorDialogMorph(
                myself,
                function(user) {
                    if (user) {
                        SnapCloud.inviteToCollaborate(socketId, user.username, ownerId, name, role);
                    }
                },
                friends,
                'Invite a Friend to Collaborate'
            ).popUp();
        },
        function (err, lbl) {
            myself.cloudError().call(null, err, lbl);
        }
    );
};

NetsBloxMorph.prototype.promptCollabInvite = function (params) {  // id, room, roomName, role
    // Create a confirm dialog about joining the group
    var myself = this,
        // unpack the params
        id = params.id,
        roomName = params.roomName,

        action = this.collabResponse.bind(this, id, true),
        dialog = new DialogBoxMorph(null, action),
        enabled = false,
        msg;

    if (!SnapActions.isCollaborating()) {
        SnapActions.enableCollaboration();
        enabled = true;
    }

    if (params.inviter === SnapCloud.username) {
        msg = 'Would you like to collaborate at "' + roomName + '"?';
    } else {
        msg = params.inviter + ' has invited you to collaborate with\nhim/her at "' + roomName +
            '"\nAccept?';
    }

    dialog.cancel = function() {
        myself.collabResponse(id, false);
        if (enabled) {
            SnapActions.disableCollaboration();
        }
        this.destroy();
    };

    dialog.askYesNo(
        'Collaboration Invitation',
        localize(msg),
        this.world()
    );
};

NetsBloxMorph.prototype.collabResponse = function (id, response) {
    var myself = this;

    SnapCloud.collabResponse(
        id,
        response, 
        function() {
            myself.showMessage('Collaborating!', 2);
        },
        function(err){
            myself.showMessage(err, 2);
        }
    );
};
