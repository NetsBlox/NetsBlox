'use strict';

var randomString = require('just.randomstring'),
    hash = require('../../common/sha512').hex_sha512,
    DataWrapper = require('./data'),
    blob = require('./blob-storage'),
    Q = require('q'),
    Projects = require('./projects'),
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
            // retrieve the role info from the blob storage and
            let user = null;
            if (data) {
                user = new User(this._logger, this._users, data);
            }
            callback(e, user);
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
    }

    cleanProject (project) {
        let allRoleNames = Object.keys(project.roles),
            removed = [],
            name;

        for (let i = allRoleNames.length; i--;) {
            name = allRoleNames[i];
            if (!project.roles[name]) {
                removed.push(name);
                delete project.roles[name];
            }
        }

        if (removed.length) {
            this._logger.warn(`Found ${removed.length} null roles in ${project.uuid}. Removing...`);
        }

        return project;
    }

    getProjects() {
        return Projects.getUserProjects(this.username);
    }

    getProjectNames() {
        return this.getProjects()
            .then(projects => projects.map(project.name));
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
        this.getProjectNames().forEach(name => nameExists[name] = true);

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

module.exports = UserStore;
