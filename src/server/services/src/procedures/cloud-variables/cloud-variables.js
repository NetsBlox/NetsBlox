/**
 * The CloudVariables Service provides support for storing variables on the cloud.
 * Variables can be optionally password-protected or stored only for the current user.
 *
 * Cloud variables that are inactive (no reads or writes) for 30 days are subject to deletion.
 *
 * @service
 * @category GLOBAL
 * @category Utilities
 */
const logger = require('../utils/logger')('cloud-variables');
const Storage = require('../../storage');
const utils = require('../utils');

const globalListeners = {}; // map<var name, map<client id, [socket, msg name, expiry timestamp]>>
const userListeners = {}; // map<user name, map<var name, map<client id, [socket, msg name, expiry timestamp]>>>

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
 * @returns {Any} the stored value
 */
CloudVariables.getVariable = async function(name, password) {
    const {sharedVars} = getCollections();
    const username = this.caller.username;
    const variable = await sharedVars.findOne({name: name});

    ensureVariableExists(variable);
    ensureAuthorized(variable, password);

    const query = {
        $set: {
            lastReader: username,
            lastReadTime: new Date(),
        }
    };
    await sharedVars.updateOne({_id: variable._id}, query);
    return variable.value;
};

CloudVariables._sendUpdate = function(name, value, targets) {
    const expired = [];
    const now = +new Date();
    for (const clientId in targets) {
        const [socket, msgType, expiry] = targets[clientId];
        if (now < expiry) socket.sendMessage(msgType, { name, value });
        else expired.push(clientId);
    }
    for (const clientId of expired) {
        delete targets[clientId];
    }
};

/**
 * Set a cloud variable.
 * If a password is provided on creation, the variable will be password-protected.
 * @param {String} name Variable name
 * @param {Any} value Value to store in variable
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.setVariable = async function(name, value, password) {
    validateVariableName(name);
    validateContentSize(value);

    const {sharedVars} = getCollections();
    const username = this.caller.username;
    const variable = await sharedVars.findOne({name: name});

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

    await sharedVars.updateOne({name: name}, query, {upsert: true});
    this._sendUpdate(name, value, globalListeners[name] || {});
};

/**
 * Delete a given cloud variable
 *
 * @param {String} name Variable to delete
 * @param {String=} password Password (if password-protected)
 */
CloudVariables.deleteVariable = async function(name, password) {
    const {sharedVars} = getCollections();
    const variable = await sharedVars.findOne({name: name});

    ensureVariableExists(variable);
    ensureAuthorized(variable, password);

    // Clear the queued locks
    const id = variable._id;
    this._clearPendingLocks(id);
    await sharedVars.deleteOne({_id: id});
    delete globalListeners[name];
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
CloudVariables.lockVariable = async function(name, password) {
    validateVariableName(name);

    const {sharedVars} = getCollections();
    const username = this.caller.username;
    const clientId = this.caller.clientId;
    const variable = await sharedVars.findOne({name: name});

    ensureVariableExists(variable);
    ensureAuthorized(variable, password);
    // What if the block is killed before a lock can be acquired?
    // Then should we close the connection on the client?
    //
    // If locked by someone else, then we need to queue the lock
    // If it is already locked, we should block until we can obtain the lock
    const lockOwner = getLockOwnerId(variable);

    if (lockOwner && lockOwner !== clientId) {
        await this._queueLockFor(variable);
    } else {
        await this._applyLock(variable._id, clientId, username);
    }
};

CloudVariables._queueLockFor = async function(variable) {
    // Return a promise which will resolve when the lock is applied
    const deferred = utils.defer();
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
    await this._checkVariableLock(id);
    return deferred.promise;
};

CloudVariables._applyLock = async function(id, clientId, username) {
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
    const res = await sharedVars.updateOne({_id: id}, query);

    // Ensure that the variable wasn't deleted during this application
    logger.trace(`${clientId} locked variable ${id}`);
    if (res.matchedCount === 0) {
        throw new Error('Variable deleted');
    }
};

CloudVariables._clearPendingLocks = function(id) {
    const pendingLocks = this._queuedLocks[id] || [];
    pendingLocks.forEach(lock => lock.promise.reject(new Error('Variable deleted')));
    delete this._queuedLocks[id];
};

CloudVariables._checkVariableLock = async function(id) {
    const {sharedVars} = getCollections();
    const variable = await sharedVars.findOne({_id: id});

    if (!variable) {
        logger.trace(`${id} has been deleted. Clearing locks.`);
        this._clearPendingLocks(id);
    } else if (isLockStale(variable)) {
        logger.trace(`releasing lock on ${id} (timeout).`);
        await this._onUnlockVariable(id);
    }
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
CloudVariables.unlockVariable = async function(name, password) {
    validateVariableName(name);

    const {sharedVars} = getCollections();
    const {clientId} = this.caller;
    const variable = await sharedVars.findOne({name: name});

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

    const result = await sharedVars.updateOne({_id: variable._id}, query);

    if(result.modifiedCount === 1) {
        logger.trace(`${clientId} unlocked ${name} (${variable._id})`);
    } else {
        logger.trace(`${clientId} tried to unlock ${name} but variable was deleted`);
    }
    await this._onUnlockVariable(variable._id);
};

CloudVariables._onUnlockVariable = async function(id) {
    // if there is a queued lock, apply it
    if (this._queuedLocks.hasOwnProperty(id)) {
        const nextLock = this._queuedLocks[id].shift();
        const {clientId, username} = nextLock;

        // apply the lock
        await this._applyLock(id, clientId, username);
        nextLock.promise.resolve();
        if (this._queuedLocks[id].length === 0) {
            delete this._queuedLocks[id];
        }
    }
};

/**
 * Get the value of a variable for the current user.
 * @param {String} name Variable name
 * @returns {Any} the stored value
 */
CloudVariables.getUserVariable = async function(name) {
    const {userVars} = getCollections();
    const username = this.caller.username;

    ensureLoggedIn(this.caller);
    const variable = await userVars.findOne({name: name, owner: username});

    if (!variable) {
        throw new Error('Variable not found');
    }

    const query = {
        $set: {
            lastReadTime: new Date(),
        }
    };
    await userVars.updateOne({name, owner: username}, query);
    return variable.value;
};

/**
 * Set the value of the user cloud variable for the current user.
 * @param {String} name Variable name
 * @param {Any} value Value to store in variable
 */
CloudVariables.setUserVariable = async function(name, value) {
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
    await userVars.updateOne({name, owner: username}, query, {upsert: true});
    this._sendUpdate(name, value, (userListeners[username] || {})[name] || {});
};

/**
 * Delete the user variable for the current user.
 * @param {String} name Variable name
 */
CloudVariables.deleteUserVariable = async function(name) {
    const {userVars} = getCollections();
    const username = this.caller.username;

    ensureLoggedIn(this.caller);
    await userVars.deleteOne({name: name, owner: username});
    delete (userListeners[username] || {})[name];
};

CloudVariables._getListenBucket = function (name) {
    let bucket = globalListeners[name];
    if (!bucket) bucket = globalListeners[name] = {};
    return bucket;
};
CloudVariables._getUserListenBucket = function (name) {
    const user = this.caller.username;
    let userBucket = userListeners[user];
    if (!userBucket) userBucket = userListeners[user] = {};

    let bucket = userBucket[name];
    if (!bucket) bucket = userBucket[name] = {};
    return bucket;
};

/**
 * Registers your client to receive messages each time the variable value is updated.
 * ``name`` and ``password`` denote the variable to listen to.
 * ``msgType`` is the name of the message that will be sent each time it is updated.
 * 
 * The variable must already exist prior to calling this RPC.
 * Update events will cease when the variable is deleted.
 * 
 * **Message Fields**
 * 
 * - ``name`` - the name of the variable that was updated
 * - ``value`` - the new value of the variable
 * 
 * @param {String} name Variable name
 * @param {String} msgType Message type to send each time the variable is updated
 * @param {String=} password Password (if password-protected)
 * @param {Duration=} duration The maximum duration to listen for updates on the variable (default 1hr).
 */
CloudVariables.listenToVariable = async function(name, msgType, password, duration = 60*60*1000) {
    await this.getVariable(name, password); // ensure we can get the value
    const bucket = this._getListenBucket(name);
    bucket[this.socket.clientId] = [this.socket, msgType, +new Date() + duration];
};

/**
 * Identical to :func:`CloudVariables.listenToVariable` except that it listens for updates on a user variable.
 * 
 * @param {String} name Variable name
 * @param {Any} msgType Message type to send each time the variable is updated
 * @param {Duration=} duration The maximum duration to listen for updates on the variable (default 1hr).
 */
CloudVariables.listenToUserVariable = async function(name, msgType, duration = 60*60*1000) {
    await this.getUserVariable(name); // ensure we can get the value
    const bucket = this._getUserListenBucket(name);
    bucket[this.socket.clientId] = [this.socket, msgType, +new Date() + duration];
};

module.exports = CloudVariables;
