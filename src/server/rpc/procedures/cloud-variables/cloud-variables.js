/**
 * The CloudVariables Service provides support for storing variables on the cloud.
 * Variables can be optionally password-protected or stored only for the current user.
 *
 * Cloud variables that are inactive (no reads or writes) for 30 days are subject to deletion.
 *
 * @service
 */
const logger = require('../utils/logger')('cloud-variables');
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

let MAX_LOCK_AGE = 5 * 1000;
const getLockOwnerId = function(variable) {
    if (variable && variable.lock) {
        if (!isLockStale(variable)) {
            return variable.lock.clientId;
        }
    }
};

const isLockStale = function(variable) {
    if (variable && variable.lock) {
        return new Date() - variable.lock.creationTime > MAX_LOCK_AGE;
    }
    return false;
};

const isLocked = function(variable) {
    return !!getLockOwnerId(variable);
};

const ensureOwnsMutex = function(variable, clientId) {
    const ownerId = getLockOwnerId(variable);
    if (ownerId && ownerId !== clientId) {
        throw new Error('Variable is locked (by someone else)');
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

const ensureLoggedIn = function(caller) {
    if (!caller.username) {
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
CloudVariables._setMaxLockAge = function(age) {  // for testing
    MAX_LOCK_AGE = age;
};

/**
 * Get the value of a cloud variable
 * @param {String} name Variable name
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.getVariable = function(name, password) {
    const {sharedVars} = getCollections();
    const username = this.caller.username;

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
            return sharedVars.updateOne({_id: variable._id}, query)
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
    const username = this.caller.username;

    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureAuthorized(variable, password);
            ensureOwnsMutex(variable, this.caller.clientId);
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
            const id = variable._id;
            this._clearPendingLocks(id);
            return sharedVars.deleteOne({_id: id});
        })
        .then(() => 'OK');
};

/**
 * Lock a given cloud variable.
 *
 * A locked variable cannot be changed by anyone other than the person
 * who locked it. A variable cannot be locked for more than 5 seconds.
 *
 * @param {String} name Variable to lock
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.lockVariable = function(name, password) {
    validateVariableName(name);

    const {sharedVars} = getCollections();
    const username = this.caller.username;
    const clientId = this.caller.clientId;

    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureVariableExists(variable);
            ensureAuthorized(variable, password);
            // What if the block is killed before a lock can be acquired?
            // Then should we close the connection on the client?
            //
            // If locked by someone else, then we need to queue the lock
            // If it is already locked, we should block until we can obtain the lock
            const lockOwner = getLockOwnerId(variable);

            if (lockOwner && lockOwner !== clientId) {
                return this._queueLockFor(variable);
            } else {
                return this._applyLock(variable._id, clientId, username);
            }
        });
};

CloudVariables._queueLockFor = function(variable) {
    // Return a promise which will resolve when the lock is applied
    const deferred = Q.defer();
    const id = variable._id;
    const {password} = variable;

    if (!this._queuedLocks[id]) {
        this._queuedLocks[id] = [];
    }

    const lock = {
        id: id,
        password: password,
        clientId: this.caller.clientId,
        username: this.caller.username,
        promise: deferred
    };

    logger.trace(`queued lock on ${id} for ${this.caller.clientId}`);
    this._queuedLocks[id].push(lock);

    // If the request is terminated, remove the lock from the queue
    this.request.on('close', () => {
        const queue = this._queuedLocks[id] || [];
        const index = queue.indexOf(lock);
        if (index > -1) {
            queue.splice(index, 1);
            if (!this._queuedLocks[id].length) {
                delete this._queuedLocks[id];
            }
        }
        return deferred.reject(new Error('Canceled by user'));
    });

    // We need to ensure that the variable still exists in case it was deleted
    // during the earlier queries
    return this._checkVariableLock(id)
        .then(() => deferred.promise);
};

CloudVariables._applyLock = function(id, clientId, username) {
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

    setTimeout(() => this._checkVariableLock(id), MAX_LOCK_AGE+1);
    return sharedVars.updateOne({_id: id}, query)
        .then(res => {  // Ensure that the variable wasn't deleted during this application
            logger.trace(`${clientId} locked variable ${id}`);
            if (res.matchedCount === 0) {
                throw new Error('Variable deleted');
            }

            return 'OK';
        });
};

CloudVariables._clearPendingLocks = function(id) {
    const pendingLocks = this._queuedLocks[id] || [];
    pendingLocks.forEach(lock => lock.promise.reject(new Error('Variable deleted')));
    delete this._queuedLocks[id];
};

CloudVariables._checkVariableLock = function(id) {
    const {sharedVars} = getCollections();

    return sharedVars.findOne({_id: id})
        .then(variable => {
            if (!variable) {
                logger.trace(`${id} has been deleted. Clearing locks.`);
                return this._clearPendingLocks(id);
            } else if (isLockStale(variable)) {
                logger.trace(`releasing lock on ${id} (timeout).`);
                return this._onUnlockVariable(id);
            }
        });
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
    const {clientId} = this.caller;

    return sharedVars.findOne({name: name})
        .then(variable => {
            ensureVariableExists(variable);
            ensureAuthorized(variable, password);
            ensureOwnsMutex(variable, clientId);

            if (!isLocked(variable)) {
                throw new Error('Variable not locked');
            }

            const query = {
                $set: {
                    lock: null
                }
            };

            return sharedVars.updateOne({_id: variable._id}, query)
                .then(result => {
                    if(result.modifiedCount === 1) {
                        logger.trace(`${clientId} unlocked ${name} (${variable._id})`);
                    } else {
                        logger.trace(`${clientId} tried to unlock ${name} but variable was deleted`);
                    }
                    return this._onUnlockVariable(variable._id);
                })
                .then(() => 'OK');
        });
};

CloudVariables._onUnlockVariable = function(id) {
    // if there is a queued lock, apply it
    if (this._queuedLocks.hasOwnProperty(id)) {
        const nextLock = this._queuedLocks[id].shift();
        const {clientId, username} = nextLock;

        // apply the lock
        this._applyLock(id, clientId, username);
        nextLock.promise.resolve();
        if (this._queuedLocks[id].length === 0) {
            delete this._queuedLocks[id];
        }
    }
};

/**
 * Get the value of a variable for the current user.
 * @param {String} name Variable name
 */
CloudVariables.getUserVariable = function(name) {
    const {userVars} = getCollections();
    const username = this.caller.username;

    ensureLoggedIn(this.caller);
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
    ensureLoggedIn(this.caller);
    validateVariableName(name);
    validateContentSize(value);

    const {userVars} = getCollections();
    const username = this.caller.username;
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
    const username = this.caller.username;

    ensureLoggedIn(this.caller);
    return userVars.deleteOne({name: name, owner: username})
        .then(() => 'OK');
};

module.exports = CloudVariables;
