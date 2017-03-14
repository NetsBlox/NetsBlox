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
                roles = Object.keys(room.roles).map(name => room.roles[name]),
                srcContent,
                media;

            srcContent = roles.map(role => blob.get(role.SourceCode));
            media = roles.map(role => blob.get(role.Media));

            return Q.all(srcContent)
                .then(content => {
                    for (let i = roles.length; i--;) {
                        room.roles[roles[i].ProjectName].SourceCode = content[i];
                    }
                    return Q.all(media);
                })
                .then(content => {
                    for (let i = roles.length; i--;) {
                        room.roles[roles[i].ProjectName].Media = content[i];
                    }
                    return room;
                });
        }))
        .then(projects => this.projects = projects);
    }

    saveProjects () {  // save the rooms to the blob and update the 'projects'
        return Q.all(this.rooms.map(room => {
            let project = _.cloneDeep(room),
                roles = Object.keys(room.roles).map(name => room.roles[name]),
                srcIds,
                mediaIds;

            srcIds = roles.map(role => blob.store(role.SourceCode));
            mediaIds = roles.map(role => blob.store(role.Media));

            return Q.all(srcIds)
                .then(ids => {
                    for (let i = roles.length; i--;) {
                        project.roles[roles[i].ProjectName].SourceCode = ids[i];
                    }
                    return Q.all(mediaIds);
                })
                .then(ids => {
                    for (let i = roles.length; i--;) {
                        project.roles[roles[i].ProjectName].Media = ids[i];
                    }
                    return project;
                });
        }))
        .then(projects => this.projects = projects);
    }

    recordLogin() {
        this.lastLoginAt = Date.now();
        this.save();
    }

    getNewName(name) {
        var nameExists = {},
            i = 2,
            basename;

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

User.prototype.IGNORE_KEYS = Data.prototype.IGNORE_KEYS.concat(['rooms']);
module.exports = UserStore;
