/**
 * The CloudVariables Service provides support for storing variables on the cloud.
 * Variables can be optionally password-protected or stored only for the current user.
 *
 * Cloud variables that are inactive (no reads or writes) for 30 days are subject to deletion.
 *
 * @service
 */
const Storage = require('../../storage');
const Q = require('q');

let _collections = null;
const getCollections = function() {
    if (!_collections) {
        _collections = {};
        _collections.sharedVars = Storage.create('cloud-variables:shared').collection;
        _collections.userVars = Storage.create('cloud-variables:user').collection;
    }
    return _collections;
};

const ensureVariableExists = function(variable) {
    if (!variable) {
        throw new Error('Variable not found');
    }

};

const MAX_LOCK_AGE = 5 * 1000 * 60;
const getLockOwnerId = function(variable) {
    if (variable && variable.lock) {
        const isStale = new Date() - variable.lock.creationTime > MAX_LOCK_AGE;
        if (!isStale) {
            return variable.lock.clientId;
        }
    }
};

const ensureOwnsMutex = function(variable, user) {
    const ownerId = getLockOwnerId(variable);
    if (ownerId && ownerId !== user.uuid) {
        throw new Error(`Variable is locked`);
    }
};

const ensureAuthorized = function(variable, password) {
    if (variable) {
        const authorized = !variable.password ||
            variable.password === password;

        if (!authorized) {
            throw new Error('Unauthorized: incorrect password');
        }
    }
};

const ensureLoggedIn = function(socket) {
    if (!socket.loggedIn) {
        throw new Error('Login required.');
    }
};

const validateVariableName = function(name) {
    if (!/^[\w _()-]+$/.test(name)) {
        throw new Error('Invalid variable name.');
    }
};

const validateContentSize = function(content) {
    const sizeInBytes = content.length*2;  // assuming utf8. Figure ~2 bytes per char
    const mb = 1024*1024;
    if (sizeInBytes > (4*mb)) {
        throw new Error('Variable value is too large.');
    }
};

const CloudVariables = {};
CloudVariables._queuedLocks = {};

/**
 * Get the value of a cloud variable
 * @param {String} name Variable name
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.getVariable = function(name, password) {
    const {sharedVars} = getCollections();
    const username = this.socket.username;

    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureVariableExists(variable);
            ensureAuthorized(variable, password);

            const query = {
                $set: {
                    lastReader: username,
                    lastReadTime: new Date(),
                }
            };
            return sharedVars.updateOne({name, password}, query)
                .then(() => variable.value);
        });
};

/**
 * Set a cloud variable.
 * If a password is provided on creation, the variable will be password-protected.
 * @param {String} name Variable name
 * @param {String} value Value to store in variable
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.setVariable = function(name, value, password) {
    validateVariableName(name);
    validateContentSize(value);

    const {sharedVars} = getCollections();
    const username = this.socket.username;

    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureAuthorized(variable, password);
            ensureOwnsMutex(variable, this.socket);
            // Set both the password and value in case it gets deleted
            // during this async fn...
            const query = {
                $set: {
                    value,
                    password,
                    lastWriter: username,
                    lastWriteTime: new Date(),
                }
            };

            return sharedVars.updateOne({name: name}, query, {upsert: true})
                .then(() => 'OK');
        });
};

/**
 * Delete a given cloud variable
 *
 * @param {String} name Variable to delete
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.deleteVariable = function(name, password) {
    const {sharedVars} = getCollections();
    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureAuthorized(variable, password);

            // Clear the queued locks
            // TODO
            return sharedVars.deleteOne({name, password});
        })
        .then(() => 'OK');
};

/**
 * Lock a given cloud variable.
 *
 * A locked variable cannot be changed by anyone other than the person
 * who locked it. A variable cannot be locked for more than 5 minutes.
 * 
 * @param {String} name Variable to lock
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.lockVariable = function(name, password) {
    validateVariableName(name);

    const {sharedVars} = getCollections();
    const username = this.socket.username;
    const clientId = this.socket.uuid;

    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureVariableExists(variable);
            ensureAuthorized(variable, password);
            // What if the block is killed before a lock can be acquired?
            // Then should we close the connection on the client?
            //
            // If locked by someone else, then we need to queue the lock
            // If it is already locked, we should block until we can obtain the lock
            // TODO
            const isLocked = !!getLockOwnerId(variable);
            // if locked, queue the applyLockFn
            // TODO
            // else apply the lock
            // TODO

            if (isLocked) {
                return this._queueLockFor(variable);
            } else {
                return this._applyLock(name, password, clientId, username);
            }
        });
};

CloudVariables._queueLockFor = function(variable) {
    // Return a promise which will resolve when the lock is applied
    // TODO
    const deferred = Q.defer();
    const {name, password} = variable;

    if (!this._queuedLocks[name]) {
        this._queuedLocks[name] = [];
    }

    this._queuedLocks[name].push({
        password: password,
        clientId: this.socket.uuid,
        username: this.socket.username,
        promise: deferred
    });

    // call setTimeout for when the lock times out?
    // TODO

    return deferred.promise;
};

CloudVariables._applyLock = function(name, password, clientId, username) {
    console.log('applying lock for', name, 'for', clientId);
    const {sharedVars} = getCollections();

    const lock = {
        clientId,
        username,
        creationTime: new Date()
    };
    const query = {
        $set: {
            lock
        }
    };

    // We need to ensure that two of these don't happen simultaneously
    // Could I queue these requests to they don't overwrite each other?
    // TODO
    return sharedVars.updateOne({name, password}, query)
        .then(() => 'OK');
};

/**
 * Unlock a given cloud variable.
 *
 * A locked variable cannot be changed by anyone other than the person
 * who locked it. A variable cannot be locked for more than 5 minutes.
 *
 * @param {String} name Variable to delete
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.unlockVariable = function(name, password) {
    validateVariableName(name);

    const {sharedVars} = getCollections();
    const username = this.socket.username;

    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureVariableExists(variable);
            ensureAuthorized(variable, password);

            const lockOwner = getLockOwnerId(variable);
            if (lockOwner === this.socket.uuid) {
                const query = {
                    $set: {
                        lock: null
                    }
                };

                return sharedVars.updateOne({name, password}, query)
                    .then(() => this._onUnlockVariable(name));
            }
        })
        .then(() => 'OK');
};

CloudVariables._onUnlockVariable = function(name) {
    // if there is a queued lock, apply it
    if (this._queuedLocks[name]) {
        const nextLock = this._queuedLocks[name].shift();
        const {password, clientId, username} = nextLock;

        // apply the lock
        this._applyLock(name, password, clientId, username);
        nextLock.promise.resolve();
        if (this._queuedLocks[name].length === 0) {
            delete this._queuedLocks[name];
        }
    }
};

/**
 * Get the value of a variable for the current user.
 * @param {String} name Variable name
 */
CloudVariables.getUserVariable = function(name) {
    const {userVars} = getCollections();
    const username = this.socket.username;

    ensureLoggedIn(this.socket);
    return userVars.findOne({name: name, owner: username})
        .then(variable => {
            if (!variable) {
                throw new Error('Variable not found');
            }

            const query = {
                $set: {
                    lastReadTime: new Date(),
                }
            };
            return userVars.updateOne({name, owner: username}, query)
                .then(() => variable.value);
        });
};

/**
 * Set the value of the user cloud variable for the current user.
 * @param {String} name Variable name
 * @param {String} value
 */
CloudVariables.setUserVariable = function(name, value) {
    ensureLoggedIn(this.socket);
    validateVariableName(name);
    validateContentSize(value);

    const {userVars} = getCollections();
    const username = this.socket.username;
    const query = {
        $set: {
            value,
            lastWriteTime: new Date(),
        }
    };
    return userVars.updateOne({name, owner: username}, query, {upsert: true})
        .then(() => 'OK');
};

/**
 * Delete the user variable for the current user.
 * @param {String} name Variable name
 * @param {String} value
 */
CloudVariables.deleteUserVariable = function(name) {
    const {userVars} = getCollections();
    const username = this.socket.username;

    ensureLoggedIn(this.socket);
    return userVars.deleteOne({name: name, owner: username})
        .then(() => 'OK');
};

module.exports = CloudVariables;
