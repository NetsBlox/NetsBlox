/* global localize, nop, IDE_Morph, */
NetCloud.prototype = new Cloud();

function NetCloud(url) {
    Cloud.call(this, url);
    this.onLogin = nop;
}

NetCloud.prototype.login = function (
    username,
    password,
    remember,
    callBack,
    errorCall
) {
    // both callBack and errorCall are two-argument functions
    var request = new XMLHttpRequest(),
        usr = JSON.stringify({
            __h: password,
            __u: username,
            remember: remember,
            socketId: this.socketId()
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
                        myself.onLogin();
                        callBack.call(null, myself.api, 'NetsBlox Cloud');
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
                        localize(request.responseText || 'wrong username or password')
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
        errorCall.call(this, err.toString(), 'NetsBlox Cloud');
    }
};

NetCloud.prototype.cloneRole = function(onSuccess, onFail, args) {
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

NetCloud.prototype.moveToRole = function(onSuccess, onFail, args) {
    var myself = this;
    args.push(this.socketId());

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

NetCloud.prototype.invitationResponse = function (id, accepted, onSuccess, onFail) {
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

NetCloud.prototype.inviteToRoom = function () {
    var myself = this,
        args = arguments;

    this.reconnect(
        function () {
            myself.callService(
                'inviteToRoom',
                nop,
                nop,
                args
            );
        },
        nop
    );
};

NetCloud.prototype.getFriendList = function (callBack, errorCall) {
    var myself = this;
    this.reconnect(
        function () {
            myself.callService(
                'getFriendList',
                function (response, url) {
                    var ids = Object.keys(response[0] || {});
                    callBack.call(null, ids, url);
                },
                errorCall
            );
        },
        errorCall
    );
};

NetCloud.prototype.deleteRole = function(onSuccess, onFail, args) {
    var myself = this;
    this.reconnect(
        function () {
            myself.callService(
                'deleteRole',
                function () {
                    onSuccess.call(null);
                },
                onFail,
                args
            );
        },
        onFail
    );
};

NetCloud.prototype.evictUser = function(onSuccess, onFail, args) {
    var myself = this;
    this.reconnect(
        function () {
            myself.callService(
                'evictUser',
                onSuccess.bind(null),
                onFail,
                args
            );
        },
        onFail
    );
};

NetCloud.prototype.socketId = function () {
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
NetCloud.prototype.saveProject = function (ide, callBack, errorCall) {
    var myself = this;
    myself.reconnect(
        function () {
            myself.callService(
                'saveProject',
                function (response, url) {
                    callBack.call(null, response, url);
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
NetCloud.prototype.callService = function (
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

NetCloud.prototype.passiveLogin = function (ide, callback) {
    // Try to login w/ cookie only
    var request = new XMLHttpRequest(),
        socketId = this.socketId(),
        usr = JSON.stringify({
            return_user: true,
            api: true,
            socketId: socketId
        }),
        myself = this,
        response;

    callback = callback || nop;
    try {
        request.open(
            'POST',
            (this.hasProtocol() ? '' : 'http://') +
                this.url,
            true
        );
        request.setRequestHeader(
            'Content-Type',
            'application/json; charset=utf-8'
        );
        // glue this session to a route:
        request.withCredentials = true;
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    response = JSON.parse(request.responseText);
                    myself.api = myself.parseAPI(response.api);
                    myself.username = response.username;
                    myself.session = true;
                    myself.password = true;
                    if (ide) {
                        ide.source = 'cloud';
                    }
                    myself.onPassiveLogin();
                    callback();
                }
            }
        };
        request.send(usr);
    } catch (err) {
        console.error(err.toString());
    }
    
};

NetCloud.prototype.reconnect = function (callback, errorCall) {
    if (this.password === true) {  // if using session cookie, don't login then back out
        this.passiveLogin(null, callback);
    } else {
        if (!(this.username && this.password)) {
            this.message('You are not logged in');
            return;
        }
        this.login(
            this.username,
            this.password,
            undefined,
            callback,
            errorCall
        );
    }
};

NetCloud.prototype.disconnect = nop;

NetCloud.prototype.logout = function (callBack, errorCall) {
    this.callService(
        'logout',
        callBack,
        errorCall
    );
    this.clear();
};

NetCloud.prototype.signup = function (
    username,
    email,
    callBack,
    errorCall
) {
    // both callBack and errorCall are two-argument functions
    var request = new XMLHttpRequest(),
        myself = this,
        data = 'Username=' + encodeURIComponent(username) + '&Email=' +
            encodeURIComponent(email);
    try {
        request.open(
            'POST',
            (this.hasProtocol() ? '' : 'http://')
                + this.url + 'SignUp',
            true
        );
        request.setRequestHeader(
            "Content-Type",
            "application/x-www-form-urlencoded"
        );
        request.withCredentials = true;
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.responseText) {
                    if (request.responseText.indexOf('ERROR') === 0) {
                        errorCall.call(
                            this,
                            request.responseText,
                            'Signup'
                        );
                    } else {
                        callBack.call(
                            null,
                            request.responseText,
                            'Signup'
                        );
                    }
                } else {
                    errorCall.call(
                        null,
                        myself.url + 'SignUp',
                        localize('could not connect to:')
                    );
                }
            }
        };
        request.send(data);
    } catch (err) {
        errorCall.call(this, err.toString(), 'NetsBlox Cloud');
    }
};

var SnapCloud = new NetCloud(window.location.protocol + '//' + window.location.host+'/api/');
