(function(UserStorage) {

    const Q = require('q');
    var randomString = require('just.randomstring'),
        hash = require('../../common/sha512').hex_sha512,
        DataWrapper = require('./data'),
        Projects = require('./projects'),
        mailer = require('../mailer');

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

        getProject(name) {
            this._logger.trace(`Getting project ${name} for ${this.username}`);
            return Projects.getProject(this.username, name)
                .catch(err => {
                    this._logger.error(`Could not load project ${name}: ${err}`);
                    throw err;
                });
        }

        getSharedProject(owner, name) {
            this._logger.trace(`getting shared project ${owner}/${name} for ${this.username}`);
            return Projects.getSharedProject(owner, name, this.username);
        }

        getProjects() {
            return Projects.getUserProjects(this.username);
        }

        getRawProjects() {
            return Projects.getRawUserProjects(this.username);
        }

        getAllRawProjects() {
            return Projects.getAllRawUserProjects(this.username);
        }

        getRawSharedProjects() {
            return Projects.getRawSharedProjects(this.username);
        }

        getSharedProjects() {
            return Projects.getSharedProjects(this.username);
        }

        getProjectNames() {
            return this.getAllRawProjects()
                .then(projects => projects.map(project => project.name));
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

            return this.getProjectNames()
                .then(names => {
                    names.forEach(name => nameExists[name] = true);
                    name = name || 'untitled';
                    basename = name;
                    while (nameExists[name]) {
                        name = `${basename} (${i++})`;
                    }

                    return name;
                });
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

    UserStorage.init = function (logger, db) {
        this._logger = logger.fork('users');
        this._users = db.collection('users');
    };

    UserStorage.get = function (username) {
        // Retrieve the user
        return this._users.findOne({username})
            .then(data => {
                let user = null;
                if (data) {
                    user = new User(this._logger, this._users, data);
                }
                return user;
            })
            .catch(err => {
                this._logger.error(`Error when retrieving user: ${err}`);
                throw err;
            });
    };

    UserStorage.names = function () {
        return this._users.find().toArray()
            .then(users => users.map(user => user.username))
            .catch(e => this._logger.error('Could not get the user names!', e));
    };

    UserStorage.forEach = function (fn) {
        const deferred = Q.defer();
        const stream = this._users.find().stream();

        stream.on('data', function(user) {
            fn(user);
        });

        stream.on('end', function() {
            return deferred.resolve();
        });

        return deferred.promise;
    };

    UserStorage.new = function (username, email) {
        var createdAt = Date.now();

        return new User(this._logger, this._users, {
            username,
            email,
            createdAt
        });
    };

})(exports);
