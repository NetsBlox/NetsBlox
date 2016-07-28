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
    this.addSourceButton('local', localize('Browser'), 'storage');
    if (this.task === 'open') {
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
        context.drawImage(this.cachedTexture, this.edge, this.edge);
        this.changed();
    };
    this.preview.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;
    this.preview.setExtent(
        this.ide.serializer.thumbnailSize.add(this.preview.edge * 2)
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
    this.shareButton = this.addButton('shareProject', 'Share');
    this.unshareButton = this.addButton('unshareProject', 'Unshare');
    this.shareButton.hide();
    this.unshareButton.hide();
    this.deleteButton = this.addButton('deleteProject', 'Delete');
    this.addButton('cancel', 'Cancel');

    if (notification) {
        this.setExtent(new Point(455, 335).add(notification.extent()));
    } else {
        this.setExtent(new Point(455, 335));
    }
    this.fixLayout();

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
            src = JSON.parse(myself.ide.getURL(
                'api/Examples/' + item.name + '?socketId=' + myself.ide.sockets.uuid +
                '&preview=true'
            )).src.SourceCode;

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
        response = JSON.parse(this.ide.getURL('api/Examples/' + proj.name +
            '?socketId=' + this.ide.sockets.uuid));
        this.ide.room.nextRoom = {
            ownerId: response.ownerId,
            roomName: response.roomName,
            roleId: response.role
        };

        // role name
        if (response.src.SourceCode) {
            this.ide.openProjectString(response.src.SourceCode);
        } else {
            this.ide.clearProject();
        }
        this.ide.loadNextRoom();
        this.destroy();
    } else {
        return superOpenProj.call(this);
    }
};

ProjectDialogMorph.prototype.rawOpenCloudProject = function (proj) {
    var myself = this,
        newRoom = proj.ProjectName,
        ide = this.ide;  // project name from the list

    SnapCloud.reconnect(
        function () {
            SnapCloud.callService(
                'getProject',
                function (response) {
                    var roleId = response[0].ProjectName;  // src proj name
                    ide.source = 'cloud';
                    if (response[0].SourceCode) {
                        ide.droppedText(response[0].SourceCode);
                        ide.room.nextRoom = {
                            ownerId: SnapCloud.username,
                            roomName: newRoom,
                            roleId: roleId
                        };
                    } else {  // initialize an empty code base
                        ide.clearProject();
                        ide.room._name = newRoom;  // silent set name
                        // FIXME: this could cause problems later
                        ide.room.ownerId = SnapCloud.username;
                        ide.silentSetProjectName(roleId);
                        ide.sockets.updateRoomInfo();
                    }
                    if (proj.Public === 'true') {
                        location.hash = '#present:Username=' +
                            encodeURIComponent(SnapCloud.username) +
                            '&ProjectName=' +
                            encodeURIComponent(proj.ProjectName);
                    }
                },
                myself.ide.cloudError(),
                [proj.ProjectName]
            );
        },
        myself.ide.cloudError()
    );
    this.destroy();
};

ProjectDialogMorph.prototype.saveProject = function () {
    var name = this.nameField.contents().text.text,
        notes = this.notesText.text,
        myself = this;

    this.ide.projectNotes = notes || this.ide.projectNotes;
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
                        myself.ide.room.name = name;
                        myself.saveCloudProject();
                    }
                );
            } else {
                myself.ide.room.name = name;
                myself.saveCloudProject();
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

IDE_Morph.prototype.rawOpenBlocksString = function (str, name, silently) {
    // name is optional (string), so is silently (bool)
    var blocks,
        myself = this;
    if (Process.prototype.isCatchingErrors) {
        try {
            blocks = this.serializer.loadBlocks(str, myself.stage);
        } catch (err) {
            this.showMessage('Load failed: ' + err);
        }
    } else {
        blocks = this.serializer.loadBlocks(str, myself.stage);
    }
    if (silently) {
        blocks.forEach(function (def) {
            // Message type import
            if (def.category === 'msg') {
                myself.stage.addMessageType(JSON.parse(def.spec));
            } else {  // Block import
                def.receiver = myself.stage;
                myself.stage.globalBlocks.push(def);
                myself.stage.replaceDoubleDefinitionsFor(def);
            }
        });
        this.flushBlocksCache();
        this.flushPaletteCache();
        this.refreshPalette();
        this.showMessage(
            'Imported Blocks / Message Types Module' + (name ? ': ' + name : '') + '.',
            2
        );
    } else {
        new BlockImportDialogMorph(blocks, this.stage, name).popUp();
    }
};