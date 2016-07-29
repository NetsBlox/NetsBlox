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

    // update on login (changing room name if default)
    SnapCloud.onLogin = function() {
        myself.update();
        if (myself._name === localize('MyRoom')) {
            myself.ide.sockets.sendMessage({type: 'request-new-name'});
        }
    }

    // change room name if default on passive login
    SnapCloud.onPassiveLogin = function() {
        if (myself._name === localize('MyRoom')) {
            myself.ide.sockets.sendMessage({type: 'request-new-name'});
        }
    }

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
        // We need to force-update & refresh to fix the layout after drawing the message palette
        // We can do this by "clicking" the room tab
        // FIXME: find a better way to refresh...
        for (var i = 0; i < this.ide.children.length; i++) {
            if (this.ide.children[i] instanceof Morph) {
                if (this.ide.children[i].tabBar) {  // found the tab morph
                    this.ide.children[i].tabBar.children[3].mouseClickLeft();  // simulate clicking the room tab
                    return;
                }
            }
        }
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
    
    this.setPosition(new Point(115, 0));  // Shift the room to the right
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
    this.showOwnerName(new Point(center, center).translateBy(this.topLeft()).translateBy(new Point(0, 1.15 * radius)));
};

RoomMorph.prototype.showOwnerName = function(center) {
     if (this.ownerLabel) {
         this.ownerLabel.destroy();
     }
    
     if (this.ownerId && !this.ownerId.startsWith('_client_')) {
         this.ownerLabel = new StringMorph('Owner: ' + this.ownerId, false, false, true);
 
         this.ownerLabel.setCenter(center);
 
         this.add(this.ownerLabel);
        // For rooms with one user occupying many roles--make sure only one owner is assigned
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

// Accessed from right-clicking the TextMorph
RoomMorph.prototype.promptShare = function(name) {
    var roles = Object.keys(this.roles),
        choices = {},
        myself = this;

    roles.splice(roles.indexOf(this.ide.projectName), 1);  // exclude myself
    for (var i = 0; i < roles.length; i++) {
        choices[roles[i]] = roles[i];
    }

    // any roles available?
    if (Object.keys(roles).length) {
        // show user available roles
        var dialog = new DialogBoxMorph();
        dialog.prompt('Send to...', '', world, false, choices);
        dialog.accept = function() {
            var choice = dialog.getInput();
            if (roles.indexOf(choice) !== -1) {
                if (myself.roles[choice]) {  // occupied
                    myself.ide.sockets.sendMessage({
                        type: 'share-msg-type',
                        roleId: choice,
                        from: myself.ide.projectName,
                        name: name,
                        fields: myself.ide.stage.messageTypes.getMsgType(name).fields
                    });
                    myself.ide.showMessage('Successfully sent!', 2);
                } else {  // not occupied, store in sharedMsgs array
                    myself.sharedMsgs.push({
                        roleId: choice, 
                        msg: {name: name, fields: myself.ide.stage.messageTypes.getMsgType(name).fields}, 
                        from: myself.ide.projectName
                        });
                    myself.ide.showMessage('The role will receive this message type on next occupation.', 2);
                    }
            } else {
                myself.ide.showMessage('There is no role by the name of \'' + choice + '\'!', 2);
            }
            this.destroy();
        }
    } else {  // notify user no available recipients
        myself.ide.showMessage('There are no other roles in the room!', 2);
    }
};

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
     // Send queried messages if possible
     for (var i = 0 ; i < this.sharedMsgs.length; i++) {
         if (this.sharedMsgs[i].roleId === role) {
             this.ide.sockets.sendMessage({
                 type: 'share-msg-type', 
                 name: this.sharedMsgs[i].msg.name,
                 fields: this.sharedMsgs[i].msg.fields, 
                 from: this.sharedMsgs[i].from,
                 roleId: role
             });
             this.sharedMsgs.splice(i, 1);
             i--;
         }
     }
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

    this.acceptsDrops = true;
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
        this.ownerLabel = new StringMorph('[OWNER]', 11, false, true, true);
        this.add(this.ownerLabel);
        this.ownerLabel.setCenter(new Point(pos.x - 12.5, pos.y + 25));
        this.parent.owner = true;  // Don't assign ownership to myself more than once
    }
};

RoleMorph.prototype.mouseClickLeft = function() {
    if (this.parent.editable) {
        this.editRole(this._label);
    } else {
        this.escalateEvent('mouseClickLeft');
    }
};

RoleMorph.prototype.reactToDropOf = function(drop) {
    // Message palette drag-and-drop
    if (drop instanceof ReporterBlockMorph && drop.forMsg) {
        shareMsgType(this, drop.blockSpec, this.parent.ide.stage.messageTypes.getMsgType(drop.blockSpec).fields);
    }

    // Block drag-and-drop (hat/command message blocks)
    if (drop.selector === 'receiveSocketMessage' || drop.selector === 'doSocketMessage') {
        // find message morph
        var msgMorph;
        for (var i = 0; i < drop.children.length; i++) {
            if (drop.children[i] instanceof MessageOutputSlotMorph || drop.children[i] instanceof MessageInputSlotMorph) {
                msgMorph = drop.children[i];
                break;
            }
        }
        
        if (msgMorph.children[0].text !== '') {  // make sure there is a message type to send...
            shareMsgType(this, msgMorph.children[0].text, msgMorph.msgFields);
        }
    }

    // Share the intended message type
    function shareMsgType(myself, name, fields) {
        if (myself.user && myself.parent.ide.projectName === myself.name) {  // occupied & myself
            myself.parent.ide.showMessage('Can\'t send a message type to yourself!', 2);
            return;
        }
        if (myself.user && myself.parent.ide.projectName !== myself.name) {  // occupied & not myself
            myself.parent.ide.sockets.sendMessage({
                type: 'share-msg-type',
                roleId: myself.name,
                from: myself.parent.ide.projectName,
                name: name,
                fields: fields
            });
            myself.parent.ide.showMessage('Successfully sent!', 2);
        } else {  // not occupied, store in sharedMsgs array
            myself.parent.sharedMsgs.push({
                roleId: myself.name, 
                msg: {name: name, fields: fields}, 
                from: myself.parent.ide.projectName
            });
            myself.parent.ide.showMessage('The role will receive this message type on next occupation.', 2);
        }
    }
    drop.destroy();
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
    this.room.drawNew();
    this.addContents(this.room);
    this.drawMsgPalette();  // Draw the message palette

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

ProjectsMorph.prototype.drawMsgPalette = function() {
    var width = 0,  // default width
        myself = this,
        stage = this.room.ide.stage;

    // Create and style the message palette
    var palette = new ScrollFrameMorph();
    palette.owner = this;
    palette.setColor(new Color(71, 71, 71, 1));
    palette.setWidth(width);
    palette.setHeight(this.room.center().y * 2);
    palette.bounds = palette.bounds.insetBy(10);
    palette.padding = 12;

    // Build list of sharable message types
    for (var i = 0; i < stage.deletableMessageNames().length; i++) {
        // Build block morph
        var msg = new ReporterBlockMorph();
        msg.blockSpec = stage.deletableMessageNames()[i];
        msg.setSpec(stage.deletableMessageNames()[i]);
        msg.setWidth(.75 * width);
        msg.setHeight(50);
        msg.forMsg = true;
        msg.isTemplate = true;
        msg.setColor(new Color(217,77,17));
        msg.setPosition(new Point(palette.bounds.origin.x + 10, palette.bounds.origin.y + 24 * i + 6));
        msg.category = 'services';
        msg.hint = new StringMorph('test');
        // Don't allow multiple instances of the block to exist at once
        msg.justDropped = function() {
            this.destroy();
        };
        // Display fields of the message type when clicked
        msg.mouseClickLeft = function() {
            var fields = stage.messageTypes.msgTypes[this.blockSpec].fields.length === 0 ? 
                'This message type has no fields.' :
                stage.messageTypes.msgTypes[this.blockSpec].fields;
            new SpeechBubbleMorph(fields, null, null, 2).popUp(this.world(), new Point(0, 0).add(this.bounds.corner));
        };

        // Custom menu
        var menu = new MenuMorph(this, null);
        menu.addItem('Send to...', function() {this.room.promptShare(msg.blockSpec)});
        msg.children[0].customContextMenu = menu;
        msg.customContextMenu = menu;

        palette.addContents(msg);
    }

    // After adding all the sharable message types, resize the container if necessary
    if (palette.contents.width() > palette.width()) {
        palette.setWidth(palette.contents.width());
        this.room.setPosition(new Point(palette.width() + 15, 0));  // Shift the room accordingly
    }

    // Display message palette with no scroll bar until it overflows
    this.addContents(palette);
    this.vBar.hide();
}

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
