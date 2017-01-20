'use strict';

var randomString = require('just.randomstring'),
    hash = require('../../common/sha512').hex_sha512,
    DataWrapper = require('./Data'),
    mailer = require('../mailer');

class UserStore {
    constructor (logger, db) {
        this._logger = logger.fork('Users');
        this._users = db.collection('users');
    }

    get (username, callback) {
        // Retrieve the user
        this._users.findOne({username}, (e, data) => {
            callback(e, data ? new User(this._logger, this._users, data) : null);
        });
    }

    names () {
        return this._users.find().toArray()
            .then(users => users.map(user => user.username))
            .catch(e => this._logger.error('Could not get the user names!', e));
    }

    new(username, email) {
        return new User(this._logger, this._users, {username, email});
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
module.exports = UserStore;
