/* global ThreadManager, Process, Context, IDE_Morph, Costume, StageMorph, Message */
ThreadManager.prototype.startProcess = function (
    block,
    isThreadSafe,
    exportResult,
    callback,
    isClicked,
    rightAway,
    context
) {
    var active = this.findProcess(block),
        top = block.topBlock(),
        newProc;
    if (active) {
        if (isThreadSafe) {
            return active;
        }
        active.stop();
        this.removeTerminatedProcesses();
    }
    newProc = new NetsProcess(block.topBlock(), callback, rightAway, context);
    newProc.exportResult = exportResult;
    newProc.isClicked = isClicked || false;
    if (!newProc.homeContext.receiver.isClone) {
        top.addHighlight();
    }
    this.processes.push(newProc);
    if (rightAway) {
        newProc.runStep();
    }
    return newProc;
};

// NetsProcess Overrides
NetsProcess.prototype = new Process();
NetsProcess.prototype.constructor = NetsProcess;
NetsProcess.prototype.timeout = 500; // msecs after which to force yield
NetsProcess.prototype.isCatchingErrors = true;

function NetsProcess(topBlock, onComplete, rightAway, context) {
    this.topBlock = topBlock || null;

    this.readyToYield = false;
    this.readyToTerminate = false;
    this.isDead = false;
    this.isClicked = false;
    this.isShowingResult = false;
    this.errorFlag = false;
    this.context = null;
    this.homeContext = context || new Context();
    this.lastYield = Date.now();
    this.isFirstStep = true;
    this.isAtomic = false;
    this.prompter = null;
    this.httpRequest = null;
    this.rpcRequest = null;
    this.isPaused = false;
    this.pauseOffset = null;
    this.frameCount = 0;
    this.exportResult = false;
    this.onComplete = onComplete || null;
    this.procedureCount = 0;

    if (topBlock) {
        this.homeContext.receiver = topBlock.receiver();
        this.homeContext.variables.parentFrame =
            this.homeContext.receiver.variables;
        this.context = new Context(
            null,
            topBlock.blockSequence(),
            this.homeContext
        );
        if (!rightAway) {
            this.pushContext('doYield'); // highlight top block
        }
    }
}

NetsProcess.prototype.doSocketMessage = function (name) {
    var ide = this.homeContext.receiver.parentThatIsA(IDE_Morph),
        targetRole = arguments[arguments.length-1],
        myRole = ide.projectName,  // same as seat name
        fields = Array.prototype.slice.call(arguments, 1),
        stage = ide.stage,
        messageType,
        fieldNames,
        msg;

    // If there is no name, return
    if (!name) {
        return;
    }

    messageType = stage.messageTypes.getMsgType(name);
    fieldNames = messageType.fields;

    // Create the message
    msg = new Message(messageType);
    // Set the fields
    for (var i = fieldNames.length; i--;) {
        msg.set(fieldNames[i], fields[i] || '');
    }

    ide.sockets.sendMessage({
        type: 'message',
        dstId: targetRole,
        srcId: myRole,
        msgType: msg.type.name,
        content: msg.contents
    });
};

/**
 * On socket message, unpack the message content into the variables in 
 * the list.
 *
 * @return {undefined}
 */
NetsProcess.prototype.receiveSocketMessage = function (fields) {
    var varFrame = this.context.outerContext.variables,
        names = varFrame.names(),
        content;

    // If we haven't received a message, do nothing
    if (names.indexOf('__message__') === -1) {
        return;
    }

    // Check for the message type in the stage
    // FIXME: Provide an error message about how we must receive an actual msg
    content = this.context.variables.getVar('__message__');
    if (!fields.length) {
        fields = Object.keys(content);
    }

    // Add variables by the type, NOT a complex object!
    for (var i = fields.length; i--;) {
        varFrame.addVar(fields[i], content[fields[i]]);
    }
    varFrame.deleteVar('__message__');
};

NetsProcess.prototype.createRPCUrl = function (rpc, params) {
    var ide = this.homeContext.receiver.parentThatIsA(IDE_Morph),
        uuid = ide.sockets.uuid;

    return window.location.origin + '/rpc/'+rpc+'?uuid='+uuid+'&'+params;
};

NetsProcess.prototype.callRPC = function (rpc, params, noCache) {
    var url = this.createRPCUrl(rpc, params),
        response;

    if (noCache) {
        url += '&t=' + Date.now();
    }

    if (!this.rpcRequest) {
        this.rpcRequest = new XMLHttpRequest();
        this.rpcRequest.open('GET', url, true);
        this.rpcRequest.send(null);
    } else if (this.rpcRequest.readyState === 4) {
        response = this.rpcRequest.responseText;
        this.rpcRequest = null;
        return response;
    }
    this.pushContext('doYield');
    this.pushContext();
};

// TODO: Consider moving these next two functions to the Stage
NetsProcess.prototype.getJSFromRPC = function (rpc, params) {
    var result = this.callRPC(rpc, params, true);
    if (result) {
        try {  // Try to convert it to JSON
            result = JSON.parse(result);
        } catch (e) {
            // nop
        }
    }
    if (result instanceof Array) {
        result = new List(result);
    }
    return result;
};

NetsProcess.prototype.getJSFromRPCDropdown = function (rpc, action, params) {
    return this.getJSFromRPC(['', rpc, action].join('/'), params);
};

NetsProcess.prototype.getCostumeFromRPC = function (rpc, action, params) {
    var image,
        stage = this.homeContext.receiver.parentThatIsA(StageMorph),
        paramItems = params.length ? params.split('&') : [];
        
    rpc = ['', rpc, action].join('/');
    // Add the width and height of the stage as default params
    if (params.indexOf('width') === -1) {
        paramItems.push('width=' + stage.width());
    }

    if (params.indexOf('height') === -1) {
        paramItems.push('height=' + stage.height());
    }

    params = paramItems.join('&');

    // Create the costume (analogous to reportURL)
    if (!this.requestedImage) {
        // Create new request
        this.requestedImage = new Image();
        this.requestedImage.crossOrigin = 'Anonymous';
        this.requestedImage.src = this.createRPCUrl(rpc, params);
    } else if (this.requestedImage.complete && this.requestedImage.naturalWidth) {
        // Clear request
        image = this.requestedImage;
        this.requestedImage = null;
        return new Costume(image, rpc);
    }
    this.pushContext('doYield');
    this.pushContext();
};

// Process Geo
NetsProcess.prototype.reportLatitude = function () {
    var self = this;
    if (!this.location) {
        navigator.geolocation.getCurrentPosition(function(location) {
            self.location = location;
        });
        this.location = 'loading...';
    } else if (this.location !== 'loading...') {
        var location = this.location;
        this.location = null;
        return location.coords.latitude;
    }
    this.pushContext('doYield');
    this.pushContext();
};

NetsProcess.prototype.reportLongitude = function () {
    var self = this;
    if (!this.location) {
        navigator.geolocation.getCurrentPosition(function(location) {
            self.location = location;
        });
        this.location = 'loading...';
    } else if (this.location !== 'loading...') {
        var location = this.location;
        this.location = null;
        return location.coords.longitude;
    }
    this.pushContext('doYield');
    this.pushContext();
};

// TODO: I can probably move these next two to the Sprite/StageMorphs
NetsProcess.prototype.reportStageWidth = function () {
    var stage = this.homeContext.receiver.parentThatIsA(StageMorph);
    return stage.dimensions.x;
};

NetsProcess.prototype.reportStageHeight = function () {
    var stage = this.homeContext.receiver.parentThatIsA(StageMorph);
    return stage.dimensions.y;
};


