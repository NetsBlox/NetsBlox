/* global Cloud, localize, nop, IDE_Morph, */
var SnapCloud = new Cloud('http://'+window.location.host+'/api/');

Cloud.prototype.login = function (
    username,
    password,
    callBack,
    errorCall
) {
    // both callBack and errorCall are two-argument functions
    var request = new XMLHttpRequest(),
        usr = JSON.stringify({
            '__h': password,
            '__u': username,
            '__sId': this.socketId()
        }),
        myself = this;
    this.setRoute(username);
    try {
        request.open(
            'POST',
            (this.hasProtocol() ? '' : 'http://') +
                this.url +
                '?SESSIONGLUE=' +
                this.route,
            true
        );
        request.setRequestHeader(
            'Content-Type',
            'application/json; charset=utf-8'
        );
        // glue this session to a route:
        request.setRequestHeader('SESSIONGLUE', this.route);
        request.withCredentials = true;
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    myself.api = myself.parseAPI(request.responseText);
                    // Update session info 
                    myself.session = true;
                    if (myself.api.logout) {
                        myself.username = username;
                        myself.password = password;
                        callBack.call(null, myself.api, 'Snap!Cloud');
                    } else {
                        errorCall.call(
                            null,
                            request.responseText,
                            'connection failed'
                        );
                    }
                } else if (request.status === 403) {
                    errorCall.call(
                        null,
                        '',
                        localize('wrong username or password')
                    );
                } else {
                    errorCall.call(
                        null,
                        myself.url,
                        localize('could not connect to:')
                    );
                }
            }
        };
        request.send(usr);
    } catch (err) {
        errorCall.call(this, err.toString(), 'Snap!Cloud');
    }
};

Cloud.prototype.cloneRole = function(onSuccess, onFail, args) {
    var myself = this;

    this.reconnect(
        function () {
            myself.callService(
                'cloneRole',
                onSuccess,
                onFail,
                args
            );
        },
        function(err) {
            myself.ide.showMessage(err, 2);
        }
    );
};

Cloud.prototype.moveToRole = function(onSuccess, onFail, args) {
    var myself = this;

    this.reconnect(
        function () {
            myself.callService(
                'moveToRole',
                onSuccess,
                onFail,
                args
            );
        },
        function(err) {
            myself.ide.showMessage(err, 2);
        }
    );
};

Cloud.prototype.invitationResponse = function (id, accepted, onSuccess, onFail) {
    var myself = this,
        args = [id, accepted, this.socketId()];

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
};

Cloud.prototype.inviteToRoom = function () {
    var myself = this,
        args = arguments;

    this.reconnect(
        function () {
            myself.callService(
                'inviteToRoom',
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

Cloud.prototype.deleteRole = function(onSuccess, onFail, args) {
    var myself = this;
    this.reconnect(
        function () {
            myself.callService(
                'deleteRole',
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
    var ide;
    ide = detect(
        world.children,  // FIXME: Don't depend on the 'world' variable
        function(child) {
            return child instanceof IDE_Morph;
        }
    );
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

// FIXME: I shouldn't have to override this...
Cloud.prototype.callService = function (
    serviceName,
    callBack,
    errorCall,
    args
) {
    // both callBack and errorCall are optional two-argument functions
    var request = new XMLHttpRequest(),
        service = this.api[serviceName],
        myself = this,
        stickyUrl,
        postDict;

    if (!this.session) {
        errorCall.call(null, 'You are not connected', 'Cloud');
        return;
    }
    if (!service) {
        errorCall.call(
            null,
            'service ' + serviceName + ' is not available',
            'API'
        );
        return;
    }
    if (args && args.length > 0) {
        postDict = {};
        service.parameters.forEach(function (parm, idx) {
            postDict[parm] = args[idx];
        });
    }
    try {
        stickyUrl = this.url + '/' + service.url;

        request.open(service.method, stickyUrl, true);
        request.withCredentials = true;
        request.setRequestHeader(
            'Content-Type',
            'application/x-www-form-urlencoded'
        );
        //request.setRequestHeader('MioCracker', this.session);
        //request.setRequestHeader('SESSIONGLUE', this.route);
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                var responseList = [];
                // FIXME: This should use error codes
                if (request.responseText &&
                        request.responseText.indexOf('ERROR') === 0) {
                    errorCall.call(
                        this,
                        request.responseText,
                        localize('Service:') + ' ' + localize(serviceName)
                    );
                    return;
                }
                if (serviceName === 'login') {
                    myself.api = myself.parseAPI(request.responseText);
                }
                responseList = myself.parseResponse(
                    request.responseText
                );
                callBack.call(null, responseList, service.url);
            }
        };
        request.send(this.encodeDict(postDict));
    } catch (err) {
        errorCall.call(this, err.toString(), service.url);
    }
};

