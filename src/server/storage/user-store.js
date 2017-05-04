'use strict';

var randomString = require('just.randomstring'),
    hash = require('../../common/sha512').hex_sha512,
    DataWrapper = require('./data'),
    blob = require('./blob-storage'),
    Q = require('q'),
    _ = require('lodash'),
    mailer = require('../mailer');

class UserStore {
    constructor (logger, db) {
        this._logger = logger.fork('users');
        this._users = db.collection('users');
    }

    get (username, callback) {
        // Retrieve the user
        this._users.findOne({username}, (e, data) => {
            // retrieve the role info from the blob storage and create 'rooms'
            let user = null;
            if (data) {
                user = new User(this._logger, this._users, data);
                user.loadProjects().then(() => callback(e, user));
            } else {
                callback(e, null);
            }
        });
    }

    names () {
        return this._users.find().toArray()
            .then(users => users.map(user => user.username))
            .catch(e => this._logger.error('Could not get the user names!', e));
    }

    new(username, email) {
        var createdAt = Date.now();

        return new User(this._logger, this._users, {
            username,
            email,
            createdAt
        });
    }
}

class User extends DataWrapper {

    constructor(logger, db, data) {
        // Update tables => rooms
        data.rooms = data.rooms || data.tables || [];
        delete data.tables;

        // Update seats => roles
        data.rooms
            .forEach(room => {
                room.roles = room.roles || room.seats;
                delete room.seats;
            });

        super(db, data);
        this._changedRooms = [];
        this._roomHashes = {};
        this._logger = logger.fork(data.username);
    }

    pretty() {
        var prettyUser = this._saveable();
        prettyUser.hash = '<omitted>';
        return prettyUser;
    }

    prepare() {
        // If no password, assign tmp
        if (!this.hash) {
            let password = this.password || randomString(8);

            this._emailTmpPassword(password);
            this.hash = hash(password);
        }
        delete this.password;
        this.rooms = this.rooms || this.tables || [];

        return this.saveProjects();
    }

    loadProjects () {  // load the rooms from the projects (retrieve blob data)
        return Q.all(this.projects.map(project => {
            let room = project,
                roles,
                srcContent,
                roleNames,
                hashes,
                media,
                role;

            roleNames = Object.keys(room.roles);
            roles = roleNames.map(name => room.roles[name])
                .filter(role => !!role);

            if (roles.length < Object.keys(room.roles).length) {
                this._logger.warn(`Found null roles in ${room.uuid}. Removing...`);
            }

            // Record the hashes
            this._roomHashes[project.name] = {};
            for (let i = roles.length; i--;) {
                role = room.roles[roleNames[i]];
                hashes = {
                    SourceCode: role.SourceCode,
                    Media: role.Media
                };
                this._roomHashes[project.name][roleNames[i]] = hashes;
            }

            srcContent = roles.map(role => blob.get(role.SourceCode));
            media = roles.map(role => blob.get(role.Media));

            return Q.all(srcContent)
                .then(content => {
                    for (let i = roles.length; i--;) {
                        room.roles[roleNames[i]].SourceCode = content[i];
                    }
                    return Q.all(media);
                })
                .then(content => {
                    for (let i = roles.length; i--;) {
                        room.roles[roleNames[i]].Media = content[i];
                    }
                    return room;
                });
        }))
        .then(rooms => this.rooms = rooms)
        .fail(err => this.logger.error(`Project load failed for ${this.username}: ${err}`));
    }

    saveProjects () {  // save the rooms to the blob and update the 'projects'
        return Q.all(this.rooms.map(room => {
            let project = _.cloneDeep(room),
                roleNames = Object.keys(room.roles),
                roles = roleNames.map(name => room.roles[name]),
                srcIds,
                mediaIds;

            // Store the changed rooms and look up the other rooms
            if (this.hasChanged(room)) {
                srcIds = roles.map(role => blob.store(role.SourceCode));
                mediaIds = roles.map(role => blob.store(role.Media));
            } else {
                // Look up the original hashes
                var hashes = this._roomHashes[project.name];
                srcIds = roleNames.map(name => hashes[name].SourceCode);
                mediaIds = roleNames.map(name => hashes[name].Media);
            }

            return Q.all(srcIds)
                .then(ids => {
                    for (let i = roles.length; i--;) {
                        project.roles[roleNames[i]].SourceCode = ids[i];
                    }
                    return Q.all(mediaIds);
                })
                .then(ids => {
                    for (let i = roles.length; i--;) {
                        project.roles[roleNames[i]].Media = ids[i];
                    }
                    return project;
                });
        }))
        .then(projects => {
            // Verify that all the projects are the correct format
            this.projects = projects;
            this._changedRooms = [];
        })
        .fail(err => this.logger.error(`Project save failed for ${this.username}: ${err}`));
    }

    changed(room) {  // record that the room should be saved on the next save
        this._changedRooms.push(room);
    }

    hasChanged(room) {
        let iter;
        for (var i = this._changedRooms.length; i--;) {
            iter = this._changedRooms[i];
            if (room.name === iter.name && room.originTime === iter.originTime) {
                this._logger.trace(`${room.name} has changed!`);
                return true;
            }
        }
        return false;
    }

    recordLogin() {
        this.lastLoginAt = Date.now();
        this.save();
    }

    getNewName(name, takenNames) {
        var nameExists = {},
            i = 2,
            basename;

        takenNames = takenNames || [];
        takenNames.forEach(name => nameExists[name] = true);
        this.rooms.forEach(room => nameExists[room.name] = true);

        name = name || 'untitled';
        basename = name;
        while (nameExists[name]) {
            name = `${basename} (${i++})`;
        }

        return name;
    }

    _emailTmpPassword(password) {
        mailer.sendMail({
            from: 'no-reply@netsblox.com',
            to: this.email,
            subject: 'Temporary Password',
            markdown: 'Hello '+this.username+',\nYour NetsBlox password has been '+
                'temporarily set to '+password+'. Please change it after '+
                'logging in.'
        });
    }
}

var IGNORE_KEYS = ['rooms', '_changedRooms', '_roomHashes'];
User.prototype.IGNORE_KEYS = DataWrapper.prototype.IGNORE_KEYS.concat(IGNORE_KEYS);
module.exports = UserStore;
