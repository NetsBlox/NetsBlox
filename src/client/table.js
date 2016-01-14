// NetsBlox table stuff
IDE_Morph.prototype.createTable = function() {
    this.table = new TableMorph(this);
};

IDE_Morph.prototype._createCorral = IDE_Morph.prototype.createCorral;
IDE_Morph.prototype.createCorral = function() {
    var padding = 5;  // Same as in IDE_Morph.prototype.createCorral
    this._createCorral();

    // Add table morph button
    this.corral.tableIcon = new SpriteIconMorph(this.table);
    this.corral.tableIcon.isDraggable = false;
    this.corral.add(this.corral.tableIcon);

    // Position the
    this.corral.fixLayout = function() {
        this.stageIcon.setCenter(this.center());
        this.stageIcon.setLeft(this.left() + padding);

        this.tableIcon.setCenter(this.center());
        this.tableIcon.setLeft(this.stageIcon.width() + this.left() + padding);

        this.frame.setLeft(this.stageIcon.right() + padding);
        this.frame.setExtent(new Point(
            this.right() - this.frame.left(),
            this.height()
        ));
        this.arrangeIcons();
        this.refresh();
    };

    this.corral.refresh = function() {
        this.stageIcon.refresh();
        this.tableIcon.refresh();
        this.frame.contents.children.forEach(function(icon) {
            icon.refresh();
        });
    };

    // TODO
};

// Create the tabs
// + Projects (primary)
// + Scripts
IDE_Morph.prototype._getCurrentTabs = function () {
    if (this.currentSprite === this.table) {
        return ['Projects', 'Scripts'];
    }
    return ['Scripts', 'Costumes', 'Sounds'];
};

// Creating the 'projects' view for the table
IDE_Morph.prototype._createSpriteEditor = IDE_Morph.prototype.createSpriteEditor;
IDE_Morph.prototype.createSpriteEditor = function() {
    if (this.currentTab === 'projects') {
        if (this.spriteEditor) {
            this.spriteEditor.destroy();
        }

        this.spriteEditor = new ProjectsMorph(this.table, this.sliderColor);
        this.spriteEditor.color = this.groupColor;
        this.add(this.spriteEditor);
    } else {
        this._createSpriteEditor();
    }
};

// NetsBlox Table
TableMorph.prototype = new SpriteMorph();
TableMorph.prototype.constructor = TableMorph;
TableMorph.uber = SpriteMorph.prototype;

// TODO: Pick better colors
TableMorph.COLORS = [
    '#0d47a1',
    '#64b5f6',
    '#f57c00',
    '#ce93d8',
    '#4527a0',
    '#e57373',
    '#ffe082'
];
TableMorph.SIZE = 300;

function TableMorph(ide) {
    // Get the users at the table
    this.ide = ide;
    this.seats = {};
    this.seatLabels = {};

    this.init();
    this.name = localize('Table');
    this.uuid = null;
    this.nextUuid = null;  // next table id

    // TODO: Make this dynamic
    this.silentSetWidth(TableMorph.SIZE);
    this.silentSetHeight(TableMorph.SIZE);

    this.isDraggable = false;
    this.drawNew();

    // Set up callbacks for SeatMorphs
    SeatMorph.prototype.inviteFriend = TableMorph.prototype.inviteFriend.bind(this);
    SeatMorph.prototype.evictUser = TableMorph.prototype.evictUser.bind(this);
}

// 'Inherit' from SpriteMorph
//(function() {
    //var methods = Object.keys(SpriteMorph.prototype);
    //for (var i = methods.length; i--;) {
        //if (StageMorph.prototype[methods[i]]) {
            //TableMorph.prototype[methods[i]] = SpriteMorph.prototype[methods[i]];
        //}
    //}
//})();

TableMorph.prototype.update = function(uuid, seats) {
    // Update the seats, etc
    this.uuid = uuid;
    this.seats = seats;
    this.version = Date.now();

    this.drawNew();
};

TableMorph.prototype.drawNew = function() {
    var cxt,
        padding = 4,
        radius = (Math.min(this.width(), this.height())-padding)/2,
        label,
        seats,
        center = padding + radius,
        i;
        

    // Remove the old seatLabels
    seats = Object.keys(this.seatLabels);
    for (i = seats.length; i--;) {
        this.seatLabels[seats[i]].destroy();
    }
    
    this.image = newCanvas(this.extent());
    cxt = this.image.getContext('2d');

    // Draw the seats
    var angleSize,
        angle = 0,
        len = TableMorph.COLORS.length,
        x,y;

    seats = Object.keys(this.seats);
    angleSize = 2*Math.PI/seats.length;

    cxt.textAlign = 'center';
    for (i = 0; i < seats.length; i++) {
        cxt.fillStyle = TableMorph.COLORS[i%len];
        cxt.beginPath();
        cxt.moveTo(center, center);

        cxt.arc(center, center, radius, angle, angle+angleSize, false);

        cxt.lineTo(center, center);
        cxt.fill();

        // Write the seat name on the seat
        x = center + (0.75 *radius * Math.cos(angle+angleSize/2));
        y = center + (0.75 *radius * Math.sin(angle+angleSize/2));
        // Create the label
        label = new SeatMorph(localize(seats[i]), localize(this.seats[seats[i]]));
        label.setCenter(new Point(x, y).translateBy(this.topLeft()));
        this.add(label);
        this.seatLabels[seats[i]] = label;

        angle += angleSize;
    }

    // Center circle
    cxt.beginPath();
    cxt.arc(center, center, radius/5, 0, 2*Math.PI, false);
    cxt.fillStyle = '#9e9e9e';
    cxt.fill();
    cxt.fillStyle = 'black';
    cxt.font = '14px';
    cxt.fillText('TABLE', center, center);

    // TODO: Add children for each seat
    this.changed();
};

TableMorph.prototype.inheritedVariableNames = function() {
    return [];
};

TableMorph.prototype.join = function (id) {
    this.uuid = id;
    //this.ide.sockets.sendMessage('join-table'
};

TableMorph.prototype._createNewSeat = function (name) {
    // Create the new seat
    this.ide.sockets.sendMessage('add-seat ' + name);
};

// FIXME: create ide.confirm
TableMorph.prototype.evictUser = function (user, seat) {
    SnapCloud.evictUser(err => {
            myself.ide.showMessage(err || 'evicted ' + user + '!');
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [user, seat, this.uuid]
    );
};

TableMorph.prototype.inviteFriend = function (seat) {
    // TODO: Check if the user is the leader
    var tablemates = Object.keys(this.seats)
        .map(seat => this.seats[seat]);

    SnapCloud.getFriendList(friends => {
        // Remove friends at the table
        this._inviteFriendDialog(seat, friends
            .filter(friend => tablemates.indexOf(friend) === -1));
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        }
    );
};

TableMorph.prototype._inviteFriendDialog = function (seat, friends) {
    // Create a list of clients to invite (retrieve from server - ajax)
    // Allow the user to select the person and seat
    var dialog = new DialogBoxMorph().withKey('inviteFriend'),
        frame = new AlignmentMorph('column', 7),
        listField,
        ok = dialog.ok,
        myself = this,
        size = 200,
        world = this.world();

    frame.padding = 6;
    frame.setWidth(size);
    frame.acceptsDrops = false;

    listField = new ListMorph(friends);
    listField.fixLayout = nop;
    listField.edge = InputFieldMorph.prototype.edge;
    listField.fontSize = InputFieldMorph.prototype.fontSize;
    listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    listField.contrast = InputFieldMorph.prototype.contrast;
    listField.drawNew = InputFieldMorph.prototype.drawNew;
    listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;
    listField.setWidth(size-2*frame.padding);

    frame.add(listField);

    frame.setHeight(size-100);
    frame.fixLayout = nop;
    frame.edge = InputFieldMorph.prototype.edge;
    frame.fontSize = InputFieldMorph.prototype.fontSize;
    frame.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    frame.contrast = InputFieldMorph.prototype.contrast;
    frame.drawNew = InputFieldMorph.prototype.drawNew;
    frame.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    dialog.ok = function () {
        var friend = listField.selected;
        if (friend) {
            // TODO: Add the friend to the given seat
            // For now, I might just make a new seat on the server
            console.log('inviting friend! (' + friend + ')');
            myself._inviteFriend(friend, seat);
        }
        ok.call(this);
    };

    dialog.labelString = 'Invite a Friend to the Table';
    dialog.createLabel();
    dialog.addBody(frame);
    frame.drawNew();
    dialog.addButton('ok', 'OK');
    dialog.addButton('cancel', 'Cancel');
    dialog.fixLayout();
    dialog.drawNew();
    dialog.popUp(world);
    dialog.setCenter(world.center());
};

TableMorph.prototype._inviteFriend = function (friend, seat) {
    // TODO: Change this to ajax
    // Use inviteToTable service
    SnapCloud.inviteToTable(friend, this.uuid, seat);
};

TableMorph.prototype.promptInvite = function (id, table, seat) {
    // Create a confirm dialog about joining the group
    var myself = this,
        action = this._invitationResponse.bind(this, id, true),
        dialog = new DialogBoxMorph(null, action);

    dialog.cancel = function() {
        this._invitationResponse(id, false);
        this.destroy();
    };

    dialog.askYesNo(
        'Table Invitation',
        localize('Would you like to join table ') +
        '\n"' + table + '" at "' + seat + '"?',
        this.ide.world()
    );
};

TableMorph.prototype._invitationResponse = function (id, response) {
    var myself = this;
    SnapCloud.invitationResponse(
        id,
        response,
        function (response, url) {
            myself.ide.showMessage(response, 2);
            myself.disconnect();
        },
        function(err) {
            myself.ide.showMessage(err, 2);
        }
    );
};

TableMorph.prototype.createNewSeat = function () {
    // Ask for a new seat name
    var myself = this;
    this.ide.prompt('New Seat Name', function (seatName) {
        if (myself.seats.hasOwnProperty(seatName)) {
            // Error! Seat exists
            new DialogBoxMorph().inform(
                'Existing Seat Name',
                'Could not create a new seat because\n' +
                'the provided name already exists.',
                world
            );
        } else {
            myself._createNewSeat(seatName);
        }
    }, null, 'exportProject');
};
// Create the available blocks
// TODO

SeatMorph.prototype = new AlignmentMorph();
SeatMorph.prototype.constructor = SeatMorph;
SeatMorph.uber = AlignmentMorph.prototype;

function SeatMorph(name, user) {
    this.name = name;
    this.user = user;
    this.init('column', 4);
    //var text = this.name + '\n(' + this.user + ')';
    //SeatMorph.uber.init.call(this, text);
    this.drawNew();
}

SeatMorph.prototype.drawNew = function() {
    if (this._seatLabel) {
        this._seatLabel.destroy();
        this._userLabel.destroy();
    }

    this._seatLabel = new StringMorph(
        this.name,
        14,
        null,
        true,
        false
    );
    this._userLabel = new StringMorph(
        this.user || '<empty>',
        14,
        null,
        false,
        true
    );
    this.add(this._seatLabel);
    this.add(this._userLabel);
    this.fixLayout();
};

SeatMorph.prototype.mouseClickLeft = function() {
    if (!this.user) {
        this.inviteFriend(this.name);
    } else {
        this.evictUser(this.user, this.name);
        // Ask to evict
        // TODO
        console.log('occupied! (' + this.user + ')');
    }
};

ProjectsMorph.prototype = new ScrollFrameMorph();
ProjectsMorph.prototype.constructor = ProjectsMorph;
ProjectsMorph.uber = ScrollFrameMorph.prototype;

function ProjectsMorph(table, sliderColor) {
    // TODO: Get the table info and update when websockets do stuff
    ProjectsMorph.uber.init.call(this, null, null, sliderColor);
    this.acceptsDrops = false;
    this.table = table;
    // Reset the position
    this.table.silentSetPosition(new Point(0,0));
    this.updateTable();
}

ProjectsMorph.prototype.updateTable = function() {
    // Receive updates about the table from the server
    // TODO
    var padding = 4,
        btn;

    this.contents.destroy();
    this.contents = new FrameMorph(this);
    this.addBack(this.contents);

    // Draw the table
    //this.table.setExtent
    this.table.drawNew();
    this.addContents(this.table);

    // Draw the "new seat" button
    btn = this._addButton({
        selector: 'createNewSeat',
        icon: 'plus',
        hint: 'Add a seat to the table',
        left: this.table.right() + padding*4
    });

    // Draw the "remove seat" button
    // TODO
};

ProjectsMorph.prototype._addButton = function(params) {
    var selector = params.selector,
        icon = params.icon,
        hint = params.hint,
        left = params.left || this.table.center().x,
        top = params.top || this.table.center().y,
        newButton;

    newButton = new PushButtonMorph(
        this.table,
        selector,
        new SymbolMorph(icon, 12)
    );
    newButton.padding = 0;
    newButton.corner = 12;
    newButton.color = IDE_Morph.prototype.groupColor;
    newButton.highlightColor = IDE_Morph.prototype.frameColor.darker(50);
    newButton.pressColor = newButton.highlightColor;
    newButton.labelMinExtent = new Point(36, 18);
    newButton.labelShadowOffset = new Point(-1, -1);
    newButton.labelShadowColor = newButton.highlightColor;
    newButton.labelColor = TurtleIconMorph.prototype.labelColor;
    newButton.contrast = this.buttonContrast;
    newButton.drawNew();

    if (hint) {
        newButton.hint = hint;
    }

    newButton.fixLayout();
    newButton.setLeft(left);
    newButton.setTop(top);

    this.addContents(newButton);
    return newButton;
};

// Cloud extensions
Cloud.prototype.invitationResponse = function (id, accepted, onSuccess, onFail) {
    var myself = this,
        args = [id, accepted, this.socketId()],
        response = accepted ? 'joined table.' : 'invitation denied.';

    this.reconnect(
        function () {
            myself.callService(
                'invitationResponse',
                onSuccess,
                onFail,
                args
            );
        },
        function(err) {
            myself.ide.showMessage(err, 2);
        }
    );
    // TODO
};

Cloud.prototype.inviteToTable = function () {
    var myself = this,
        args = arguments;

    this.reconnect(
        function () {
            myself.callService(
                'inviteToTable',
                myself.disconnect.bind(myself),
                nop,
                args
            );
        },
        nop
    );
};

Cloud.prototype.getFriendList = function (callBack, errorCall) {
    var myself = this;
    this.reconnect(
        function () {
            myself.callService(
                'getFriendList',
                function (response, url) {
                    var ids = Object.keys(response[0] || {});
                    callBack.call(null, ids, url);
                    myself.disconnect();
                },
                errorCall
            );
        },
        errorCall
    );
};

Cloud.prototype.evictUser = function(onSuccess, onFail, args) {
    var myself = this;
    this.reconnect(
        function () {
            myself.callService(
                'evictUser',
                function () {
                    onSuccess.call(null);
                    myself.disconnect();
                },
                onFail,
                args
            );
        },
        onFail
    );
};

Cloud.prototype.socketId = function () {
    var ide = world.children.find(function(child) {
        return child instanceof IDE_Morph;
    });
    return ide.sockets.uuid;
};

// Override
Cloud.prototype.saveProject = function (ide, callBack, errorCall) {
    var myself = this;
    myself.reconnect(
        function () {
            myself.callService(
                'saveProject',
                function (response, url) {
                    callBack.call(null, response, url);
                    myself.disconnect();
                },
                errorCall,
                [
                    myself.socketId()
                ]
            );
        },
        errorCall
    );
};

// Override
ProjectDialogMorph.prototype.rawOpenCloudProject = function (proj) {
    var myself = this;
    console.log('tableuuid is', proj.TableUuid);
    SnapCloud.reconnect(
        function () {
            SnapCloud.callService(
                'getProject',
                function (response) {
                    SnapCloud.disconnect();
                    myself.ide.source = 'cloud';
                    myself.ide.droppedText(response[0].SourceCode);
                    myself.ide.table.nextUuid = proj.TableUuid;
                    if (proj.Public === 'true') {
                        location.hash = '#present:Username=' +
                            encodeURIComponent(SnapCloud.username) +
                            '&ProjectName=' +
                            encodeURIComponent(proj.ProjectName);
                    }
                },
                myself.ide.cloudError(),
                [proj.ProjectName, proj.TableUuid]
            );
        },
        myself.ide.cloudError()
    );
    this.destroy();
};

IDE_Morph.prototype._loadTable = function () {
    // Check if the table has diverged and optionally fork
    // TODO
    if (this.table.nextUuid) {
        this.table.name = this.table.uuid.split('/').pop();  // FIXME
        // try to load this table TODO
        //this.table.uuid = 
    }
};

IDE_Morph.prototype.rawOpenCloudDataString = function (str) {
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
            this._loadTable();
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


// Table Editor
//function Table
