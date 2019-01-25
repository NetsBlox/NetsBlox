const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest,
    hex_sha512 =  require('./sha512').hex_sha512;
'use strict';
/* global hex_sha512 */

/* NetsBlox client authentication library
 * Find the latest version in the github repo:
 * https://github.com/NetsBlox/client-auth
 */

class AuthHandler {
    constructor(serverUrl) {
        if (serverUrl.endsWith('/')) serverUrl = serverUrl.substr(0, serverUrl.length-1);
        this.serverUrl = serverUrl;
    }

    _requestPromise(request, data) {
        return new Promise((resolve, reject) => {
            // stringifying undefined => undefined
            if (data) {
                request.setRequestHeader(
                    'Content-Type',
                    'application/json; charset=utf-8'
                );
            }
            request.send(JSON.stringify(data));
            request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    if (request.status >= 200 && request.status < 300) {
                        resolve(request);
                    } else {
                        let err = new Error(request.statusText || 'Unsuccessful Xhr response');
                        err.request = request;
                        reject(err);
                    }
                }
            };
        });
    }

    login(username, password) {
        const request = new XMLHttpRequest();
        request.open('POST', `${this.serverUrl}/api`, true);
        request.withCredentials = true;
        const data = {
            __u: username,
            __h: hex_sha512(password)
        };
        return this._requestPromise(request, data);
    }

    logout() {
        const request = new XMLHttpRequest();
        request.open('POST', `${this.serverUrl}/api/logout`, true);
        request.withCredentials = true;
        return this._requestPromise(request);
    }

    register(username, email, password) {
        const request = new XMLHttpRequest();
        request.open('POST', `${this.serverUrl}/api/SignUp`, true);
        request.withCredentials = true;
        const data = {
            Username: username,
            Password: hex_sha512(password),
            Email: email
        };
        return this._requestPromise(request, data);
    }

    checkLogin() {
        const request = new XMLHttpRequest();
        request.open('POST', `${this.serverUrl}/api`, true);
        request.withCredentials = true;
        return this._requestPromise(request);
    }

    // gets user info: username, email
    getProfile() {
        const request = new XMLHttpRequest();
        request.open('POST', `${this.serverUrl}/api`, true);
        request.withCredentials = true;
        const data = {
            api: false,
            return_user: true,
            silent: true
        };
        return this._requestPromise(request, data)
            .then(res => {
                if (!res.responseText) throw new Error('Access denied. You are not logged in.');
                let user = JSON.parse(res.responseText);
                return user;
            });
    }
}

module.exports = AuthHandler;
