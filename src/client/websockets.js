/*globals nop,SnapCloud,Context,VariableFrame,SpriteMorph,StageMorph*/
// WebSocket Manager

var WebSocketManager = function (ide) {
    this.ide = ide;
    this.uuid = null;
    this.websocket = null;
    this.messages = [];
    this.processes = [];  // Queued processes to start
    this.url = window.location.origin.replace('http://','ws://');
    this._connectWebSocket();
};

WebSocketManager.MessageHandlers = {
    // Receive an assigned uuid
    'uuid': function(msg) {
        this.uuid = msg.body;
        this._onConnect();
    },

    // Game play message
    'message': function(msg) {
        var dstId = msg.dstId,
            messageType = msg.msgType,
            content = msg.content;

        // filter for gameplay
        if (dstId === this.ide.projectName || dstId === 'everyone') {
            this.onMessageReceived(messageType, content, 'role');
        }
        // TODO: pass to debugger
    },

    // Update on the current seats at the given table
    'table-seats': function(msg) {
        this.ide.table.update(msg.leader, msg.name, /*seatId,*/ msg.seats);
    },

    // Receive an invite to join a table
    'table-invitation': function(msg) {
        this.ide.table.promptInvite(msg);
    },

    'project-fork': function(msg) {
        // I should probably change this... FIXME
        this.ide.showMessage('That other table sucked. You are now the boss.');
    },

    'project-request': function(msg) {
        var project = this.getSerializedProject();
        msg.type = 'project-response';
        msg.project = project;

        this.sendMessage(msg);
    }
};

WebSocketManager.prototype._connectWebSocket = function() {
    // Connect socket to the server
    var self = this,
        isReconnectAttempt = this.websocket !== null;

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

    this.websocket = new WebSocket(this.url);
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
    this.websocket.onmessage = function(rawMsg) {
        var msg = JSON.parse(rawMsg.data),
            type = msg.type,
            content;

        if (WebSocketManager.MessageHandlers[type]) {
            WebSocketManager.MessageHandlers[type].call(self, msg);
        } else {
            console.error('Unknown message:', msg);
        }
    };

    this.websocket.onclose = function() {
        setTimeout(self._connectWebSocket.bind(self), 500);
    };
};

WebSocketManager.prototype.sendMessage = function(message) {
    var state = this.websocket.readyState;
    message = JSON.stringify(message);
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
    if (SnapCloud.username) {  // Reauthenticate if needed
        var updateTable = this.updateTableInfo.bind(this);
        SnapCloud.reconnect(updateTable, updateTable);
    } else {
        this.updateTableInfo();
    }
};

WebSocketManager.prototype.updateTableInfo = function() {
    var tableLeader = this.ide.table.leaderId,
        seatId = this.ide.projectName,
        tableName = this.ide.table.name || '__new_project__',
        msg = {
            type: 'create-table',
            table: tableName,
            seat: seatId
        };
        
    if (this.ide.table.leaderId) {
        msg.type = 'join-table';
        msg.leader = tableLeader;
    }
    this.sendMessage(msg);
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
                hats = hats.concat(morph.allHatBlocksForSocket(message, role));  // FIXME
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
                null,
                null,
                null,
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
    media = ide.serializer.mediaXML(ide.projectName);
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
            TableLeaderId: this.ide.table.leaderId,
            TableName: this.ide.table.name
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
