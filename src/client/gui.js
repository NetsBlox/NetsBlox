/* globals ProjectDialogMorph, world, colors, ensureFullUrl, Morph, AlignmentMorph, InputFieldMorph, localize,
   Point, TextMorph, Color, nop, ListMorph, IDE_Morph, Process, BlockImportDialogMorph,
   BlockExportDialogMorph, detect, SnapCloud, SnapSerializer, ScrollFrameMorph,
   DialogBoxMorph, SnapActions, SpeechBubbleMorph
   */
const NUM_BUTTONS = 2,
    BUTTON_SIZE = {
        width: 200,
        height: 100
    },
    GAP = 50;
// TODO move var definitions 

function getNbMorph() {
    return world.children[0];
}

function controlBarButtons() {
    var cb = getNbMorph().controlBar;
    var buttons = [];
    for (var key in cb) {
        var val = cb[key];
        if (val instanceof ToggleButtonMorph || val instanceof PushButtonMorph) buttons.push(val);
    }
    return buttons;
}

var mobileMode = {
    // assuming top pos for horizontal alignment and right for vertical
    _stackMode: 'h' // stack controls horizontally or vertically
};

// activate mobilemode
mobileMode.init = function() {

    getNbMorph().toggleAppMode(true);
    this.hideButtons();
    this.transformButtons();
};

mobileMode.hideButtons = function() {
    controlBarButtons().forEach(btn => btn.hide());
};

mobileMode.emptySpaces = function() {
    const h = window.innerHeight,
        w = window.innerWidth,
        bounds = world.children[0].stage.bounds;
    const spaces = {
        top: bounds.origin.y,
        left: bounds.origin.x,
        right: w - bounds.corner.x,
        bottom: h - bounds.corner.y
    };
    return spaces;
};


mobileMode.optimalRectangle = function(spaces) {
    // assuming stage is centered
    // WARN stage could fill up the whole window
    let bestSide,
        stage = world.children[0].stage;
    let rect = {
        topRight: {
            x: window.innerWidth,
            y: 0
        },
        bottomLeft: {}
    };

    if (spaces.top > spaces.right) {
        this._stackMode = 'h';
        bestSide = 'top';
    } else {
        this._stackMode = 'v';
        bestSide = 'right';
    }
    if (spaces[bestSide] < 50) throw new Error('no optimal side.');
    switch(bestSide) {
    case 'right':
        rect.bottomLeft.x = stage.bounds.corner.x;
        rect.bottomLeft.y = window.innerHeight;
        break;
    case 'top':
        rect.bottomLeft.x = 0;
        rect.bottomLeft.y = stage.bounds.origin.y;
        break;
    }
    rect.height = Math.abs(rect.topRight.y - rect.bottomLeft.y);
    rect.width = Math.abs(rect.topRight.x - rect.bottomLeft.x);
    return rect;
};

mobileMode.computeControlPos = function() {
    let totalH = window.innerHeight,
        totalW = window.innerWidth,
        stageBounds = getNbMorph().stage.bounds,
        spaces = this.emptySpaces(),
        controls;

    let targetRect = this.optimalRectangle(spaces);
    // stack button vertically or horizontally
    if  (this._stackMode === 'v') {
        // stack vertically
        controls = {
            origin: {},
            height: NUM_BUTTONS * BUTTON_SIZE.height + (NUM_BUTTONS-1) * GAP,
            width: BUTTON_SIZE.width,
        };
        controls.origin.y = (totalH - controls.height) / 2;
        controls.origin.x = targetRect.bottomLeft.x + (targetRect.width - controls.width) / 2;

    } else if (this._stackMode === 'h') {
        //stack vertically
        controls = {
            origin: {},
            width: NUM_BUTTONS * BUTTON_SIZE.width + (NUM_BUTTONS-1) * GAP,
            height: BUTTON_SIZE.height,
        };
        controls.origin.x = (totalW - controls.width) / 2;
        controls.origin.y = (targetRect.bottomLeft.y - controls.height)/2;
    }
    return controls;
};

mobileMode.createButtons = function(box) {
    let controlBar = new Morph();
    // controlBar.color = this.frameColor;
    // TODO fluid dimensions?
    controlBar.setHeight(box.height); // height is fixed
    controlBar.setWidth(box.width); // width is fixed

    // stopButton
    var stopButton = new ToggleButtonMorph(
        null, // colors
        this, // the IDE is the target
        'stopAllScripts',
        [
            new SymbolMorph('octagon', 14),
            new SymbolMorph('square', 14)
        ],
        function () {  // query
            return getNbMorph().stage ?
                getNbMorph().stage.enableCustomHatBlocks &&
                        getNbMorph().stage.threads.pauseCustomHatBlocks
                : true;
        }
    );
    stopButton.corner = 12;
    stopButton.color = colors[0];
    stopButton.highlightColor = colors[1];
    stopButton.pressColor = colors[2];
    stopButton.labelMinExtent = new Point(36, 18);
    stopButton.padding = 0;
    stopButton.labelShadowOffset = new Point(-1, -1);
    stopButton.labelShadowColor = colors[1];
    stopButton.labelColor = new Color(200, 0, 0);
    stopButton.contrast = this.buttonContrast;
    stopButton.drawNew();
    stopButton.fixLayout();
    stopButton.refresh();

    var startButton = new PushButtonMorph(
        this,
        'pressStart',
        new SymbolMorph('flag', 14)
    );
    startButton.corner = 12;
    startButton.color = colors[0];
    startButton.highlightColor = colors[1];
    startButton.pressColor = colors[2];
    startButton.labelMinExtent = new Point(36, 18);
    startButton.padding = 0;
    startButton.labelShadowOffset = new Point(-1, -1);
    startButton.labelShadowColor = colors[1];
    startButton.labelColor = new Color(0, 200, 0);
    startButton.contrast = this.buttonContrast;
    startButton.drawNew();
    // startButton.hint = 'start green\nflag scripts';
    startButton.fixLayout();

    controlBar.add(startButton, stopButton);
};

mobileMode.transformButtons = function() {
    const controls = this.computeControlPos(),
        cb = getNbMorph().controlBar,
        buttons = [
            cb.startButton,
            cb.stopButton
        ];
    // cb.hide();
    // resize
    buttons.forEach(but => {
        but.setWidth(BUTTON_SIZE.width);
        but.setHeight(BUTTON_SIZE.height);
    });

    // cb.setWidth(controls.width);
    // cb.setHeight(controls.height);
    // cb.setPosition(new Point(controls.origin.x, controls.origin.y));
    // cb.fixLayout();

    // set button positions manually
    buttons.forEach( (button, idx) => {
        let x,y;
        if (this._stackMode === 'v') {
            x = controls.origin.x;
            y = controls.origin.y + idx * BUTTON_SIZE.height + idx * GAP;
        } else if (this._stackMode === 'h') {
            y = controls.origin.y;
            x = controls.origin.x + idx * BUTTON_SIZE.width + idx * GAP;
        }
        button.setPosition(new Point(x, y));
        button.show();
    });

};

ProjectDialogMorph.prototype.buildContents = function () {
    var thumbnail, notification;

    this.addBody(new Morph());
    this.body.color = this.color;

    this.srcBar = new AlignmentMorph('column', this.padding / 2);

    if (this.ide.cloudMsg) {
        notification = new TextMorph(
            this.ide.cloudMsg,
            10,
            null, // style
            false, // bold
            null, // italic
            null, // alignment
            null, // width
            null, // font name
            new Point(1, 1), // shadow offset
            new Color(255, 255, 255) // shadowColor
        );
        notification.refresh = nop;
        this.srcBar.add(notification);
    }

    this.addSourceButton('cloud', localize('Cloud'), 'cloud');
    // NetsBlox changes start
    if (this.task === 'open') {
        this.addSourceButton('cloud-shared', localize('Shared with me'), 'cloud');
    }
    // NetsBlox changes end
    this.addSourceButton('local', localize('Browser'), 'storage');
    if (this.task === 'open') {
        this.buildFilterField();
        this.addSourceButton('examples', localize('Examples'), 'poster');
    }
    this.srcBar.fixLayout();
    this.body.add(this.srcBar);

    if (this.task === 'save') {
        // NetsBlox changes start
        this.nameField = new InputFieldMorph(this.ide.room.name);
        // NetsBlox changes end
        this.body.add(this.nameField);
    }

    this.listField = new ListMorph([]);
    this.fixListFieldItemColors();
    this.listField.fixLayout = nop;
    this.listField.edge = InputFieldMorph.prototype.edge;
    this.listField.fontSize = InputFieldMorph.prototype.fontSize;
    this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    this.listField.contrast = InputFieldMorph.prototype.contrast;
    this.listField.drawNew = InputFieldMorph.prototype.drawNew;
    this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    this.body.add(this.listField);

    this.preview = new Morph();
    this.preview.fixLayout = nop;
    this.preview.edge = InputFieldMorph.prototype.edge;
    this.preview.fontSize = InputFieldMorph.prototype.fontSize;
    this.preview.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    this.preview.contrast = InputFieldMorph.prototype.contrast;
    this.preview.drawNew = function () {
        InputFieldMorph.prototype.drawNew.call(this);
        if (this.texture) {
            this.drawTexture(this.texture);
        }
    };
    this.preview.drawCachedTexture = function () {
        var context = this.image.getContext('2d');
        // NetsBlox changes: start
        var scale = Math.min(
                (this.width() / this.cachedTexture.width),
                (this.height() / this.cachedTexture.height)
            ),
            width = scale * this.cachedTexture.width,
            height = scale * this.cachedTexture.height;

        context.drawImage(this.cachedTexture, this.edge, this.edge,
            width, height);

        // NetsBlox changes: end
        this.changed();
    };
    this.preview.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;
    this.preview.setExtent(
        // NetsBlox changes: start
        this.ide.serializer.thumbnailSize.divideBy(4).add(this.preview.edge * 2)
        // NetsBlox changes: end
    );

    this.body.add(this.preview);
    this.preview.drawNew();
    if (this.task === 'save') {
        thumbnail = this.ide.stage.thumbnail(
            SnapSerializer.prototype.thumbnailSize
        );
        this.preview.texture = null;
        this.preview.cachedTexture = thumbnail;
        this.preview.drawCachedTexture();
    }

    this.notesField = new ScrollFrameMorph();
    this.notesField.fixLayout = nop;

    this.notesField.edge = InputFieldMorph.prototype.edge;
    this.notesField.fontSize = InputFieldMorph.prototype.fontSize;
    this.notesField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    this.notesField.contrast = InputFieldMorph.prototype.contrast;
    this.notesField.drawNew = InputFieldMorph.prototype.drawNew;
    this.notesField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    this.notesField.acceptsDrops = false;
    this.notesField.contents.acceptsDrops = false;

    if (this.task === 'open') {
        this.notesText = new TextMorph('');
    } else { // 'save'
        this.notesText = new TextMorph(this.ide.projectNotes);
        this.notesText.isEditable = true;
        this.notesText.enableSelecting();
    }

    this.notesField.isTextLineWrapping = true;
    this.notesField.padding = 3;
    this.notesField.setContents(this.notesText);
    this.notesField.setWidth(this.preview.width());

    this.body.add(this.notesField);

    if (this.task === 'open') {
        this.addButton('openProject', 'Open');
        this.action = 'openProject';
    } else { // 'save'
        this.addButton('saveProject', 'Save');
        this.action = 'saveProject';
    }
    // Netsblox addition: start
    this.shareButton = this.addButton('shareProject', 'Publish');
    this.unshareButton = this.addButton('unshareProject', 'Unpublish');
    // Netsblox addition: end
    this.shareButton.hide();
    this.unshareButton.hide();
    this.deleteButton = this.addButton('deleteProject', 'Delete');
    this.addButton('cancel', 'Cancel');

    if (notification) {
        // NetsBlox changes: start
        this.setExtent(new Point(455, 385).add(notification.extent()));
    } else {
        this.setExtent(new Point(455, 385));
        // NetsBlox changes: end
    }
    this.fixLayout();

};

ProjectDialogMorph.prototype._deleteProject =
    ProjectDialogMorph.prototype.deleteProject;

ProjectDialogMorph.prototype.deleteProject = function () {
    if (this.source === 'cloud-shared') {
        // Remove self from list of collabs
        var name = this.listField.selected.ProjectName;
        this.ide.confirm(
            localize(
                'Are you sure you want to delete'
            ) + '\n"' + name + '"?',
            'Delete Project',
            function() {
                SnapCloud.evictCollaborator(SnapCloud.username);
            }
        );
    } else {
        this._deleteProject();
    }
};

ProjectDialogMorph.prototype.shareProject = function () {
    var myself = this,
        ide = this.ide,
        proj = this.listField.selected,
        entry = this.listField.active;

    if (proj) {
        this.ide.confirm(
            localize(
                'Are you sure you want to publish'
            ) + '\n"' + proj.ProjectName + '"?',
            'Share Project',
            function () {
                myself.ide.showMessage('sharing\nproject...');
                SnapCloud.reconnect(
                    function () {
                        SnapCloud.callService(
                            'publishProject',
                            function () {
                                SnapCloud.disconnect();
                                proj.Public = 'true';
                                myself.unshareButton.show();
                                myself.shareButton.hide();
                                entry.label.isBold = true;
                                entry.label.drawNew();
                                entry.label.changed();
                                myself.buttons.fixLayout();
                                myself.drawNew();
                                myself.ide.showMessage('shared.', 2);
                            },
                            myself.ide.cloudError(),
                            [proj.ProjectName]
                        );
                        // Set the Shared URL if the project is currently open
                        if (proj.ProjectName === ide.projectName) {
                            // Netsblox addition: start
                            myself.ide.updateUrlQueryString(proj.ProjectName, true);
                            // Netsblox addition: end
                        }
                    },
                    myself.ide.cloudError()
                );
            }
        );
    }
};

ProjectDialogMorph.prototype.unshareProject = function () {
    var myself = this,
        ide = this.ide,
        proj = this.listField.selected,
        entry = this.listField.active;


    if (proj) {
        this.ide.confirm(
            localize(
                'Are you sure you want to unpublish'
            ) + '\n"' + proj.ProjectName + '"?',
            'Unshare Project',
            function () {
                myself.ide.showMessage('unsharing\nproject...');
                SnapCloud.reconnect(
                    function () {
                        SnapCloud.callService(
                            'unpublishProject',
                            function () {
                                SnapCloud.disconnect();
                                proj.Public = 'false';
                                myself.shareButton.show();
                                myself.unshareButton.hide();
                                entry.label.isBold = false;
                                entry.label.drawNew();
                                entry.label.changed();
                                myself.buttons.fixLayout();
                                myself.drawNew();
                                myself.ide.showMessage('unshared.', 2);
                            },
                            myself.ide.cloudError(),
                            [proj.ProjectName]
                        );
                        // Remove the shared URL if the project is open.
                        if (proj.ProjectName === ide.projectName) {
                            // Netsblox addition: start
                            myself.ide.updateUrlQueryString(proj.ProjectName, false);
                            // Netsblox addition: end
                        }
                    },
                    myself.ide.cloudError()
                );
            }
        );
    }
};

// adapted from installCloudProjectList
ProjectDialogMorph.prototype.installShareCloudProjectList = function (pl) {
    var myself = this;
    this.projectList = pl || [];
    this.projectList.sort(function (x, y) {
        return x.ProjectName.toLowerCase() < y.ProjectName.toLowerCase() ?
            -1 : 1;
    });

    this.listField.destroy();
    this.listField = new ListMorph(
        this.projectList,
        this.projectList.length > 0 ?
            function (element) {
                return element.ProjectName || element;
            } : null,
        [ // format: display shared project names bold
            [
                'bold',
                function (proj) {return proj.Public === 'true'; }
            ]
        ],
        function () {myself.ok(); }
    );
    this.fixListFieldItemColors();
    this.listField.fixLayout = nop;
    this.listField.edge = InputFieldMorph.prototype.edge;
    this.listField.fontSize = InputFieldMorph.prototype.fontSize;
    this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    this.listField.contrast = InputFieldMorph.prototype.contrast;
    this.listField.drawNew = InputFieldMorph.prototype.drawNew;
    this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    this.listField.action = function (item) {
        if (item === undefined) {return; }
        if (myself.nameField) {
            myself.nameField.setContents(item.ProjectName || '');
        }
        if (myself.task === 'open') {
            myself.notesText.text = item.Notes || '';
            myself.notesText.drawNew();
            myself.notesField.contents.adjustBounds();
            myself.preview.texture = item.Thumbnail || null;
            myself.preview.cachedTexture = null;
            myself.preview.drawNew();
            (new SpeechBubbleMorph(new TextMorph(
            // Netsblox addition: start
                localize('owner') + ': ' + item.Owner + '\n' +
                localize('last changed') + '\n' + item.Updated,
                // Netsblox addition: end
                null,
                null,
                null,
                null,
                'center'
            ))).popUp(
                myself.world(),
                myself.preview.rightCenter().add(new Point(2, 0))
            );
        }
        if (item.Public === 'true') {
            myself.shareButton.hide();
            myself.unshareButton.show();
        } else {
            myself.unshareButton.hide();
            myself.shareButton.show();
        }
        myself.buttons.fixLayout();
        myself.fixLayout();
        myself.edit();
    };
    this.body.add(this.listField);
    this.shareButton.show();
    this.unshareButton.hide();
    this.deleteButton.show();
    this.buttons.fixLayout();
    this.fixLayout();
    if (this.task === 'open') {
        this.clearDetails();
    }
};

ProjectDialogMorph.prototype.setSource = function (source) {
    var myself = this,
        msg;

    this.source = source; //this.task === 'save' ? 'local' : source;
    this.srcBar.children.forEach(function (button) {
        button.refresh();
    });
    switch (this.source) {
    case 'cloud':
        msg = myself.ide.showMessage('Updating\nproject list...');
        this.projectList = [];
        SnapCloud.getProjectList(
            function (projectList) {
                // Don't show cloud projects if user has since switch panes.
                if (myself.source === 'cloud') {
                    myself.installCloudProjectList(projectList);
                }
                msg.destroy();
            },
            function (err, lbl) {
                msg.destroy();
                myself.ide.cloudError().call(null, err, lbl);
            }
        );
        return;
    // Netsblox addition: start
    case 'cloud-shared':
        msg = myself.ide.showMessage('Updating\nproject list...');
        this.projectList = [];
        SnapCloud.getSharedProjectList(
            function (projectList) {
                // Don't show cloud projects if user has since switch panes.
                if (myself.source === 'cloud-shared') {
                    myself.installShareCloudProjectList(projectList);
                }
                msg.destroy();
            },
            function (err, lbl) {
                msg.destroy();
                myself.ide.cloudError().call(null, err, lbl);
            }
        );
        return;
    // Netsblox addition: end
    case 'examples':
        this.projectList = this.getExamplesProjectList();
        break;
    case 'local':
        this.projectList = this.getLocalProjectList();
        break;
    }

    this.listField.destroy();
    this.listField = new ListMorph(
        this.projectList,
        this.projectList.length > 0 ?
            function (element) {
                return element.name;
            } : null,
        null,
        function () {myself.ok(); }
    );

    this.fixListFieldItemColors();
    this.listField.fixLayout = nop;
    this.listField.edge = InputFieldMorph.prototype.edge;
    this.listField.fontSize = InputFieldMorph.prototype.fontSize;
    this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    this.listField.contrast = InputFieldMorph.prototype.contrast;
    this.listField.drawNew = InputFieldMorph.prototype.drawNew;
    this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    if (this.source === 'local') {
        this.listField.action = function (item) {
            var src, xml;

            if (item === undefined) {return; }
            if (myself.nameField) {
                myself.nameField.setContents(item.name || '');
            }
            if (myself.task === 'open') {

                src = localStorage['-snap-project-' + item.name];
                xml = myself.ide.serializer.parse(src);
                // NetsBlox changes - start
                // Select a role to display
                xml = xml.children[0].children[0];
                // NetsBlox changes - end

                myself.notesText.text = xml.childNamed('notes').contents
                    || '';
                myself.notesText.drawNew();
                myself.notesField.contents.adjustBounds();
                myself.preview.texture = xml.childNamed('thumbnail').contents
                    || null;
                myself.preview.cachedTexture = null;
                myself.preview.drawNew();
            }
            myself.edit();
        };
    } else { // 'examples'; 'cloud' is initialized elsewhere
        // NetsBlox changes - start
        this.listField.action = function(item) {
            var src, xml;
            if (item === undefined) {return; }
            if (myself.nameField) {
                myself.nameField.setContents(item.name || '');
            }
            src = myself.ide.getURL(
                'api/Examples/' + item.name + '?&preview=true'
            );

            xml = myself.ide.serializer.parse(src);
            myself.notesText.text = xml.childNamed('notes').contents
                || '';
            myself.notesText.drawNew();
            myself.notesField.contents.adjustBounds();
            myself.preview.texture = xml.childNamed('thumbnail').contents
                || null;
            myself.preview.cachedTexture = null;
            myself.preview.drawNew();
            myself.edit();
        };
        // NetsBlox changes - end
    }
    this.body.add(this.listField);
    this.shareButton.hide();
    this.unshareButton.hide();
    if (this.source === 'local') {
        this.deleteButton.show();
    } else { // examples
        this.deleteButton.hide();
    }
    this.buttons.fixLayout();
    this.fixLayout();
    if (this.task === 'open') {
        this.clearDetails();
    }
};

var superOpenProj = ProjectDialogMorph.prototype.openProject;
ProjectDialogMorph.prototype.openProject = function () {
    var proj = this.listField.selected,
        response;

    if (this.source === 'examples') {
        this.destroy();
        response = this.ide.getURL('api/Examples/' + proj.name);
        this.ide.droppedText(response);
        // role name
        this.ide.updateUrlQueryString(proj.name, false, true);
    } else if (this.source === 'cloud-shared'){
        var myself = this;
        myself.destroy();
        SnapCloud.callService('joinActiveProject', function(response) {
            myself.ide.rawLoadCloudProject(response[0], proj.Public);
        }, myself.ide.cloudError(), [proj.ProjectName, proj.Owner]);
    } else {
        return superOpenProj.call(this);
    }
};

ProjectDialogMorph.prototype.openCloudProject = function (project) {
    var myself = this,
        msg;

    this.destroy();
    myself.ide.nextSteps([
        function () {
            msg = myself.ide.showMessage('Fetching project\nfrom the cloud...');
        },
        function () {
            SnapCloud.reconnect(function() {
                var isReopen = project.ProjectName === myself.ide.room.name,
                    roles = Object.keys(myself.ide.room.roles),
                    onlyMe = roles.filter(function(roleName) {
                        return !!myself.ide.room.roles[roleName];
                    }).length === 1;

                if (isReopen && onlyMe) {  // reopening own project
                    myself.rawOpenCloudProject(project);
                } else {
                    SnapCloud.isProjectActive(
                        project.ProjectName,
                        function(isActive) {
                            var choices,
                                dialog;

                            if (isActive) {
                                // Prompt if we should join the project or open new
                                dialog = new DialogBoxMorph(null, nop);
                                choices = {};
                                choices['Join Existing'] = function() {
                                    SnapCloud.callService('joinActiveProject', function(response) {
                                        myself.ide.rawLoadCloudProject(response[0], project.Public);
                                    }, myself.ide.cloudError(), [project.ProjectName, project.Owner]);
                                    dialog.destroy();
                                    myself.destroy();
                                };
                                choices['Create Copy'] = function() {
                                    myself.rawOpenCloudProject(project);
                                    dialog.destroy();
                                };
                                dialog.ask(
                                    localize('Join Existing Project'),
                                    localize('This project is already open. Would you like to join\n' +
                                        'the active one or create a new copy?'),
                                    myself.world(),
                                    choices
                                );
                            } else {
                                myself.rawOpenCloudProject(project);
                            }
                        },
                        myself.ide.cloudError()
                    );
                }
            }, myself.ide.cloudError());

        },
        function() {
            msg.destroy();
        }
    ]);
};

ProjectDialogMorph.prototype.rawOpenCloudProject = function (proj) {
    var myself = this,
        msg = myself.ide.showMessage('Fetching project\nfrom the cloud...');

    SnapCloud.reconnect(
        function () {
            SnapCloud.callService(
                'getProject',
                function (response) {
                    msg.destroy();
                    myself.ide.rawLoadCloudProject(response[0], proj.Public);
                },
                myself.ide.cloudError(),
                [proj.Owner, proj.ProjectName, SnapCloud.socketId()]
            );
        },
        myself.ide.cloudError()
    );
};

ProjectDialogMorph.prototype.saveProject = function () {
    var name = this.nameField.contents().text.text,
        notes = this.notesText.text,
        myself = this;

    this.ide.projectNotes = notes || this.ide.projectNotes;
    // NetsBlox changes - start
    if (/[\.@]+/.test(name)) {
        this.ide.inform(
            'Invalid Project Name',
            'Could not save project because\n' +
            'the provided name contains illegal characters.',
            this.world()
        );
        return;
    }
    // NetsBlox changes - end
    if (name) {
        if (this.source === 'cloud') {
            if (detect(
                this.projectList,
                function (item) {return item.ProjectName === name; }
            )) {
                this.ide.confirm(
                    localize(
                        'Are you sure you want to replace'
                    ) + '\n"' + name + '"?',
                    'Replace Project',
                    function () {
                        // NetsBlox changes - start
                        myself.ide.showMessage('Saving project\nto the cloud...');
                        SnapCloud.saveProject(
                            myself.ide,
                            function () {
                                myself.ide.source = 'cloud';
                                myself.ide.showMessage('Saved to cloud!', 2);
                            },
                            myself.ide.cloudError(),
                            true,
                            name
                        );
                        myself.destroy();
                        // NetsBlox changes - end
                    }
                );
            } else {
                // NetsBlox changes - start
                myself.ide.showMessage('Saving project\nto the cloud...');
                SnapCloud.saveProject(
                    myself.ide,
                    function () {
                        myself.ide.source = 'cloud';
                        myself.ide.showMessage('Saved to cloud!', 2);
                    },
                    myself.ide.cloudError(),
                    true,
                    name
                );
                myself.destroy();
                // NetsBlox changes - end
            }
        } else { // 'local'
            if (detect(
                this.projectList,
                function (item) {return item.name === name; }
            )) {
                this.ide.confirm(
                    localize(
                        'Are you sure you want to replace'
                    ) + '\n"' + name + '"?',
                    'Replace Project',
                    function () {
                        // NetsBlox changes - start
                        myself.ide.room.name = name;
                        // NetsBlox changes - end
                        myself.ide.source = 'local';
                        myself.ide.saveProject(name);
                        myself.destroy();
                    }
                );
            } else {
                // NetsBlox changes - start
                this.ide.room.name = name;
                // NetsBlox changes - end
                myself.ide.source = 'local';
                this.ide.saveProject(name);
                this.destroy();
            }
        }
    }
};

////////////////////////////////////////////////////
// Override submodule for exporting of message types
////////////////////////////////////////////////////

IDE_Morph.prototype.exportGlobalBlocks = function () {
    if (this.stage.globalBlocks.length > 0 || this.stage.deletableMessageNames().length) {
        new BlockExportDialogMorph(
            this.serializer,
            this.stage.globalBlocks,
            this.stage
        ).popUp(this.world());
    } else {
        this.inform(
            'Export blocks/msg types',
            'this project doesn\'t have any\n'
                + 'custom global blocks or message types yet'
        );
    }
};


IDE_Morph.prototype._getURL = IDE_Morph.prototype.getURL;
IDE_Morph.prototype.getURL = function (url, callback) {
    url = ensureFullUrl(url);
    return this._getURL(url, callback);
};

IDE_Morph.prototype.rawOpenBlocksString = function (str, name, silently) {
    // name is optional (string), so is silently (bool)
    var blocks,
        myself = this,
        msgTypes;

    if (Process.prototype.isCatchingErrors) {
        try {
            blocks = this.serializer.loadBlocks(str, myself.stage);
            msgTypes = this.serializer.parse(str).childrenNamed('messageType');
        } catch (err) {
            this.showMessage('Load failed: ' + err);
        }
    } else {
        blocks = this.serializer.loadBlocks(str, myself.stage);
        msgTypes = this.serializer.parse(str).childrenNamed('messageType');
    }
    if (silently) {
        msgTypes.forEach(function(msgType) {
            var name = msgType.childNamed('name').contents,
                fields = msgType.childNamed('fields').children.map(function(field) {
                    return field.contents;
                });

            myself.stage.addMessageType({
                name: name,
                fields: fields
            });
        });

        blocks.forEach(function (def) {
            def.receiver = myself.stage;
            myself.stage.globalBlocks.push(def);
            myself.stage.replaceDoubleDefinitionsFor(def);
        });
        this.flushBlocksCache();
        this.flushPaletteCache();
        this.refreshPalette();
        this.showMessage(
            'Imported Blocks / Message Types Module' + (name ? ': ' + name : '') + '.',
            2
        );
        SnapActions.loadCustomBlocks(blocks);
    } else {
        new BlockImportDialogMorph(blocks, this.stage, name).popUp();
    }
};
