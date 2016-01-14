'use strict';

var randomString = require('just.randomstring'),
    hash = require('../../client/sha512').hex_sha512,
    ObjectId = require('mongodb').ObjectId,
    DataWrapper = require('./Data'),
    MAILER;

class UserStore {
    constructor (logger, db, mailer) {
        this._logger = logger.fork('Tables');
        this._users = db.collection('users');
        MAILER = mailer;
    }

    get (username, callback) {
        // Retrieve the user
        this._users.findOne({username}, (e, data) => {
            callback(e, data ? new User(this._users, data) : null);
        });
    }

    new(username, email) {
        return new User(this._users, {username, email});
    }
}

class User extends DataWrapper {

    constructor(db, data) {
        super(db, data);
    }

    prepare() {
        // If no password, assign tmp
        if (!this.hash) {
            let password = randomString(8);
            this._emailTmpPassword(password);
            this.hash = hash(password);
        }
        this.tables = this.tables || [];
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
