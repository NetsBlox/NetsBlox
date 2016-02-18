/* * * * * * * * * TableMorph * * * * * * * * */
TableMorph.prototype = new SpriteMorph();
TableMorph.prototype.constructor = TableMorph;
TableMorph.uber = SpriteMorph.prototype;

TableMorph.SIZE = 300;

function TableMorph(ide) {
    // Get the users at the table
    this.ide = ide;
    this.seats = {};
    this.occupied = {};
    this.seatLabels = {};

    this.tableLabel = null;
    this.init();
    // Set up the table name
    this._name = localize('MyTable');
    Object.defineProperty(this, 'name', {
        get: function() {
            return this._name;
        },
        set: this._onNameChanged.bind(this)
    });

    // Set up the leaderId
    this.leaderId = null;
    this.nextTable = null;  // next table info
    // The projectName is used for the seatId
    if (!this.ide.projectName) {
        this.ide.projectName = 'mySeat';
    }

    this.silentSetWidth(TableMorph.SIZE);
    this.silentSetHeight(TableMorph.SIZE);

    this.isDraggable = false;
    this.drawNew();

    // Set up callback(s) for SeatMorphs
    SeatMorph.prototype.editSeat = TableMorph.prototype.editSeat.bind(this);
}

TableMorph.prototype._onNameChanged = function(newName) {
    if (this._name !== newName) {
        this._name = newName;
        this.ide.sockets.sendMessage({
            type: 'rename-table',
            name: newName
        });
    }
};

TableMorph.prototype.update = function(leaderId, name, seats, occupied) {
    var username = SnapCloud.username || this.ide.sockets.uuid;
    // Update the seats, etc
    this.leaderId = leaderId;
    this._name = name;
    this.seats = seats;
    this.occupied = occupied;

    this.version = Date.now();
    this.drawNew();
};

TableMorph.prototype.triggerUpdate = function() {
    // TODO: Message the server requesting an update
};

TableMorph.prototype.drawNew = function() {
    var cxt,
        label,
        padding = 4,
        radius = (Math.min(this.width(), this.height())-padding)/2,
        center = padding + radius,
        seats,
        len,
        x,
        y,
        i;
        
    if (this.leaderId === null) {  // If the table isn't set, trigger an update
        this.triggerUpdate();
        return;
    }

    // Remove the old seatLabels
    seats = Object.keys(this.seatLabels);
    for (i = seats.length; i--;) {
        this.seatLabels[seats[i]].destroy();
    }
    
    this.image = newCanvas(this.extent());

    // Draw the seats
    seats = Object.keys(this.seats);
    len = seats.length;

    for (i = 0; i < seats.length; i++) {
        // Create the label
        label = new SeatMorph(
            localize(seats[i]),
            localize(this.seats[seats[i]]),
            i,
            len
        );
        this.add(label);
        label.setExtent(this.extent());
        label.setCenter(this.center());
        this.seatLabels[seats[i]] = label;
    }
    // Table name
    this.renderTableTitle(new Point(center, center).translateBy(this.topLeft()));
};

TableMorph.prototype.renderTableTitle = function(center) {
    var width = 100,
        height = 25;

    if (this.tableLabel) {
        this.tableLabel.destroy();
        this.titleBox.destroy();
    }

    // Create the background box
    this.titleBox = new Morph();
    this.titleBox.image = newCanvas(this.extent());
    this.titleBox.color = new Color(158, 158, 158);
    this.add(this.titleBox);
    this.titleBox.setExtent(new Point(width, height));
    this.titleBox.setCenter(center);
    this.titleBox.mouseClickLeft = this.editTableName.bind(this);

    // Add the table name text
    this.tableLabel = new StringMorph(
        this.name,
        15,
        null,
        true,
        false
    );
    this.titleBox.add(this.tableLabel);
    this.tableLabel.setCenter(center);
};

TableMorph.prototype.editTableName = function () {
    var myself = this;
    this.ide.prompt('New Table Name', function (name) {
        if (name) {
            myself.name = name;
        }
    }, null, 'editTableName');
};

TableMorph.prototype.join = function (leaderId, name) {
    this.leaderId = id;
    this._name = name;
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
    }, null, 'createNewSeat');
};

TableMorph.prototype._createNewSeat = function (name) {
    // Create the new seat
    this.ide.sockets.sendMessage({
        type: 'add-seat',
        name: name
    });
};

TableMorph.prototype.editSeat = function(seat) {
    // Show a dialog of options
    //   + rename seat
    //   + delete seat
    //   + invite user (if unoccupied)
    //   + transfer ownership (if occupied)
    //   + evict user (if occupied)
    //   + change seat (if owned by self)
    var dialog = new EditSeatMorph(this, seat, this.occupied[seat.name]);

    dialog.fixLayout();
    dialog.drawNew();

    dialog.popUp(world);
    dialog.setCenter(world.center());
};

TableMorph.prototype.editSeatName = function() {
    // Ask for a new seat name
    var myself = this;
    this.ide.prompt('New Seat Name', function (seatName) {
        if (myself.seats.hasOwnProperty(seatName)) {
            // Error! Seat exists
            new DialogBoxMorph().inform(
                'Existing Seat Name',
                'Could not rename seat because\n' +
                'the provided name already exists.',
                world
            );
        } else {
            // TODO: Should we have a confirmation message?
            myself.setSeatName(seatName);
        }
    }, null, 'editSeatName');
};

TableMorph.prototype.moveToSeat = function(dstId) {
    var myself = this,
        mySeat = this.ide.projectName;

    SnapCloud.moveToSeat(function(args) {
            myself.ide.showMessage('moved to ' + dstId + '!');
            myself.ide.projectName = dstId;
            var proj = args[0];
            // Load the project or make the project empty
            if (proj) {
                myself.ide.source = 'cloud';
                myself.ide.droppedText(proj.SourceCode);
                if (proj.Public === 'true') {
                    location.hash = '#present:Username=' +
                        encodeURIComponent(SnapCloud.username) +
                        '&ProjectName=' +
                        encodeURIComponent(proj.ProjectName);
                }
            } else {  // Empty the project FIXME
                myself.ide.clearProject(dstId);
            }
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [dstId, mySeat, this.leaderId, this.name]
    );
};

TableMorph.prototype.deleteSeat = function(seat) {
    var myself = this;
    SnapCloud.deleteSeat(function(err) {
            myself.ide.showMessage('deleted ' + seat + '!');
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [seat, this.leaderId, this.name]
    );
};

TableMorph.prototype.setSeatName = function(seat) {
    this.ide.sockets.sendMessage({
        type: 'rename-seat',
        seatId: this.ide.projectName,
        name: seat || 'untitled'
    });
    this.ide.silentSetProjectName(seat);  // seat name and project name are the same
};

// FIXME: create ide.confirm
TableMorph.prototype.evictUser = function (user, seat) {
    var myself = this;
    SnapCloud.evictUser(function(err) {
            myself.ide.showMessage(err || 'evicted ' + user + '!');
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [user, seat, this.leaderId, this.name]
    );
};

TableMorph.prototype.inviteUser = function (seat) {
    var myself = this,
        callback;

    callback = function(friends) {
        friends.push('myself');
        myself._inviteFriendDialog(seat, friends);
    };
    // TODO: Check if the user is the leader
    if (SnapCloud.username) {
        SnapCloud.getFriendList(callback,
            function (err, lbl) {
                myself.ide.cloudError().call(null, err, lbl);
            }
        );
    } else {
        callback([]);
    }
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
    SnapCloud.inviteToTable(friend, this.leaderId, this.name, seat);
};

TableMorph.prototype.promptInvite = function (params) {  // id, table, tableName, seat
    // Create a confirm dialog about joining the group
    var myself = this,
        // unpack the params
        id = params.id,
        table = params.table,
        seat = params.seat,
        tableName = params.tableName,

        action = this._invitationResponse.bind(this, id, true, seat),
        dialog = new DialogBoxMorph(null, action),
        msg = params.inviter + ' has invited you to join\nhim/her at "' + tableName +
            '"\nAccept?';

    dialog.cancel = function() {
        myself._invitationResponse(id, false, seat);
        this.destroy();
    };

    dialog.askYesNo(
        'Table Invitation',
        localize(msg),
        this.ide.world()
    );
};

TableMorph.prototype._invitationResponse = function (id, response, seat) {
    var myself = this;
    SnapCloud.invitationResponse(
        id,
        response,
        function (args, url) {
            if (response) {
                var proj = args[0];
                // Load the project or make the project empty
                if (proj) {
                    myself.ide.source = 'cloud';
                    myself.ide.droppedText(proj.SourceCode);
                    if (proj.Public === 'true') {
                        location.hash = '#present:Username=' +
                            encodeURIComponent(SnapCloud.username) +
                            '&ProjectName=' +
                            encodeURIComponent(proj.ProjectName);
                    }
                } else {  // Empty the project
                    myself.ide.clearProject(seat);
                }
                myself.ide.showMessage('you have joined the table!', 2);
                myself.ide.silentSetProjectName(seat);  // Set the seat name FIXME
            }
            SnapCloud.disconnect();
        },
        function(err) {
            myself.ide.showMessage(err, 2);
        }
    );
};

SeatMorph.prototype = new Morph();
SeatMorph.prototype.constructor = SeatMorph;
SeatMorph.uber = Morph.prototype;
SeatMorph.COLORS = [
    '#0d47a1',
    '#64b5f6',
    '#f57c00',
    '#ce93d8',
    '#4527a0',
    '#e57373',
    '#ffe082'
];

// The seat morph needs to know where to draw itself
function SeatMorph(name, user, index, total) {
    this.init(name, user, index, total);
}

SeatMorph.prototype.init = function(name, user, index, total) {
    SeatMorph.uber.init.call(this, true);
    this.name = name;
    this.user = user;

    this._label = new SeatLabelMorph(name, user);
    this.add(this._label);
    this.index = index;
    this.total = total;
    this.drawNew();
};

SeatMorph.prototype.destroy = function() {
    for (var i = this.children.length; i--;) {
        this.children[i].destroy();
    }
    SeatMorph.uber.destroy.call(this);
};

SeatMorph.prototype.drawNew = function() {
    var padding = 4,
        radius = (Math.min(this.width(), this.height())-padding)/2,
        center = padding + radius,
        pos,
        cxt;

    // Create the image
    this.image = newCanvas(this.extent());
    cxt = this.image.getContext('2d');

    // Draw the seats
    var angleSize = 2*Math.PI/this.total,
        angle = this.index*angleSize,
        len = SeatMorph.COLORS.length,
        x,y;

    cxt.textAlign = 'center';

    // Draw the seat
    cxt.fillStyle = SeatMorph.COLORS[this.index%len];
    cxt.beginPath();
    cxt.moveTo(center, center);
    cxt.arc(center, center, radius, angle, angle+angleSize, false);
    cxt.lineTo(center, center);
    cxt.fill();

    // Write the seat name on the seat
    x = 0.75 * radius * Math.cos(angle + angleSize/2);
    y = 0.75 * radius * Math.sin(angle + angleSize/2);
    pos = new Point(x, y).translateBy(this.center());

    if (this._label) {
        this._label.destroy();
    }
    this._label = new SeatLabelMorph(this.name, this.user);
    this.add(this._label);
    this._label.setCenter(pos);
};

SeatMorph.prototype.mouseClickLeft = function() {
    this.editSeat(this._label);
};

SeatLabelMorph.prototype = new Morph();
SeatLabelMorph.prototype.constructor = SeatLabelMorph;
SeatLabelMorph.uber = Morph.prototype;

// Label containing the seat & user names
function SeatLabelMorph(name, user) {
    this.name = name;
    this.user = user;
    this.init();
}

SeatLabelMorph.prototype.init = function() {
    var usrTxt = this.user || '<empty>';
    if (this.isMine()) {
        usrTxt = 'me';
    }

    this._seatLabel = new StringMorph(
        this.name,
        14,
        null,
        true,
        false
    );
    this._userLabel = new StringMorph(
        usrTxt,
        14,
        null,
        false,
        true
    );

    SeatLabelMorph.uber.init.call(this);

    this.add(this._seatLabel);
    this.add(this._userLabel);
    this.drawNew();
};

SeatLabelMorph.prototype.isMine = function() {
    if (!SnapCloud.username) {
        return !!this.user;
    }
    return this.user === SnapCloud.username;
};

SeatLabelMorph.prototype.drawNew = function() {
    this.image = newCanvas(new Point(1, 1));
    this.fixLayout();
};

SeatLabelMorph.prototype.fixLayout = function() {
    var center = this.center(),
        height,
        x = center.x;

    height = this._seatLabel.height();
    this._seatLabel.setCenter(new Point(
        center.x/2,
        center.y - height/2
    ));

    height = this._userLabel.height();
    this._userLabel.setCenter(new Point(
        center.x/2,
        center.y + height/2
    ));
};

EditSeatMorph.prototype = new DialogBoxMorph();
EditSeatMorph.prototype.constructor = EditSeatMorph;
EditSeatMorph.uber = DialogBoxMorph.prototype;
function EditSeatMorph(table, seat, isOccupied) {
    DialogBoxMorph.call(this);
    this.table = table;
    this.seat = seat;

    var txt = new TextMorph(
        'What would you like to do?',
        null,
        null,
        true,
        false,
        'center',
        null,
        null,
        MorphicPreferences.isFlat ? null : new Point(1, 1),
        new Color(255, 255, 255)
    );

    this.labelString = 'Edit ' + seat.name;
    this.createLabel();
    this.addBody(txt);

    if (seat.user) {
        if (seat.isMine()) {  // Can only edit/delete seats that are your own
            this.addButton('editSeatName', 'Rename');
            if (!isOccupied) {
                this.addButton('moveToSeat', 'Move to');
                this.addButton('evictUser', 'Disown');
            }
        } else {
            this.addButton('evictUser', 'Evict Owner');
        }
    } else {
        // FIXME: If only one option, don't ask!
        this.addButton('inviteUser', 'Invite User');
        this.addButton('deleteSeat', 'Delete seat');
    }
    this.addButton('cancel', 'Cancel');

    // FIXME: This isn't centering it
    this.drawNew();
    var center = this.center();
    this.label.setCenter(center);
    txt.setCenter(center);
}

EditSeatMorph.prototype.inviteUser = function() {
    this.table.inviteUser(this.seat.name);
    this.destroy();
};

EditSeatMorph.prototype.editSeatName = function() {
    this.table.editSeatName();
    this.destroy();
};

EditSeatMorph.prototype.deleteSeat = function() {
    this.table.deleteSeat(this.seat.name);
    this.destroy();
};

EditSeatMorph.prototype.moveToSeat = function() {
    this.table.moveToSeat(this.seat.name);
    this.destroy();
};

EditSeatMorph.prototype.evictUser = function() {
    this.table.evictUser(this.seat.user, this.seat.name);
    this.destroy();
};

ProjectsMorph.prototype = new ScrollFrameMorph();
ProjectsMorph.prototype.constructor = ProjectsMorph;
ProjectsMorph.uber = ScrollFrameMorph.prototype;

function ProjectsMorph(table, sliderColor) {
    // TODO: Get the table info and update when websockets do stuff
    ProjectsMorph.uber.init.call(this, null, null, sliderColor);
    this.acceptsDrops = false;
    this.table = table;
    this.add(table);
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
    this.contents.acceptsDrops = false;
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

// Override
var superOpenProj = ProjectDialogMorph.prototype.openProject;
ProjectDialogMorph.prototype.openProject = function () {
    var proj = this.listField.selected,
        projectNameRegex = /name="(.*)" app/,
        response,
        src;

    if (this.source === 'examples') {
        response = JSON.parse(this.ide.getURL('api/Examples/' + proj.name +
            '?sId=' + this.ide.sockets.uuid));
        this.ide.table.nextTable = {
            leaderId: response.leaderId,
            tableName: response.tableName,
            seatId: response.primarySeat
        };

        // seat name
        this.ide.openProjectString(response.src.SourceCode);
        this.ide.loadNextTable();
        this.destroy();
    } else {
        return superOpenProj.call(this);
    }
};

var superSetSource = ProjectDialogMorph.prototype.setSource;
ProjectDialogMorph.prototype.setSource = function (source) {
    var myself = this;
    superSetSource.call(this, source);
    if (this.source === 'examples') {
        this.listField.action = function(item) {
            var src, xml;
            if (item === undefined) {return; }
            if (myself.nameField) {
                myself.nameField.setContents(item.name || '');
            }
            src = JSON.parse(myself.ide.getURL(
                'api/Examples/' + item.name + '?sId=' + myself.ide.sockets.uuid +
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
        }
    }
    // TODO
};

ProjectDialogMorph.prototype.rawOpenCloudProject = function (proj) {
    var myself = this;
    SnapCloud.reconnect(
        function () {
            SnapCloud.callService(
                'getProject',
                function (response) {
                    SnapCloud.disconnect();
                    myself.ide.source = 'cloud';
                    myself.ide.droppedText(response[0].SourceCode);
                    myself.ide.table.nextTable = {
                        leaderId: proj.TableLeader,
                        tableName: proj.TableName,
                        seatId: proj.ProjectName
                    };
                    if (proj.Public === 'true') {
                        location.hash = '#present:Username=' +
                            encodeURIComponent(SnapCloud.username) +
                            '&ProjectName=' +
                            encodeURIComponent(proj.ProjectName);
                    }
                },
                myself.ide.cloudError(),
                [proj.ProjectName, proj.TableLeader, proj.TableName]
            );
        },
        myself.ide.cloudError()
    );
    this.destroy();
};

ProjectDialogMorph.prototype.installCloudProjectList = function (pl) {
    var myself = this;
    this.projectList = pl || [];
    this.projectList.sort(function (x, y) {
        return x.ProjectName < y.ProjectName ? -1 : 1;
    });

    this.listField.destroy();
    this.listField = new ListMorph(
        this.projectList,
        this.projectList.length > 0 ?
                function (element) {
                    return element.ProjectName + ' from ' + element.TableName +
                        ' (' + element.TableLeader + ')';
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
                localize('last changed') + '\n' + item.Updated,
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
