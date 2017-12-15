/* global SnapCloud, StringMorph, DialogBoxMorph, localize, newCanvas, Point, Morph,
 Color, nop, InputFieldMorph, ListMorph, IDE_Morph, TurtleIconMorph,
 TextMorph, MorphicPreferences, ScrollFrameMorph, FrameMorph, ReporterBlockMorph
 MessageOutputSlotMorph, MessageInputSlotMorph, SymbolMorph, PushButtonMorph, MenuMorph,
 SpeechBubbleMorph, ProjectDialogMorph, HandleMorph, Rectangle, fontHeight, SnapActions,
 AlignmentMorph, copy*/
/* * * * * * * * * RoomMorph * * * * * * * * */
RoomMorph.prototype = new Morph();
RoomMorph.prototype.constructor = RoomMorph;
RoomMorph.uber = Morph.prototype;
Rectangle.prototype = new Rectangle();
Rectangle.prototype.constructor = Rectangle;

RoomMorph.SIZE = 300;
RoomMorph.DEFAULT_ROLE = 'myRole';
RoomMorph.DEFAULT_ROOM = 'untitled';
RoomMorph.isSocketUuid = function(name) {
    return name && name[0] === '_';
};

RoomMorph.isValidName = function(name) {
    return !/[@\.]+/.test(name);
};

RoomMorph.isEmptyName = function(name) {
    return /^\s*$/.test(name);
};

var white = new Color(224, 224, 224);

function RoomMorph(ide) {
    this.init(ide);
}

RoomMorph.prototype.init = function(ide) {
    var myself = this;
    // Get the users at the room
    this.ide = ide;
    this.displayedMsgMorphs = [];
    this.roles = this.getDefaultRoles();
    this.roleMorphs = {};
    this.invitations = {};  // open invitations

    this.ownerId = null;
    this.collaborators = [];
    RoomMorph.uber.init.call(this, true);

    // Set up the room name
    this.name = localize(RoomMorph.DEFAULT_ROOM);
    this.roomName = new StringMorph(
        this.name,
        18,
        null,
        true,
        false,
        false,
        null,
        null,
        white
    );
    this.add(this.roomName);
    this.roomName.mouseClickLeft = function() {
        myself.editRoomName();
    };

    this.ownerLabel = new StringMorph(
        localize('Owner: myself'),
        false,
        false,
        true,
        true,
        false,
        null,
        null,
        white
    );
    this.add(this.ownerLabel);

    this.collabList = new StringMorph(
        localize('No collaborators'),
        false,
        false,
        true,
        true,
        false,
        null,
        null,
        white
    );
    this.add(this.collabList);
    this.nextRoom = null;  // next room info
    // The projectName is used for the roleId
    if (!this.ide.projectName) {
        this.ide.projectName = RoomMorph.DEFAULT_ROLE;
    }

    this.isDraggable = false;

    // update on login (changing room name if default)
    // TODO: this should be on the server...?
    SnapCloud.onLogin = function() {
        myself.update();
        if (myself.name === localize(RoomMorph.DEFAULT_ROOM)) {
            myself.ide.sockets.sendMessage({type: 'request-new-name'});
        }
    };

    // change room name if default on passive login
    SnapCloud.onPassiveLogin = function() {
        if (myself.name === localize(RoomMorph.DEFAULT_ROOM)) {
            myself.ide.sockets.sendMessage({type: 'request-new-name'});
        }
        myself.update();
    };

    // Set the initial values
    // Shared messages array for when messages are sent to unoccupied roles
    this.sharedMsgs = [];
};

RoomMorph.prototype.setRoomName = function(name) {
    this.name = name;
    this.roomName.text = name;
    this.roomName.changed();
    this.roomName.drawNew();
    this.roomName.changed();

    this.ide.controlBar.updateLabel();
};

RoomMorph.prototype.getDefaultRoles = function() {
    var roles = {},
        myRoleInfo = {
            uuid: this.myUuid(),
            username: SnapCloud.username || 'me'
        };

    roles[this.ide.projectName] = [myRoleInfo];
    return roles;
};

RoomMorph.prototype.getCurrentRoleName = function() {
    return this.ide.projectName;
};

RoomMorph.prototype.getRoleCount = function() {
    return Object.keys(this.roles).length;
};

RoomMorph.prototype.getCurrentOccupants = function(name) {
    name = name || this.getCurrentRoleName();
    if (this.roles && this.roles[name]) {
        return this.roles[name].slice();
    } else {
        return this.getDefaultRoles()[this.getCurrentRoleName()];
    }
};

RoomMorph.prototype.isLeader = function() {
    return this.getCurrentOccupants().length === 1;
};

RoomMorph.prototype.myUuid = function() {
    return this.ide.sockets.uuid;
};

RoomMorph.prototype.myUserId = function() {
    return SnapCloud.username || localize('guest');
};

RoomMorph.prototype._onNameChanged = function(newName) {
    if (this.name !== newName) {
        this.ide.sockets.sendMessage({
            type: 'rename-room',
            name: newName
        });
    }
};

RoomMorph.prototype.isOwner = function(user) {
    if (RoomMorph.isSocketUuid(this.ownerId) && !user) {
        return this.ide.sockets.uuid === this.ownerId;
    }

    if (!user && this.ownerId === null) return true;

    user = user || SnapCloud.username;
    return this.ownerId && this.ownerId === user;
};

RoomMorph.prototype.isCollaborator = function(user) {
    user = user || SnapCloud.username;
    return this.collaborators.indexOf(user) > -1;
};

RoomMorph.prototype.isGuest = function(user) {
    return !(this.isOwner(user) || this.isCollaborator(user));
};

RoomMorph.prototype.isEditable = function() {
    return this.isOwner() || this.isCollaborator();
};

RoomMorph.sameOccupants = function(roles, otherRoles) {
    var names = Object.keys(roles),
        uuids,
        usernames,
        otherUuids,
        otherUsernames,
        getUuid = function(role) {return role.uuid;},
        getUsername = function(role) {return role.uuid;};

    for (var i = names.length; i--;) {
        uuids = roles[names[i]].map(getUuid);
        otherUuids = otherRoles[names[i]].map(getUuid);
        if (!RoomMorph.equalLists(uuids, otherUuids)) return false;

        usernames = roles[names[i]].map(getUsername);
        otherUsernames = otherRoles[names[i]].map(getUsername);
        if (!RoomMorph.equalLists(usernames, otherUsernames)) return false;
    }
    return true;
};

RoomMorph.equalLists = function(first, second) {
    if (first.length !== second.length) return false;
    for (var i = first.length; i--;) {
        if (first[i] !== second[i]) return false;
    }
    return true;
};

RoomMorph.prototype.update = function(ownerId, name, roles, collaborators) {
    var wasEditable = this.isEditable(),
        oldNames,
        names,
        changed;

    changed = name && this.name !== name;
    if (changed) {
        this.setRoomName(name);
    }

    // Check if it has changed in a meaningful way
    changed = changed ||
        wasEditable !== this.isEditable();

    if (roles) {
        names = Object.keys(roles);
        oldNames = Object.keys(this.roles || {});

        changed = changed || !RoomMorph.equalLists(oldNames, names) ||
            !RoomMorph.sameOccupants(this.roles, roles);

        this.roles = roles || this.roles;
    } else {
        this.roles = this.roles || this.getDefaultRoles();
    }
    this.updateLabels();

    if (collaborators) {
        changed = changed || !RoomMorph.equalLists(collaborators, this.collaborators);
        this.setCollaborators(collaborators || this.collaborators);
    }

    // Update the roles, etc
    if (ownerId) {
        changed = changed || ownerId !== this.ownerId;
        this.ownerId = ownerId;
    }

    if (changed) {
        this.version = Date.now();
        this.drawNew();
        this.fixLayout();
        this.changed();
    }

    // Update collaborative editing
    SnapActions.isLeader = this.isLeader();
};

RoomMorph.prototype.getRoleNames = function() {
    return this.getRoleMorphs().map(function(role) {
        return role.name;
    });
};

RoomMorph.prototype.getRoleMorphs = function() {
    var myself = this;
    return Object.keys(this.roleMorphs).map(function(id) {
        return myself.roleMorphs[id];
    });
};

RoomMorph.prototype.getRole = function(name) {
    return this.getRoleMorphs().find(function(role) {
        return role.name === name;
    });
};

RoomMorph.prototype.updateLabels = function() {
    // TODO: change this to update `roles`?
    var roles,
        i;

    // Remove the old roleMorphs
    roles = Object.keys(this.roleMorphs);
    for (i = roles.length; i--;) {
        this.roleMorphs[roles[i]].destroy();
        delete this.roleMorphs[roles[i]];
    }

    // Draw the roles
    var label;
    this.roles = this.roles || this.getDefaultRoles();
    roles = Object.keys(this.roles);

    for (i = 0; i < roles.length; i++) {
        // Create the label
        label = new RoleMorph(
            localize(roles[i]),
            localize(this.roles[roles[i]])
        );
        this.add(label);
        this.roleMorphs[roles[i]] = label;
    }
};

RoomMorph.prototype.getRadius = function() {
    return Math.min(this.width(), this.height())/2;
};

RoomMorph.prototype.getRoleSize = function() {
    // Compute the max size based on the angle
    // Given the angle, compute the distance between the points
    var roleCount = this.getRoleMorphs().length,
        angle = (2*Math.PI)/roleCount,
        radius = Math.min(this.width(), this.height())/2,
        maxRoleSize = 150,
        minRoleGapSize = 10,
        startPoint,
        endPoint,
        roleSliceSize,  // given the number of roles
        quadrantSize,
        roleSize;

    startPoint = new Point(radius/2, 0);
    endPoint = (new Point(Math.cos(angle), Math.sin(angle))).multiplyBy(radius/2);
    roleSliceSize = startPoint.distanceTo(endPoint) - minRoleGapSize;
    quadrantSize = startPoint.distanceTo(new Point(0, radius/2)),

    roleSize = quadrantSize;
    if (angle < Math.PI/2) {
        roleSize = roleSliceSize;
    }
    return Math.min(roleSize, maxRoleSize);
};

RoomMorph.prototype.fixLayout = function() {
    // Position the roles
    this.roles = this.roles || this.getDefaultRoles();

    var myself = this,
        roles = this.getRoleMorphs(),
        angleSize = 2*Math.PI/roles.length,
        angle = -Math.PI / 2 + this.index*angleSize,
        len = RoleMorph.COLORS.length,
        radius = this.getRadius(),
        position,
        circleSize = this.getRoleSize(),
        color,
        x,y,
        role;

    // Draw the role
    for (var i = 0; i < roles.length; i++) {
        // position the label
        role = roles[i];
        angle = -Math.PI / 2 + i*angleSize,
        x = 0.65 * radius * Math.cos(angle);
        y = 0.65 * radius * Math.sin(angle);
        position = this.center().add(new Point(x, y));
        color = RoleMorph.COLORS[i%len];

        role.setExtent(new Point(circleSize, circleSize));
        role.setCenter(position);
        role.setColor(color);
    }

    this.roomName.setCenter(this.center());
    this.collabList.setCenter(this.center());
    this.collabList.setBottom(this.bottom() - 25);
    this.ownerLabel.setCenter(this.center());
    this.ownerLabel.setBottom(this.collabList.top() - 10);

    // Update the positions of the message morphs
    this.displayedMsgMorphs.forEach(function(morph) {
        myself.updateDisplayedMsg(morph);
    });
};

RoomMorph.prototype.drawNew = function() {
    this.image = newCanvas(this.extent());

    this.getRoleMorphs().forEach(function(morph) {
        morph.drawNew();
    });

    this.displayedMsgMorphs.forEach(function(morph) {
        morph.drawNew();
    });
};

RoomMorph.prototype.setOwner = function(owner) {
    this.ownerId = owner;
    this.ownerLabel.text = RoomMorph.isSocketUuid(this.ownerId) ?
        localize('myself') : this.ownerId;
    this.ownerLabel.changed();
    this.ownerLabel.drawNew();
    this.ownerLabel.changed();
};

RoomMorph.prototype.setCollaborators = function(collaborators) {
    this.collaborators = collaborators;
    if (this.collaborators.length) {
        this.collabList.text = localize('Collaborators') + ':\n' +
            this.collaborators.join('\n');
    } else {
        this.collabList.text = 'No collaborators';
    }
    this.collabList.changed();
    this.collabList.drawNew();
    this.collabList.changed();

};

RoomMorph.prototype.mouseClickLeft = function() {
    if (!this.isEditable()) {
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

RoomMorph.prototype.editRoomName = function () {
    var myself = this;
    if (!this.isEditable()) {
        return;
    }
    this.ide.prompt('New Room Name', function (name) {
        if (RoomMorph.isEmptyName(name)) return;  // empty name = cancel

        if (!RoomMorph.isValidName(name)) {
            // Error! name has a . or @
            new DialogBoxMorph().inform(
                'Invalid Project Name',
                'Could not set the project name because\n' +
                'the provided name is invalid',
                myself.world()
            );
        } else {
            myself.ide.sockets.sendMessage({
                type: 'rename-room',
                name: name,
                inPlace: true
            });
        }
    }, null, 'editRoomName');
};

RoomMorph.prototype.validateRoleName = function (name, cb) {
    if (RoomMorph.isEmptyName(name)) return;  // empty role name = cancel

    if (this.roles.hasOwnProperty(name)) {
        // Error! Role exists
        new DialogBoxMorph().inform(
            'Existing Role Name',
            'Could not rename role because\n' +
            'the provided name already exists.',
            this.world()
        );
    } else if (!RoomMorph.isValidName(name)) {
        // Error! name has a . or @
        new DialogBoxMorph().inform(
            'Invalid Role Name',
            'Could not change the role name because\n' +
            'the provided name is invalid',
            this.world()
        );
    } else {
        cb();
    }
};

RoomMorph.prototype.createNewRole = function () {
    // Ask for a new role name
    var myself = this;

    this.ide.prompt('New Role Name', function (roleName) {
        myself.validateRoleName(roleName, function() {
            myself._createNewRole(roleName);
        });
    }, null, 'createNewRole');
};

RoomMorph.prototype._createNewRole = function (name) {
    // Create the new role
    this.ide.sockets.sendMessage({
        type: 'add-role',
        name: name
    });
};

RoomMorph.prototype.editRole = function(name) {
    // Show a dialog of options
    //   + rename role
    //   + delete role
    //   + invite user (if unoccupied)
    //   + transfer ownership (if occupied)
    //   + evict user (if occupied)
    //   + change role (if owned by self)
    var users = this.getCurrentOccupants(name),
        dialog = new EditRoleMorph(this, name, users),
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
        myself.validateRoleName(roleName, function() {
            if (role !== roleName){
                myself.ide.sockets.sendMessage({
                    type: 'rename-role',
                    roleId: role,
                    name: roleName
                });
            }
        });
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
    SnapCloud.cloneRole(
        function() {
            myself.ide.showMessage('created copy of ' + role);
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
    role = role || 'untitled';
    if (role !== this.ide.projectName) {
        this.ide.sockets.sendMessage({
            type: 'rename-role',
            roleId: this.ide.projectName,
            name: role
        });
    }
};

RoomMorph.prototype.evictUser = function (user, role) {
    var myself = this;
    SnapCloud.evictUser(
        function() {
            myself.ide.showMessage('evicted ' + user.username + '!');
        },
        function (err, lbl) {
            myself.ide.cloudError().call(null, err, lbl);
        },
        [user.uuid, role, this.ownerId, this.name]
    );
};

RoomMorph.prototype.inviteUser = function (role) {
    var myself = this,
        callback;

    callback = function(friends) {
        friends = friends.map(function(friend) {
            return friend.username;
        });
        friends.unshift('myself');
        myself._inviteGuestDialog(role, friends);
    };

    if (this.isOwner() || this.isCollaborator()) {
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
        world = this.world(),
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
        };
    } else {  // notify user no available recipients
        myself.ide.showMessage('There are no other roles in the room!', 2);
    }
};

RoomMorph.prototype._inviteGuestDialog = function (role, friends) {
    new UserDialogMorph(this, function(user) {
        if (user) {
            this.inviteGuest(user, role);
        }
    }, friends).popUp();
};

RoomMorph.prototype.inviteGuest = function (friend, role) {
    // Use inviteGuest service
    var socketId = this.ide.sockets.uuid;
    if (friend === 'myself') {
        friend = SnapCloud.username;
    }
    SnapCloud.inviteGuest(socketId, friend, this.ownerId, this.name, role);
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

RoomMorph.prototype.showMessage = function(msg) {
    // TODO: add acceleration of animations?
    var myself = this;

    // Clear the last message(s)
    this.hideSentMsgs();

    // Get the source role
    var address = msg.srcId.split('@');
    var relSrcId = address.shift();
    var projectId = address.join('@');

    // This will have problems if the role name has been changed...

    // Get the target role(s)
    var relDstIds = msg.recipients
        .filter(function(id) {  // in the current project
            var address = id.split('@');
            var roleId = address.shift();
            var inCurrentProject = address.join('@') === projectId;
            var stillExists = !!myself.roles[roleId];
            return inCurrentProject && stillExists;
        })
        .map(function(id) {
            return id.split('@').shift();
        });

    // If they are both in the room and they both exist, animate the message
    if (!!this.roles[relSrcId]) {
        relDstIds.forEach(function(dstId) {
            myself.showSentMsg(msg, relSrcId, dstId);
        });
    }
};

RoomMorph.prototype.updateDisplayedMsg = function(msg) {
    // Update the msg morph position and size
    var srcRole = this.getRole(msg.srcRoleName),
        dstRole = this.getRole(msg.dstRoleName),
        srcPoint = srcRole.center(),
        dstPoint = dstRole.center(),
        relEndpoint = dstPoint.subtract(srcPoint),
        roleRadius = this.getRoleSize()/2,
        size;

    // move the relEndpoint so that it doesn't overlap the roles
    var dist = dstPoint.distanceTo(srcPoint),
        targetDist = dist - 2*roleRadius;

    relEndpoint = relEndpoint.scaleBy(targetDist/dist);

    size = relEndpoint.abs().add(2*msg.padding);
    msg.setExtent(size);
    msg.setCenter(dstPoint.add(srcPoint).divideBy(2));
    msg.endpoint = relEndpoint;
    msg.drawNew();
};

RoomMorph.prototype.showSentMsg = function(msg, srcId, dstId) {
    var srcRole = this.getRole(srcId),
        dstRole = this.getRole(dstId),
        relEndpoint = dstRole.center().subtract(srcRole.center()),
        msgMorph = new SentMessageMorph(msg, srcId, dstId, relEndpoint);

    this.addBack(msgMorph);
    this.displayedMsgMorphs.push(msgMorph);
    this.updateDisplayedMsg(msgMorph);
};

RoomMorph.prototype.hideSentMsgs = function() {
    this.displayedMsgMorphs.forEach(function(msgMorph) {
        msgMorph.destroy();
    });
    this.displayedMsgs = [];
};

//////////// SentMessageMorph ////////////
// Should:
//  - draw an arrow from the source to the destination
//  - not be draggable
SentMessageMorph.prototype = new Morph();
SentMessageMorph.prototype.constructor = SentMessageMorph;
SentMessageMorph.uber = Morph.prototype;

function SentMessageMorph(msg, srcId, dstId, endpoint) {
    this.init(msg, srcId, dstId, endpoint);
}

SentMessageMorph.prototype.init = function(msg, srcId, dstId, endpoint) {
    this.srcRoleName = srcId;
    this.dstRoleName = dstId;
    this.message = msg;
    this.padding = 10;

    this.endpoint = endpoint;
    SentMessageMorph.uber.init.call(this);
    this.color = IDE_Morph.prototype.frameColor.darker(50);
};

SentMessageMorph.prototype.drawNew = function() {
    this.image = newCanvas(this.extent());
    var context = this.image.getContext('2d'),
        isRight = this.endpoint.x > 0,
        isDownwards = this.endpoint.y > 0,
        startX = isRight ? 0 : -this.endpoint.x,
        startY = isDownwards ? 0 : -this.endpoint.y,
        start = new Point(startX, startY),
        end;

    // Get the startpoint (depends on the sign of the x,y values)
    start = start.add(this.padding);
    end = start.add(this.endpoint);

    // Draw a line from the current position to the endpoint
    context.strokeStyle = this.color.toString();
    context.fillStyle = this.color.toString();
    context.lineWidth = 2.5;

    context.beginPath();
    context.setLineDash([5, 5]);
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();

    context.beginPath();
    context.setLineDash([]);

    // Draw an arrow at the end
    var da = Math.PI/6,
        angle = Math.atan2(this.endpoint.y, this.endpoint.x) + Math.PI,
        size = 7.5,
        relLeftPoint = new Point(Math.cos(angle-da), Math.sin(angle-da)).multiplyBy(size),
        relRightPoint = new Point(Math.cos(angle+da), Math.sin(angle+da)).multiplyBy(size),
        leftPoint = end.add(relLeftPoint),
        rightPoint = end.add(relRightPoint);

    context.moveTo(end.x, end.y);
    context.lineTo(leftPoint.x, leftPoint.y);
    context.lineTo(rightPoint.x, rightPoint.y);
    context.lineTo(end.x, end.y);
    context.stroke();
    context.fill();
};

//////////// Network Replay Controls ////////////
NetworkReplayControls.prototype = Object.create(ReplayControls.prototype);
NetworkReplayControls.prototype.constructor = NetworkReplayControls;
NetworkReplayControls.uber = ReplayControls.prototype;

function NetworkReplayControls() {
    this.init();
}

NetworkReplayControls.prototype.displayCaption = function(event) {
    // TODO: what should captions look like?
};

NetworkReplayControls.prototype.setMessages = function(messages) {
    return this.setActions(messages);
};

NetworkReplayControls.prototype.applyEvent = function(event, next) {
    var ide = this.parentThatIsA(IDE_Morph);
    var room = ide.room;

    // TODO: animate the message sending
    room.showMessage(event);
    next();
};

NetworkReplayControls.prototype.getInverseEvent = function(event) {
    var inverseEvent = copy(event);
    inverseEvent.isInverse = true;
    return inverseEvent;
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
function RoleMorph(name, user) {
    this.init(name, user);
}

RoleMorph.prototype.init = function(name, users) {
    RoleMorph.uber.init.call(this, true);
    this.name = name;
    this.users = [];

    this.label = new StringMorph(
        this.name,
        15,
        null,
        true,
        false,
        false,
        null,
        null,
        white
    );
    this.label.mouseClickLeft = function() {
        var room = this.parentThatIsA(RoomMorph);
        if (room.isEditable()) {
            room.editRoleName(this.text);
        }
    };
    this.caption = new StringMorph(
        '',
        14,
        null,
        false,
        true,
        false,
        null,
        null,
        white
    );
    this.add(this.label);
    this.add(this.caption);
    this.acceptsDrops = true;
    this.setOccupants(users);
    this.drawNew();
};

RoleMorph.prototype.setOccupants = function(users) {
    this.users = users;
    // Update the contents of the caption
    var userText = '<empty>';
    if (this.users.length) {
        userText = this.users.map(function(user){
            return user.username || localize('guest');
        }).join(', ');
    }

    this.caption.text = userText;
    this.caption.changed();
    this.caption.drawNew();
    this.caption.changed();
};

RoleMorph.prototype.setName = function(name) {
    this.name = name;
    this.label.text = name;
    this.label.changed();
    this.label.drawNew();
    this.label.changed();
};

RoleMorph.prototype.drawNew = function() {
    var editor = this.parentThatIsA(RoomEditorMorph),
        center,
        height,
        radius,
        cxt;

    if (editor && editor.isReplayMode()) {
        this.caption.hide();
    } else {
        this.caption.show();
    }

    this.fixLayout();
    height = Math.max(this.height() - this.caption.height(), 0);
    radius = Math.min(this.width(), height)/2;
    center = new Point(this.width()/2-radius, height/2-radius).add(radius),

    // Create the image
    this.image = newCanvas(this.extent());
    cxt = this.image.getContext('2d');

    cxt.beginPath();
    cxt.fillStyle = this.color.toString();
    cxt.arc(center.x, center.y, radius, 0, 2 * Math.PI, false);
    cxt.closePath();
    cxt.fill();
    cxt.strokeStyle = this.color.darker(50).toString();
    cxt.stroke();

    this.changed();
};

RoleMorph.prototype.fixLayout = function() {
    var center = this.center();
    this.label.setCenter(new Point(center.x, center.y - this.caption.height()/2));
    this.caption.setCenter(center);
    this.caption.setBottom(this.bottom());
};

RoleMorph.prototype.mouseClickLeft = function() {
    var room = this.parentThatIsA(RoomMorph);
    if (room.isEditable()) {
        room.editRole(this.name);
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
        if (myself.users.length && myself.parent.ide.projectName === myself.name) {  // occupied & myself
            myself.parent.ide.showMessage('Can\'t send a message type to yourself!', 2);
            return;
        }
        if (myself.users && myself.parent.ide.projectName !== myself.name) {  // occupied & not myself
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
function RoleLabelMorph(name, users) {
    this.init();
}

RoleLabelMorph.prototype.init = function(name, users) {
    this.name = name;
    this.users = users;

    var usrTxt = '<empty>';
    if (this.users.length) {
        usrTxt = this.users.map(function(user){
            return user.username || localize('guest');
        }).join(', ');
    }

    this._roleLabel = new StringMorph(
        this.name,
        15,
        null,
        true,
        false,
        false,
        null,
        null,
        white
    );
    this._userLabel = new StringMorph(
        usrTxt,
        14,
        null,
        false,
        true,
        false,
        null,
        null,
        white
    );

    RoleLabelMorph.uber.init.call(this);

    this.add(this._roleLabel);
    this.add(this._userLabel);
    this.drawNew();
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
        center.y + height * 3.5
    ));
};

EditRoleMorph.prototype = new DialogBoxMorph();
EditRoleMorph.prototype.constructor = EditRoleMorph;
EditRoleMorph.uber = DialogBoxMorph.prototype;
function EditRoleMorph(room, name, users) {
    this.init(room, name, users);
}

EditRoleMorph.prototype.init = function(room, name, users) {
    EditRoleMorph.uber.init.call(this);
    this.room = room;
    this.name = name;
    this.users = users;

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
        white
    );

    this.labelString = localize('Edit') + ' ' + name;
    this.createLabel();
    this.addBody(txt);

    // Role Actions
    this.addButton('createRoleClone', 'Duplicate');

    if (users.length) {  // occupied
        // owner can evict collaborators, collaborators can evict guests

        if (name !== this.room.role()) {
            this.addButton('moveToRole', 'Move to');
        }

        if (name !== this.room.role() &&  // can't evict own role
            (this.room.isOwner() || this.room.isGuest(users))) {
            this.addButton('evictUser', 'Evict User');
        }
    } else {  // vacant
        this.addButton('moveToRole', 'Move to');
        this.addButton('inviteUser', 'Invite User');
        this.addButton('deleteRole', 'Delete role');
    }
    this.addButton('cancel', 'Cancel');
};

EditRoleMorph.prototype.inviteUser = function() {
    this.room.inviteUser(this.name);
    this.destroy();
};

EditRoleMorph.prototype.fixLayout = function() {
    var center = this.center();

    EditRoleMorph.uber.fixLayout.call(this);

    if (this.label) {
        this.label.setLeft(center.x - this.label.width()/2);
    }

    if (this.body) {
        this.body.setLeft(center.x - this.body.width()/2);
    }
};

EditRoleMorph.prototype.editRoleName = function() {
    this.room.editRoleName(this.name);
    this.destroy();
};

EditRoleMorph.prototype.createRoleClone = function() {
    this.room.createRoleClone(this.name);
    this.destroy();
};

EditRoleMorph.prototype.deleteRole = function() {
    this.room.deleteRole(this.name);
    this.destroy();
};

EditRoleMorph.prototype.moveToRole = function() {
    this.room.moveToRole(this.name);
    this.destroy();
};

EditRoleMorph.prototype.evictUser = function() {
    // TODO: which user?
    // FIXME: ask which user
    // This could be moved to clicking on the username
    this.room.evictUser(this.users[0], this.name);
    this.destroy();
};

// RoomEditorMorph ////////////////////////////////////////////////////////////

// I am an editor for the RoomMorph and network debugger

RoomEditorMorph.prototype = new ScrollFrameMorph();
RoomEditorMorph.prototype.constructor = RoomEditorMorph;
RoomEditorMorph.uber = ScrollFrameMorph.prototype;

function RoomEditorMorph(room, sliderColor) {
    this.init(room, sliderColor);
}

RoomEditorMorph.prototype.init = function(room, sliderColor) {
    RoomEditorMorph.uber.init.call(this, null, null, sliderColor);
    this.acceptsDrops = false;

    this.room = room;
    this.add(room);

    // Check for queried shared messages
    //this.room.checkForSharedMsgs(this.room.ide.projectName);

    // Replay Controls
    this.replayControls = new NetworkReplayControls(this);
    this.add(this.replayControls);
    this.replayControls.drawNew();
    this.replayControls.hide();

    var button = new PushButtonMorph(
        this.room,
        'createNewRole',
        new SymbolMorph('plus', 12)
    );
    button.padding = 0;
    button.corner = 12;
    button.color = IDE_Morph.prototype.groupColor;
    button.highlightColor = IDE_Morph.prototype.frameColor.darker(50);
    button.pressColor = button.highlightColor;
    button.labelMinExtent = new Point(36, 18);
    button.labelShadowOffset = new Point(-1, -1);
    button.labelShadowColor = button.highlightColor;
    button.labelColor = TurtleIconMorph.prototype.labelColor;
    button.contrast = this.buttonContrast;
    button.drawNew();

    button.hint = 'Add a role to the room';

    button.fixLayout();

    this.add(button);
    this.addRoleBtn = button;

    this.room.drawNew();
    this.updateControlButtons();
};

RoomEditorMorph.prototype.step = function() {
    if (this.version !== this.room.version) {
        this.updateControlButtons();
        this.version = this.room.version;
    }
};

RoomEditorMorph.prototype.show = function() {
    RoomEditorMorph.uber.show.call(this);
    if (!this.isReplayMode()) {
        this.replayControls.hide();
    }
};

RoomEditorMorph.prototype.updateControlButtons = function() {
    var sf = this.parentThatIsA(ScrollFrameMorph);

    if (!sf) {return; }

    if (!sf.toolBar) {
        sf.toolBar = this.addToggleReplay();
        sf.add(sf.toolBar);
    }

    //sf.toolBar.isVisible = !this.replayControls.enabled;
    sf.toolBar.drawNew();
    sf.toolBar.changed();

    sf.adjustToolBar();
    this.updateRoomControls();
};

RoomEditorMorph.prototype.addToggleReplay = function() {
    var myself = this,
        toolBar = new AlignmentMorph(),
        shade = (new Color(140, 140, 140));

    // TODO: add "exit replay mode" button
    // This should be added to the replay control slider
    toolBar.replayButton = new PushButtonMorph(
        this,
        function() {
            // FIXME: change this when we have an exit button on the replay slider
            if (this.isReplayMode()) {
                myself.exitReplayMode();
            } else {
                myself.enterReplayMode();
            }
            myself.updateControlButtons();
        },
        new SymbolMorph('pointRight', 12)
    );
    toolBar.replayButton.alpha = 0.2;
    toolBar.replayButton.labelShadowColor = shade;
    toolBar.replayButton.drawNew();
    toolBar.replayButton.fixLayout();
    toolBar.add(toolBar.replayButton);

    return toolBar;
};

RoomEditorMorph.prototype.fixLayout = function() {
    var controlsHeight = 80,
        roomSize = this.extent();

    roomSize.y = roomSize.y - (controlsHeight + 35);
    this.room.setExtent(roomSize);
    this.room.setCenter(this.center());
    this.room.fixLayout();

    this.addRoleBtn.setCenter(this.room.center());
    this.addRoleBtn.setTop(this.room.roomName.bottom() + 5);

    this.replayControls.setWidth(this.width()-40);
    this.replayControls.setHeight(controlsHeight);
    this.replayControls.setCenter(new Point(this.center().x, 0));
    this.replayControls.setBottom(this.bottom());
    this.replayControls.fixLayout();
};

RoomEditorMorph.prototype.setExtent = function(point) {
    RoomEditorMorph.uber.setExtent.call(this, point);

    this.fixLayout();
};

RoomEditorMorph.prototype.isReplayMode = function() {
    return this.replayControls.enabled;
};

RoomEditorMorph.prototype.exitReplayMode = function() {
    this.replayControls.disable();
    this.room.hideSentMsgs();
    this.room.drawNew();
};

RoomEditorMorph.prototype.enterReplayMode = function() {
    var ide = this.parentThatIsA(IDE_Morph);
    var url = ide.resourceURL('socket', 'messages', ide.sockets.uuid);
    var messages = [];

    try {
        messages = JSON.parse(ide.getURL(url));
        if (messages.length === 0) {
            ide.showMessage('No messages to replay', 2);
            return;
        }
        this.replayControls.enable();
        this.replayControls.setMessages(messages);
        this.room.drawNew();
        this.updateRoomControls();
    } catch(e) {
        console.error(e);
        // TODO: show an error message
    }
};

RoomEditorMorph.prototype.updateRoomControls = function() {
    // Draw the room
    this.room.drawNew();
    this.drawMsgPalette();  // Draw the message palette

    // Draw the "new role" button
    if (this.room.isEditable() && !this.isReplayMode()) {
        this.addRoleBtn.show();
    } else {
        this.addRoleBtn.hide();
    }
};

// TODO: Update this...
RoomEditorMorph.prototype.drawMsgPalette = nop;
//RoomEditorMorph.prototype.drawMsgPalette = function() {
    //var width = 0,  // default width
        //stage = this.room.ide.stage;

    //// Create and style the message palette
    //var palette = new ScrollFrameMorph();
    //palette.owner = this;
    //palette.setColor(new Color(71, 71, 71, 1));
    //palette.setWidth(width);
    //palette.setHeight(this.room.center().y * 2);
    //palette.bounds = palette.bounds.insetBy(10);
    //palette.padding = 12;

    //// Build list of sharable message types
    //for (var i = 0; i < stage.deletableMessageNames().length; i++) {
        //// Build block morph
        //var msg = new ReporterBlockMorph();
        //msg.blockSpec = stage.deletableMessageNames()[i];
        //msg.setSpec(stage.deletableMessageNames()[i]);
        //msg.setWidth(.75 * width);
        //msg.setHeight(50);
        //msg.forMsg = true;
        //msg.isTemplate = true;
        //msg.setColor(new Color(217,77,17));
        //msg.setPosition(new Point(palette.bounds.origin.x + 10, palette.bounds.origin.y + 24 * i + 6));
        //msg.category = 'services';
        //msg.hint = new StringMorph('test');
        //// Don't allow multiple instances of the block to exist at once
        //msg.justDropped = function() {
            //this.destroy();
        //};
        //// Display fields of the message type when clicked
        //msg.mouseClickLeft = function() {
            //var fields = stage.messageTypes.msgTypes[this.blockSpec].fields.length === 0 ?
                //'This message type has no fields.' :
                //stage.messageTypes.msgTypes[this.blockSpec].fields;
            //new SpeechBubbleMorph(fields, null, null, 2).popUp(this.world(), new Point(0, 0).add(this.bounds.corner));
        //};

        //// Custom menu
        //var menu = new MenuMorph(this, null);
        //menu.addItem('Send to...', function() {this.room.promptShare(msg.blockSpec);});
        //msg.children[0].customContextMenu = menu;
        //msg.customContextMenu = menu;

        //palette.addContents(msg);
    //}

    //// After adding all the sharable message types, resize the container if necessary
    //if (palette.contents.width() > palette.width()) {
        //palette.setWidth(palette.contents.width());
        //this.room.setPosition(new Point(palette.width() + 15, 0));  // Shift the room accordingly
    //}

    //// Display message palette with no scroll bar until it overflows
    //this.addContents(palette);
    //this.vBar.hide();
//};

RoomEditorMorph.prototype.addButton = function(params) {
};

// UserDialogMorph ////////////////////////////////////////////////////

// UserDialogMorph inherits from DialogBoxMorph:

UserDialogMorph.prototype = new DialogBoxMorph();
UserDialogMorph.prototype.constructor = UserDialogMorph;
UserDialogMorph.uber = DialogBoxMorph.prototype;

// UserDialogMorph instance creation:

function UserDialogMorph(target, action, users) {
    this.init(target, action, users);
}

UserDialogMorph.prototype.init = function(target, action, users) {
    this.key = 'inviteGuest';
    this.userList = users;
    UserDialogMorph.uber.init.call(
        this,
        target, // target
        action, // function
        null // environment
    );
    this.buildContents();
};

UserDialogMorph.prototype.buildContents = function() {
    this.addBody(new Morph());
    this.body.color = this.color;

    this.buildFilterField();

    this.listField = new ListMorph(this.userList);
    this.fixListFieldItemColors();
    this.listField.fixLayout = nop;
    this.listField.edge = InputFieldMorph.prototype.edge;
    this.listField.fontSize = InputFieldMorph.prototype.fontSize;
    this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    this.listField.contrast = InputFieldMorph.prototype.contrast;
    this.listField.drawNew = InputFieldMorph.prototype.drawNew;
    this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    this.body.add(this.listField);

    // add buttons
    this.labelString = 'Invite a Friend to the Room';
    this.createLabel();
    this.addButton('ok', 'OK');
    this.addButton('cancel', 'Cancel');

    this.setHeight(300);
    this.fixLayout();
};

UserDialogMorph.prototype.fixLayout = function () {
    var th = fontHeight(this.titleFontSize) + this.titlePadding * 2,
        inputField = this.filterField,
        oldFlag = Morph.prototype.trackChanges;

    Morph.prototype.trackChanges = false;

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.fixLayout();
    }

    if (this.body) {
        this.body.setPosition(this.position().add(new Point(
            this.padding,
            th + this.padding
        )));
        this.body.setExtent(new Point(
            this.width() - this.padding * 2,
            this.height() - this.padding * 3 - th - this.buttons.height()
        ));

        inputField.setWidth(
            this.body.width() -  this.padding * 6
        );
        inputField.setLeft(this.body.left() + this.padding * 3);
        inputField.drawNew();

        this.listField.setLeft(this.body.left() + this.padding);
        this.listField.setWidth(
            this.body.width()
                - this.padding
        );
        this.listField.contents.children[0].adjustWidths();

        this.listField.setTop(inputField.bottom() + this.padding);
        this.listField.setHeight(
            this.body.height() - inputField.height() - this.padding
        );

        if (this.magnifiyingGlass) {
            this.magnifiyingGlass.setTop(inputField.top());
            this.magnifiyingGlass.setLeft(this.listField.left());
        }
    }

    if (this.label) {
        this.label.setCenter(this.center());
        this.label.setTop(this.top() + (th - this.label.height()) / 2);
    }

    if (this.buttons && (this.buttons.children.length > 0)) {
        this.buttons.setCenter(this.center());
        this.buttons.setBottom(this.bottom() - this.padding);
    }

    Morph.prototype.trackChanges = oldFlag;
    this.changed();
};

UserDialogMorph.prototype.fixListFieldItemColors =
    ProjectDialogMorph.prototype.fixListFieldItemColors;

UserDialogMorph.prototype.buildFilterField =
    ProjectDialogMorph.prototype.buildFilterField;

UserDialogMorph.prototype.getInput = function() {
    return this.listField.selected;
};

UserDialogMorph.prototype.buildFilterField = function () {
    var myself = this;

    this.filterField = new InputFieldMorph('');
    this.magnifiyingGlass =
        new SymbolMorph(
            'magnifiyingGlass',
            this.filterField.height(),
            this.titleBarColor.darker(50));

    this.body.add(this.magnifiyingGlass);
    this.body.add(this.filterField);

    this.filterField.reactToKeystroke = function () {
        var text = this.getValue();

        myself.listField.elements =
            // Netsblox addition: start
            myself.userList.filter(function (username) {
                return username.toLowerCase().indexOf(text.toLowerCase()) > -1;
            });
        // Netsblox addition: end

        if (myself.listField.elements.length === 0) {
            myself.listField.elements.push('(no matches)');
        }

        myself.listField.buildListContents();
        myself.fixListFieldItemColors();
        myself.listField.adjustScrollBars();
        myself.listField.scrollY(myself.listField.top());
        myself.fixLayout();
    };
};

UserDialogMorph.prototype.popUp = function(wrrld) {
    var world = wrrld || this.target.world();
    this.setCenter(world.center());
    if (world) {
        ProjectDialogMorph.uber.popUp.call(this, world);
        this.handle = new HandleMorph(
            this,
            200,
            100,
            this.corner,
            this.corner
        );
        this.filterField.edit();
    }
};

// CollaboratorDialogMorph ////////////////////////////////////////////////////

// CollaboratorDialogMorph inherits from DialogBoxMorph:

CollaboratorDialogMorph.prototype = new UserDialogMorph();
CollaboratorDialogMorph.prototype.constructor = CollaboratorDialogMorph;
CollaboratorDialogMorph.uber = UserDialogMorph.prototype;

// CollaboratorDialogMorph instance creation:

function CollaboratorDialogMorph(target, action, users) {
    this.init(target, action, users);
}

CollaboratorDialogMorph.prototype.buildContents = function() {
    var myself = this;

    this.addBody(new Morph());
    this.body.color = this.color;

    this.buildFilterField();

    this.listField = new ListMorph(
        this.userList,
        this.userList.length > 0 ?
            function (element) {
                return element.username || element;
            } : null,
        [ // format: display shared project names bold
            [
                'bold',
                function (user) {return user.collaborating; }
            ]
        ]//,
        //function () {myself.ok(); }
    );

    this.listField.action = function (item) {
        if (item === undefined) {return; }
        if (item.collaborating) {
            myself.collaborateButton.hide();
            myself.uncollaborateButton.show();
        } else {
            myself.uncollaborateButton.hide();
            myself.collaborateButton.show();
        }
        myself.buttons.fixLayout();
        myself.fixLayout();
        myself.edit();
    };

    this.filterField.reactToKeystroke = function () {
        var text = this.getValue();

        myself.listField.elements =
            myself.userList.filter(function (user) {
                return user.username.toLowerCase().indexOf(text.toLowerCase()) > -1;
            });

        if (myself.listField.elements.length === 0) {
            myself.listField.elements.push('(no matches)');
        }

        myself.listField.buildListContents();
        myself.fixListFieldItemColors();
        myself.listField.adjustScrollBars();
        myself.listField.scrollY(myself.listField.top());
        myself.fixLayout();
    };

    this.fixListFieldItemColors();
    this.listField.fixLayout = nop;
    this.listField.edge = InputFieldMorph.prototype.edge;
    this.listField.fontSize = InputFieldMorph.prototype.fontSize;
    this.listField.typeInPadding = InputFieldMorph.prototype.typeInPadding;
    this.listField.contrast = InputFieldMorph.prototype.contrast;
    this.listField.drawNew = InputFieldMorph.prototype.drawNew;
    this.listField.drawRectBorder = InputFieldMorph.prototype.drawRectBorder;

    this.body.add(this.listField);

    // add buttons
    this.labelString = 'Invite a Friend to Collaborate';
    this.createLabel();
    this.uncollaborateButton = this.addButton(function() {
        SnapCloud.evictCollaborator(myself.listField.selected.username);
        myself.destroy();
    }, 'Remove');
    this.collaborateButton = this.addButton('ok', 'Invite');
    this.uncollaborateButton.hide();
    this.collaborateButton.hide();
    this.addButton('cancel', 'Cancel');

    this.setHeight(300);
    this.fixLayout();
};
