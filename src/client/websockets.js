/*globals nop,SnapCloud,Context,VariableFrame,SpriteMorph,StageMorph*/
// WebSocket Manager

var WebSocketManager = function (ide) {
    this.ide = ide;
    this.uuid = null;
    this.websocket = null;
    this.messages = [];
    this.processes = [];  // Queued processes to start
    this.gameType = 'None';
    this.devMode = false;
    this._connectWebSocket();
};

WebSocketManager.MessageHandlers = {
    // Receive an assigned uuid
    'uuid': function(data) {
        this.uuid = data.join(' ');
        this._onConnect();
    },

    // Game play message
    'message': function(data) {
        var messageType = data.shift(),
            content = JSON.parse(data.join(' ') || null);

        // TODO: filter for gameplay and pass to debugger
        this.onMessageReceived(messageType, content, 'role');
    },

    // Update on the current seats at the given table
    'table-seats': function(data) {
        var name = data.shift(),
            seats = JSON.parse(data.join(' '));
        this.ide.table.update(name, seats);
    },

    // Receive an invite to join a table
    'table-invitation': function(data) {
        console.log('Received invite to table:', data);
        this.ide.table.promptInvite.apply(this.ide.table, data);
    },

    'project-request': function(data) {
        var id = data.shift(),
            project = this.getSerializedProject(),
            msg = [
                'project-response',
                id,
                JSON.stringify(project)
            ].join(' ');
        this.sendMessage(msg);
    }
};

WebSocketManager.prototype._connectWebSocket = function() {
    // Connect socket to the server
    var self = this,
        isReconnectAttempt = this.websocket !== null,
        address;

    address = 'ws://'+(baseURL.replace('http://',''));

    // Don't connect if the already connected
    if (isReconnectAttempt) {
        console.log('trying to reconnect ('+this.websocket.readyState+')');
        if (this.websocket.readyState === this.websocket.OPEN) {
            return;
        } else if (this.websocket.readyState === this.websocket.CONNECTING) {
            // Check if successful in 500 ms
            setTimeout(self._connectWebSocket.bind(self), 500);
            return;
        }
    }

    this.websocket = new WebSocket(address);
    // Set up message firing queue
    this.websocket.onopen = function() {
        console.log('Connection established');  // REMOVE this
        //self._onConnect();

        while (self.messages.length) {
            self.websocket.send(self.messages.shift());
        }
    };

    // Set up message events
    // Where should I set this up now?
    this.websocket.onmessage = function(message) {
        var data = message.data.split(' '),
            type = data.shift(),
            role,
            content;

        if (WebSocketManager.MessageHandlers[type]) {
            WebSocketManager.MessageHandlers[type].call(self, data, message.data);
        } else {
            console.error('Unknown message:', message.data);
        }
    };

    this.websocket.onclose = function() {
        setTimeout(self._connectWebSocket.bind(self), 500);
    };
};

WebSocketManager.prototype.sendMessage = function(message) {
    var state = this.websocket.readyState;
    if (state === this.websocket.OPEN) {
        this.websocket.send(message);
    } else {
        this.messages.push(message);
    }
};

WebSocketManager.prototype.setGameType = function(gameType) {
    this.gameType = gameType.name;
    // FIXME: Remove this
};

WebSocketManager.prototype._onConnect = function() {
    // FIXME: Fix these tmp settings
    var tableUuid = this.ide.table.uuid,
        tableName = this.ide.table.name || '__new_project__';
        

    // Set the username
    // FIXME: This is insecure!!!
    if (SnapCloud.username) {
        this.sendMessage('username ' + SnapCloud.username);
    }
    if (this.ide.table.uuid) {
        this.sendMessage(['join-table', tableUuid, tableName, 'mySeat'].join(' '));
    } else {
        this.sendMessage(['create-table', tableName, 'mySeat'].join(' '));
    }
};

WebSocketManager.prototype.toggleNetwork = function() {
    this.devMode = !this.devMode;
    // FIXME: Remove this function
};

/**
 * Callback for receiving a websocket message.
 *
 * @param {String} message
 * @return {undefined}
 */
WebSocketManager.prototype.onMessageReceived = function (message, content, role) {
    var self = this,
        hats = [],
        context,
        idle = !this.processes.length,
        stage = this.ide.stage,
        block;

    content = content || [];
    if (message !== '') {
        stage.children.concat(stage).forEach(function (morph) {
            if (morph instanceof SpriteMorph || morph instanceof StageMorph) {
                hats = hats.concat(morph.allHatBlocksForSocket(message, role));
            }
        });

        for (var h = hats.length; h--;) {
            block = hats[h];
            // Initialize the variable frame with the message content for 
            // receiveSocketMessage blocks
            context = null;
            if (block.selector === 'receiveSocketMessage') {
                // Create the network context
                context = new Context();
                context.variables.addVar('__message__', content);
            }

            // Find the process list for the given block
            this.addProcess({
                block: block,
                isThreadSafe: stage.isThreadSafe,
                context: context
            });
        }

        if (idle) {
            // This is done in a setTimeout to allow for some of the processes to accumulate
            // and not block the main UI thread. Otherwise, it would simply try to start the
            // last message each time (we are more efficient when we can batch it like this).
            setTimeout(this.startProcesses.bind(this), 50);
        }
    }
};

/**
 * Add a process to the queue of processes to run. These processes are sorted
 * by their top block
 *
 * @param process
 * @return {undefined}
 */
WebSocketManager.prototype.addProcess = function (process) {
    for (var i = 0; i < this.processes.length; i++) {
        if (process.block === this.processes[i][0].block) {
            this.processes[i].push(process);
            return;
        }
    }
    this.processes.push([process]);
};

/**
 * We will create a mutex on the network message/event listening blocks. That is,
 * network messages will not trigger a process until the currently running
 * process for the network event has terminated
 *
 * @return {undefined}
 */
WebSocketManager.prototype.startProcesses = function () {
    var process,
        block,
        stage = this.ide.stage,
        activeBlock;

    // Check each set of processes to see if the block is free
    for (var i = 0; i < this.processes.length; i++) {
        block = this.processes[i][0].block;
        activeBlock = !!stage.threads.findProcess(block);
        if (!activeBlock) {  // Check if the process can be added
            process = this.processes[i].shift();
            stage.threads.startProcess(
                process.block,
                process.isThreadSafe,
                undefined,
                undefined,
                process.context
            );
            if (!this.processes[i].length) {
                this.processes.splice(i,1);
                i--;
            }
        }
    }

    if (this.processes.length) {
        setTimeout(this.startProcesses.bind(this), 5);
    }
};

WebSocketManager.prototype.getSerializedProject = function(callBack, errorCall) {
    var myself = this,
        ide = this.ide,
        pdata,
        media;

    ide.serializer.isCollectingMedia = true;
    pdata = ide.serializer.serialize(ide.stage);
    media = ide.hasChangedMedia ?
            ide.serializer.mediaXML(ide.projectName) : null;
    ide.serializer.isCollectingMedia = false;
    ide.serializer.flushMedia();

    // check if serialized data can be parsed back again
    try {
        ide.serializer.parse(pdata);
    } catch (err) {
        ide.showMessage('Serialization of program data failed:\n' + err);
        throw new Error('Serialization of program data failed:\n' + err);
    }
    if (media !== null) {
        try {
            ide.serializer.parse(media);
        } catch (err) {
            ide.showMessage('Serialization of media failed:\n' + err);
            throw new Error('Serialization of media failed:\n' + err);
        }
    }
    ide.serializer.isCollectingMedia = false;
    ide.serializer.flushMedia();

    return {
            ProjectName: ide.projectName,
            SourceCode: pdata,
            Media: media,
            SourceSize: pdata.length,
            MediaSize: media ? media.length : 0,
            TableUuid: this.ide.table.uuid
        };
};

WebSocketManager.prototype.destroy = function () {
    if (this.websocket.readyState === this.websocket.OPEN) {
        this._destroy();
    } else {
        this.websocket.onopen = this._destroy.bind(this);
    }
};

WebSocketManager.prototype._destroy = function () {
    this.websocket.onclose = nop;
    this.websocket.close();
};
