'use strict';

var randomString = require('just.randomstring'),
    hash = require('../../common/sha512').hex_sha512,
    generate = require('project-name-generator'),
    ObjectId = require('mongodb').ObjectId,
    DataWrapper = require('./Data'),
    MAILER;

class UserStore {
    constructor (logger, db, mailer) {
        this._logger = logger.fork('Users');
        this._users = db.collection('users');
        MAILER = mailer;
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
            .catch(e => this._logger.error('Could not get the user names!'));
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
        var nameExists = {};
        this.rooms.forEach(room => nameExists[room.name] = true);

        if (name) {
            var i = 2,
                basename = name;

            do {
                name = `${basename} (${i++})`;
            } while (nameExists[name]);

        } else {
            // Create base name
            do {
                name = generate().spaced;
            } while (nameExists[name]);
        }
        return name;
    }

    _emailTmpPassword(password) {
        MAILER.sendMail({
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
