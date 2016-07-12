/* global SnapCloud, StringMorph, DialogBoxMorph, localize, newCanvas, Point, Morph,
 Color, nop, InputFieldMorph, ListMorph, AlignmentMorph, IDE_Morph, TurtleIconMorph,
 ProjectDialogMorph, TextMorph, MorphicPreferences, ScrollFrameMorph, FrameMorph,
 SymbolMorph, PushButtonMorph*/
/* * * * * * * * * RoomMorph * * * * * * * * */
RoomMorph.prototype = new Morph();
RoomMorph.prototype.constructor = RoomMorph;
RoomMorph.uber = Morph.prototype;

RoomMorph.SIZE = 300;
RoomMorph.DEFAULT_ROLE = 'myRole';

function RoomMorph(ide) {
    // Get the users at the room
    this.ide = ide;
    this.roles = {};
    this.roleLabels = {};
    this.invitations = {};  // open invitations

    this.roomLabel = null;
    this.init();
    // Set up the room name
    this._name = localize('MyRoom');
    Object.defineProperty(this, 'name', {
        get: function() {
            return this._name;
        },
        set: this._onNameChanged.bind(this)
    });

    // Set up the ownerId
    this.ownerId = null;
    this.nextRoom = null;  // next room info
    this.editable = false;
    // The projectName is used for the roleId
    if (!this.ide.projectName) {
        this.ide.projectName = RoomMorph.DEFAULT_ROLE;
    }

    this.silentSetWidth(RoomMorph.SIZE);
    this.silentSetHeight(RoomMorph.SIZE);

    this.isDraggable = false;

    // Set up callback(s) for RoleMorphs
    RoleMorph.prototype.editRole = RoomMorph.prototype.editRole.bind(this);
    var myself = this;
    RoleLabelMorph.prototype.mouseClickLeft = function() {
        if (myself.editable) {
            myself.editRoleName(this.name);
        }
    };

    // update on login
    SnapCloud.onLogin = this.update.bind(this);

    // Set the initial values
    var roles = {};
    roles[this.ide.projectName] = 'me';
    this.update(null, this.name, roles);
    // Shared messages array for when messages are sent to unoccupied roles
    this.sharedMsgs = [];

    this.drawNew();
}

RoomMorph.prototype._onNameChanged = function(newName) {
    if (this.name !== newName) {
        this.ide.sockets.sendMessage({
            type: 'rename-room',
            name: newName
        });
    }
};

RoomMorph.prototype.update = function(ownerId, name, roles) {
    var myself = this,
        wasEditable = this.editable,
        oldRoles = this.roles,
        oldNames = Object.keys(oldRoles),
        names,
        changed;


    // Update the roles, etc
    this.ownerId = ownerId || this.ownerId;
    this.roles = roles || this.roles;
    this.editable = this.ownerId && this.ownerId === SnapCloud.username;

    changed = name && this.name !== name;
    if (changed) {
        this._name = name;
        this.ide.controlBar.updateLabel();
    }

    // Check if it has changed in a meaningful way
    names = Object.keys(this.roles);
    changed = changed ||
        wasEditable !== this.editable ||
        oldNames.length !== names.length || names.reduce(function(prev, name) {
            return prev || oldRoles[name] !== myself.roles[name];
        }, false);


    if (changed) {
        this.version = Date.now();
        this.drawNew();
        this.changed();
    }
};

RoomMorph.prototype.drawNew = function() {
    var label,
        padding = 4,
        radius = (Math.min(this.width(), this.height())-padding)/2,
        center = padding + radius,
        roles,
        len,
        i;
        
    // Remove the old roleLabels
    roles = Object.keys(this.roleLabels);
    for (i = roles.length; i--;) {
        this.roleLabels[roles[i]].destroy();
    }
    
    this.image = newCanvas(this.extent());

    // Draw the roles
    roles = Object.keys(this.roles);
    len = roles.length;

    for (i = 0; i < roles.length; i++) {
        // Create the label
        label = new RoleMorph(
            localize(roles[i]),
            localize(this.roles[roles[i]]),
            i,
            len
        );
        this.add(label);
        label.setExtent(this.extent());
        label.setCenter(this.center());
        this.roleLabels[roles[i]] = label;
    }

    // Room name
    this.renderRoomTitle(new Point(center, center).translateBy(this.topLeft()));

    // Owner name
    this.showOwnerName(new Point(center, center).translateBy(this.topLeft()).translateBy(new Point(1.25 * radius, -.25 * radius)));
};

RoomMorph.prototype.showOwnerName = function(center) {
    if (this.ownerLabel) {
        this.ownerLabel.destroy();
        this.ownerIdLabel.destroy();
    }

    if (this.ownerId && !this.ownerId.startsWith('_')) {
        this.ownerLabel = new StringMorph('Owner', false, false, true);
        this.ownerIdLabel = new StringMorph(this.ownerId, false, false, true);

        this.ownerLabel.setCenter(center);
        this.ownerIdLabel.setCenter(new Point(center.x, center.y + 12));

        this.add(this.ownerLabel);
        this.add(this.ownerIdLabel);
        this.owner = false;
    }
}

RoomMorph.prototype.mouseClickLeft = function() {
    if (!this.editable) {
        // If logged in, prompt about leaving the room
        if (SnapCloud.username) {
            this.ide.confirm(
                localize('would you like to leave "' + this.name + '"?'),
                localize('Leave Room'),
                this.ide.newProject.bind(this.ide)
            );
        } else {
            this.ide.showMessage(localize('Please login before editing the room'));
        }
    }
};

RoomMorph.prototype.renderRoomTitle = function(center) {
    var width = 100,
        height = 25;

    if (this.roomLabel) {
        this.roomLabel.destroy();
        this.titleBox.destroy();
    }

    // Create the background box
    this.titleBox = new Morph();
    this.titleBox.image = newCanvas(this.extent());
    this.titleBox.color = new Color(158, 158, 158);
    this.add(this.titleBox);
    this.titleBox.setExtent(new Point(width, height));
    this.titleBox.setCenter(center);
    if (this.editable) {
        this.titleBox.mouseClickLeft = this.editRoomName.bind(this);
    }

    // Add the room name text
    this.roomLabel = new StringMorph(
        this.name,
        15,
        null,
        true,
        false
    );
    this.titleBox.add(this.roomLabel);
    this.roomLabel.setCenter(center);
};

RoomMorph.prototype.editRoomName = function () {
    var myself = this;
    this.ide.prompt('New Room Name', function (name) {
        if (name) {
            myself.name = name;
        }
    }, null, 'editRoomName');
};

RoomMorph.prototype.createNewRole = function () {
    // Ask for a new role name
    var myself = this,
        world = this.world();

    this.ide.prompt('New Role Name', function (roleName) {
        if (myself.roles.hasOwnProperty(roleName)) {
            // Error! Role exists
            new DialogBoxMorph().inform(
                'Existing Role Name',
                'Could not create a new role because\n' +
                'the provided name already exists.',
                world
            );
        } else {
            myself._createNewRole(roleName);
        }
    }, null, 'createNewRole');
};

RoomMorph.prototype._createNewRole = function (name) {
    // Create the new role
    this.ide.sockets.sendMessage({
        type: 'add-role',
        name: name
    });
};

RoomMorph.prototype.editRole = function(role) {
    // Show a dialog of options
    //   + rename role
    //   + delete role
    //   + invite user (if unoccupied)
    //   + transfer ownership (if occupied)
    //   + evict user (if occupied)
    //   + change role (if owned by self)
    var dialog = new EditRoleMorph(this, role, !!this.roles[role.name]),
        world = this.world();

    dialog.fixLayout();
    dialog.drawNew();

    dialog.popUp(world);
    dialog.setCenter(world.center());
};

RoomMorph.prototype.editRoleName = function(role) {
    // Ask for a new role name
    var myself = this;
    this.ide.prompt('New Role Name', function (roleName) {
        if (/^\s*$/.test(roleName)) {  // empty role name = cancel
            return;
        }

        if (myself.roles.hasOwnProperty(roleName)) {
            // Error! Role exists
            new DialogBoxMorph().inform(
                'Existing Role Name',
                'Could not rename role because\n' +
                'the provided name already exists.',
                myself.world()
            );
        } else {
            myself.ide.sockets.sendMessage({
                type: 'rename-role',
                roleId: role,
                name: roleName
            });
        }
    }, null, 'editRoleName');
};

RoomMorph.prototype.moveToRole = function(dstId) {
    var myself = this,
        myRole = this.ide.projectName;

    SnapCloud.moveToRole(
        function(args) {
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
        [dstId, myRole, this.ownerId, this.name]
    );
};

RoomMorph.prototype.deleteRole = function(role) {
    var myself = this;
    SnapCloud.deleteRole(
        function() {
            myself.ide.showMessage('deleted ' + role + '!');
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [role, this.ownerId, this.name]
    );
};

RoomMorph.prototype.createRoleClone = function(role) {
    var myself = this;
    SnapCloud.cloneRole(function(response) {
            var newRole = Object.keys(response[0])[0];
            myself.ide.showMessage('cloned ' + role + ' to ' +
                newRole + ' !');
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [role, myself.ide.sockets.uuid]
    );
};

RoomMorph.prototype.role = function() {
    return this.ide.projectName;
};

RoomMorph.prototype.setRoleName = function(role) {
    this.ide.sockets.sendMessage({
        type: 'rename-role',
        roleId: this.ide.projectName,
        name: role || 'untitled'
    });
};

// FIXME: create ide.confirm
RoomMorph.prototype.evictUser = function (user, role) {
    var myself = this;
    SnapCloud.evictUser(function(err) {
            myself.ide.showMessage(err || 'evicted ' + user + '!');
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [user, role, this.ownerId, this.name]
    );
};

RoomMorph.prototype.inviteUser = function (role) {
    var myself = this,
        callback;

    callback = function(friends) {
        friends.push('myself');
        myself._inviteFriendDialog(role, friends);
    };
    // TODO: Check if the user is the owner
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

RoomMorph.prototype.shareMsg = function(role, roleUser) {
    var stage = this.ide.stage,
        socketManager = this.ide.sockets,
        availableMsgs = [],
        myself = this,
        listField,
        frame,
        dialog,
        size = 250,
        minHeight = 50,
        maxHeight = 150,
        msgsLength = stage.messageTypes.names().length,
        heightEstimate = msgsLength * 10;
    
    // Get available list of messages that can be shared
    // TODO?: compare messages and only show ones that the other role doesn't have?
    for (var i = 0; i < msgsLength; i++) {
        availableMsgs.push(stage.messageTypes.names()[i]);
    }

    // Prepare dialog & prompt user
    // ... build the list interface
    listField = new ListMorph(availableMsgs);
    listField.fixLayout = nop;
    listField.edge = InputFieldMorph.prototype.edge;
    listField.fontSize = InputFieldMorph.prototype.fontSize;
    listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    listField.contrast = InputFieldMorph.prototype.contrast;
    listField.drawNew = InputFieldMorph.prototype.drawNew;
    listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;
    listField.setWidth(size-2*6); // (6 === frame.padding)
    listField.setHeight(Math.max(Math.min(maxHeight, heightEstimate), minHeight));

    // ... build the frame interface
    frame = new AlignmentMorph('column', 1);
    frame.padding = 2;
    frame.setWidth(size);
    frame.acceptsDrops = false;
    frame.add(listField);
    frame.edge = InputFieldMorph.prototype.edge;
    frame.fontSize = InputFieldMorph.prototype.fontSize;
    frame.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    frame.contrast = InputFieldMorph.prototype.contrast;
    frame.drawNew = InputFieldMorph.prototype.drawNew;
    frame.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    // ... build the dialog interface
    dialog = new DialogBoxMorph();
    dialog.labelString = 'Choose which message type to send';
    dialog.createLabel();
    dialog.addBody(frame);
    dialog.drawNew();
    dialog.addButton('ok', 'Send');
    dialog.addButton('cancel', 'Cancel');
    dialog.fixLayout();
    dialog.drawNew();
    dialog.popUp(this.world());
    dialog.setCenter(world.center());

    dialog.ok = function() {
        var msgType = stage.messageTypes.getMsgType(listField.selected);
        if (roleUser.user) { // occupied
            socketManager.sendMessage({
                type: 'share-msg-type',
                roleId: role,
                from: myself.ide.projectName,
                name: msgType.name,
                fields: msgType.fields
            });
        } else { // not occupied, store in sharedMsgs array
            myself.sharedMsgs.push({roleId: role, msg: msgType, sent: false});
        }
        this.destroy();
    };

}

RoomMorph.prototype._inviteFriendDialog = function (role, friends) {
    // Create a list of clients to invite (retrieve from server - ajax)
    // Allow the user to select the person and role
    var dialog = new DialogBoxMorph().withKey('inviteFriend'),
        frame = new AlignmentMorph('column', 7),
        listField,
        ok = dialog.ok,
        myself = this,
        size = 200,
        minHeight = 50,
        maxHeight = 250,
        heightEstimate = friends.length*15,
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
    listField.setHeight(Math.max(Math.min(maxHeight, heightEstimate), minHeight));

    frame.add(listField);

    frame.edge = InputFieldMorph.prototype.edge;
    frame.fontSize = InputFieldMorph.prototype.fontSize;
    frame.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    frame.contrast = InputFieldMorph.prototype.contrast;
    frame.drawNew = InputFieldMorph.prototype.drawNew;
    frame.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    dialog.ok = function () {
        var friend = listField.selected;
        if (friend) {
            // For now, I might just make a new role on the server
            myself._inviteFriend(friend, role);
        }
        ok.call(this);
    };

    dialog.labelString = 'Invite a Friend to the Room';
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

RoomMorph.prototype._inviteFriend = function (friend, role) {
    // Use inviteToRoom service
    var socketId = this.ide.sockets.uuid;
    if (friend === 'myself') {
        friend = SnapCloud.username;
    }
    SnapCloud.inviteToRoom(socketId, friend, this.ownerId, this.name, role);
};

RoomMorph.prototype.promptInvite = function (params) {  // id, room, roomName, role
    // Create a confirm dialog about joining the group
    var myself = this,
        // unpack the params
        id = params.id,
        role = params.role,
        roomName = params.roomName,

        action = this._invitationResponse.bind(this, id, true, role),
        dialog = new DialogBoxMorph(null, action),
        msg;

    if (params.inviter === SnapCloud.username) {
        msg = 'Would you like to move to "' + roomName + '"?';
    } else {
        msg = params.inviter + ' has invited you to join\nhim/her at "' + roomName +
            '"\nAccept?';
    }

    dialog.cancel = function() {
        myself._invitationResponse(id, false, role);
        delete myself.invitations[id];
        this.destroy();
    };

    dialog.askYesNo(
        'Room Invitation',
        localize(msg),
        this.ide.world()
    );
    this.invitations[id] = dialog;
};

RoomMorph.prototype._invitationResponse = function (id, response, role) {
    var myself = this;
    SnapCloud.invitationResponse(
        id,
        response,
        function (args) {
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
                    myself.ide.clearProject(role);
                }
                myself.ide.showMessage('you have joined the room!', 2);
                myself.ide.silentSetProjectName(role);  // Set the role name FIXME
            }
            SnapCloud.disconnect();
        },
        function(err) {
            myself.ide.showMessage(err, 2);
        }
    );
};

RoomMorph.prototype.checkForSharedMsgs = function(role) {

    var socketManager = this.ide.sockets,
        newArray = [];

    // send queried messages
    for (var i = 0 ; i < this.sharedMsgs.length; i++) {
        if (this.sharedMsgs[i].roleId === role) {
            socketManager.sendMessage({
                type: 'share-msg-type', 
                name: this.sharedMsgs[i].msg.name,
                fields: this.sharedMsgs[i].msg.fields, 
                from: this.ide.projectName,
                roleId: role
            });
            this.sharedMsgs[i].sent = true;
        }
    }
    // refresh queried messages
    for (var i = 0; i < this.sharedMsgs.length; i++) {
        if (!this.sharedMsgs[i].sent) {
            newArray.push(this.sharedMsgs[i]);
        }
    }
    this.sharedMsgs = newArray;

};

RoleMorph.prototype = new Morph();
RoleMorph.prototype.constructor = RoleMorph;
RoleMorph.uber = Morph.prototype;
RoleMorph.COLORS = [
    new Color(74, 108, 212),
    new Color(217, 77, 17).lighter(),
    new Color(207, 74, 217),
    new Color(0, 161, 120),
    new Color(143, 86, 227),
    new Color(230, 168, 34),
    new Color(4, 148, 220),
    new Color(98, 194, 19),
    new Color(243, 118, 29),
    new Color(150, 150, 150)
].map(function(color) {
    return color.darker();
});

// The role morph needs to know where to draw itself
function RoleMorph(name, user, index, total) {
    this.init(name, user, index, total);
}

RoleMorph.prototype.init = function(name, user, index, total) {
    RoleMorph.uber.init.call(this, true);
    this.name = name;
    this.user = user;

    this._label = new RoleLabelMorph(name, user);
    this.add(this._label);
    this.index = index;
    this.total = total;
    this.drawNew();
};

RoleMorph.prototype.destroy = function() {
    for (var i = this.children.length; i--;) {
        this.children[i].destroy();
    }
    RoleMorph.uber.destroy.call(this);
};

RoleMorph.prototype.drawNew = function() {
    var padding = 4,
        radius = (Math.min(this.width(), this.height())-padding)/2,
        center = padding + radius,
        pos,
        cxt;

    // Create the image
    this.image = newCanvas(this.extent());
    cxt = this.image.getContext('2d');

    // Draw the roles
    var angleSize = 2*Math.PI/this.total,
        angle = this.index*angleSize,
        len = RoleMorph.COLORS.length,
        x,y;

    cxt.textAlign = 'center';

    // Draw the role
    cxt.fillStyle = RoleMorph.COLORS[this.index%len].toString();
    cxt.beginPath();
    cxt.moveTo(center, center);
    cxt.arc(center, center, radius, angle, angle+angleSize, false);
    cxt.lineTo(center, center);
    cxt.fill();

    // Write the role name on the role
    x = 0.65 * radius * Math.cos(angle + angleSize/2);
    y = 0.65 * radius * Math.sin(angle + angleSize/2);
    pos = new Point(x, y).translateBy(this.center());

    if (this._label) {
        this._label.destroy();
    }

    if (this.ownerLabel) {
        this.ownerLabel.destroy();
    }

    this._label = new RoleLabelMorph(this.name, this.user);
    this.add(this._label);
    this._label.setCenter(pos);

    // Visual indicator of ownership
    if (this.parent && this.user === this.parent.ownerId && !this.parent.owner) {
        this.ownerLabel = new StringMorph('[OWNER]', false, false, true, true);
        this.add(this.ownerLabel);
        this.ownerLabel.setCenter(new Point(pos.x, pos.y - 30));
        this.parent.owner = true; // don't assign ownership to myself more than once
    }
};

RoleMorph.prototype.mouseClickLeft = function() {
    if (this.parent.editable) {
        this.editRole(this._label);
    } else {
        this.escalateEvent('mouseClickLeft');
    }
};

RoleLabelMorph.prototype = new Morph();
RoleLabelMorph.prototype.constructor = RoleLabelMorph;
RoleLabelMorph.uber = Morph.prototype;

// Label containing the role & user names
function RoleLabelMorph(name, user) {
    this.name = name;
    this.user = user;
    this.init();
}

RoleLabelMorph.prototype.init = function() {
    var usrTxt = this.user || '<empty>';
    if (this.isMine()) {
        usrTxt = 'me';
    }

    this._roleLabel = new StringMorph(
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

    RoleLabelMorph.uber.init.call(this);

    this.add(this._roleLabel);
    this.add(this._userLabel);
    this.drawNew();
};

RoleLabelMorph.prototype.isMine = function() {
    if (!SnapCloud.username) {
        return !!this.user;
    }
    return this.user === SnapCloud.username;
};

RoleLabelMorph.prototype.drawNew = function() {
    this.image = newCanvas(new Point(1, 1));
    this.fixLayout();
};

RoleLabelMorph.prototype.fixLayout = function() {
    var center = this.center(),
        height;

    height = this._roleLabel.height();
    this._roleLabel.setCenter(new Point(
        center.x/2,
        center.y - height/2
    ));

    height = this._userLabel.height();
    this._userLabel.setCenter(new Point(
        center.x/2,
        center.y + height/2
    ));
};

EditRoleMorph.prototype = new DialogBoxMorph();
EditRoleMorph.prototype.constructor = EditRoleMorph;
EditRoleMorph.uber = DialogBoxMorph.prototype;
function EditRoleMorph(room, role) {
    DialogBoxMorph.call(this);
    this.room = room;
    this.role = role;

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

    this.labelString = 'Edit ' + role.name;
    this.createLabel();
    this.addBody(txt);

    // Role Actions
    this.addButton('createRoleClone', 'Clone');
    // Show for everyone but myself
    if (role.name !== this.room.role()) {
        this.addButton('shareMsg', 'Send Message Type');
    }
    if (role.user) {  // occupied
        // Check that the role name isn't the currently occupied role name
        if (role.name !== this.room.role()) {
            this.addButton('evictUser', 'Evict User');
        }
    } else {  // vacant
        this.addButton('moveToRole', 'Move to');
        this.addButton('inviteUser', 'Invite User');
        this.addButton('deleteRole', 'Delete role');
    }
    this.addButton('cancel', 'Cancel');

    // FIXME: This isn't centering it
    this.drawNew();
    var center = this.center();
    this.label.setCenter(center);
    txt.setCenter(center);
}

EditRoleMorph.prototype.shareMsg = function() {
    this.room.shareMsg(this.role.name, this.role);
    this.destroy();
}

EditRoleMorph.prototype.inviteUser = function() {
    this.room.inviteUser(this.role.name);
    this.destroy();
};

EditRoleMorph.prototype.editRoleName = function() {
    this.room.editRoleName(this.role.name);
    this.destroy();
};

EditRoleMorph.prototype.createRoleClone = function() {
    this.room.createRoleClone(this.role.name);
    this.destroy();
};

EditRoleMorph.prototype.deleteRole = function() {
    this.room.deleteRole(this.role.name);
    this.destroy();
};

EditRoleMorph.prototype.moveToRole = function() {
    this.room.moveToRole(this.role.name);
    this.destroy();
};

EditRoleMorph.prototype.evictUser = function() {
    this.room.evictUser(this.role.user, this.role.name);
    this.destroy();
};

ProjectsMorph.prototype = new ScrollFrameMorph();
ProjectsMorph.prototype.constructor = ProjectsMorph;
ProjectsMorph.uber = ScrollFrameMorph.prototype;

function ProjectsMorph(room, sliderColor) {
    var myself = this;

    // TODO: Get the room info and update when websockets do stuff
    ProjectsMorph.uber.init.call(this, null, null, sliderColor);
    this.acceptsDrops = false;
    this.room = room;
    this.add(room);
    // Reset the position
    this.room.silentSetPosition(new Point(0,0));

    // Update the ProjectsMorph when the room changes
    this.room.changed = function() {
        myself.updateRoom();
    };
    this.updateRoom();
    // Check for queried shared messages
    this.room.checkForSharedMsgs(this.room.ide.projectName);
}

ProjectsMorph.prototype.updateRoom = function() {
    // Receive updates about the room from the server
    var padding = 4;

    this.contents.destroy();
    this.contents = new FrameMorph(this);
    this.contents.acceptsDrops = false;
    this.addBack(this.contents);

    // Draw the room
    //this.room.setExtent
    this.room.drawNew();
    this.addContents(this.room);

    // Draw the "new role" button
    if (this.room.editable) {
        this._addButton({
            selector: 'createNewRole',
            icon: 'plus',
            hint: 'Add a role to the room',
            left: this.room.right() + padding*4
        });
    }
};

ProjectsMorph.prototype.destroy = function() {
    this.room.changed = nop;
    ProjectsMorph.uber.destroy.call(this);
};

ProjectsMorph.prototype._addButton = function(params) {
    var selector = params.selector,
        icon = params.icon,
        hint = params.hint,
        left = params.left || this.room.center().x,
        top = params.top || this.room.center().y,
        newButton;

    newButton = new PushButtonMorph(
        this.room,
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
