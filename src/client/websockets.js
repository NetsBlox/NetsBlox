/*globals nop,SnapCloud,Context,VariableFrame,SpriteMorph,StageMorph*/
// WebSocket Manager

var WebSocketManager = function (stage) {
    this.stage = stage;
    this.uuid = null;
    this.websocket = null;
    this.messages = [];
    this.gameType = null;
    this.paradigm = null;
    this.connected = false;
    this._connectWebSocket();
};

WebSocketManager.prototype._connectWebSocket = function() {
    // Connect socket to the server
    var self = this,
        isReconnectAttempt = this.websocket !== null,
        address;

    address = 'ws://'+(window.location.origin
        .replace('http://','')
        .replace(/:?[0-9]*$/,':5432'));

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
        if (self.gameType || self.paradigm) {
            self.updateGameType();
        }

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

        if (type === 'uuid') {
            console.log('Setting uuid to '+data.join(' '));
            self.uuid = data.join(' ');
        } else {
            role = data.pop();
            content = JSON.parse(data.join(' ') || null);
            self.onMessageReceived(type, content, role);
        }
    };

    this.websocket.onclose = function() {
        console.log('Connection closed');  // REMOVE this
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
    this.paradigm = gameType.paradigm;
    this.gameType = gameType.name;
    this.connected = true;
    this.updateGameType();
};

WebSocketManager.prototype.updateGameType = function() {
    this.sendMessage('paradigm '+this.paradigm);
    this.sendMessage('gameType '+this.gameType);
};

// If setting paradigm, record if the connection is 'on' or 'off'
// Technically, it is always on; it simply toggles communication paradigms
// on the server ('off' is the 'sandbox' paradigm)
WebSocketManager.prototype.toggleNetwork = function() {
    var newParadigm;

    this.connected = !this.connected;
    console.log('Network is now '+ (this.connected ? '' : 'dis') + 'connected');
    newParadigm = this.connected ? this.paradigm :'sandbox';
    this.sendMessage('paradigm '+newParadigm);
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
        procs = [];

    content = content || [];
    if (message !== '') {
        this.stage.lastMessage = message;
        this.stage.children.concat(this.stage).forEach(function (morph) {
            if (morph instanceof SpriteMorph || morph instanceof StageMorph) {
                hats = hats.concat(morph.allHatSocketBlocksFor(message, role));
            }
        });

        hats.forEach(function (block) {
            // Initialize the variable frame with the message content for 
            // receiveSocketMessage blocks
            if (block.selector === 'receiveSocketMessage') {
                // Create the network context
                var context = new Context();
                for (var i = content.length; i--;) {
                    context.variables.addVar(i, content[i]);
                }
                procs.push(self.stage.threads.startProcess(
                    block, 
                    self.stage.isThreadSafe, 
                    undefined,
                    undefined,
                    context));
            } else {
                procs.push(self.stage.threads.startProcess(block, self.stage.isThreadSafe));
            }
        });
    }
    return procs;
};

WebSocketManager.prototype.destroy = function () {
    this.websocket.onclose = nop;
    this.websocket.close();
};
