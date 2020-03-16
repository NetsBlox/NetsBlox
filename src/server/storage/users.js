(function(UserStorage) {

    const Q = require('q'),
        ObjectId = require('mongodb').ObjectId;
    const Groups = require('./groups');
    var randomString = require('just.randomstring'),
        hash = require('../../common/sha512').hex_sha512,
        DataWrapper = require('./data'),
        Projects = require('./projects'),
        mailer = require('../mailer'),
        collection;

    class User extends DataWrapper {

        constructor(logger, data) {
            super(collection, data);
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

        // updates based on mongoid vs username
        update() {
            return this._db.updateOne({_id: this._id}, { $set: {email: this.email} })
                .then(() => this);
        }

        setPassword(password) {
            // Set the password field...
            const newHash = hash(password);
            const query = {$set: {hash: newHash}};

            this.hash = newHash;
            return this._db.update(this.getStorageId(), query);
        }

        getProject(name) {
            this._logger.trace(`Getting project ${name} for ${this.username}`);
            return Projects.getProject(this.username, name)
                .catch(err => {
                    this._logger.error(`Could not load project ${name}: ${err}`);
                    throw err;
                });
        }

        getGroup() {
            if (this.groupId) {
                return Groups.get(this.groupId);
            }
            return Q(null);
        }

        setGroupId(groupId) {
            this._logger.trace(`setting groupId of ${this.username} to ${groupId}`);
            const query = {$set: {groupId: groupId}};
            this.groupId = groupId;
            return this._db.update(this.getStorageId(), query);
        }

        getStorageId() {
            return {username: this.username};
        }

        getGroupMembers() {
            this._logger.trace(`getting group members of ${this.groupId}`);
            return collection.find({groupId: this.groupId}, {username: 1}).toArray()
                .then(users => users.map(user => new User(this._logger, user)));
        }

        getSharedProject(owner, name) {
            this._logger.trace(`getting shared project ${owner}/${name} for ${this.username}`);
            return Projects.getSharedProject(owner, name, this.username);
        }

        getProjects() {
            return Projects.getUserProjects(this.username);
        }

        getProjectMetadatas() {
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
            this.save({silent: true});
        }

        getNewNameFor(name, projectId) {
            var nameExists = {},
                i = 2,
                basename;

            return this.getAllRawProjects()
                .then(projects => {
                    projects.forEach(project => {
                        const id = project._id.toString();
                        if (id !== projectId) {
                            nameExists[project.name] = id;
                        }
                    });
                    basename = basename || 'untitled';
                    name = basename;
                    while (nameExists[name]) {
                        name = `${basename} (${i++})`;
                    }

                    return name;
                });
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

        async isNewWithRejections() {
            let rejections = [];

            // condition #1: must have no saved or transient project
            let projects = await this.getAllRawProjects();
            if (projects.length !== 0) rejections.push('user has projects');

            // condition #2: account age
            const AGE_LIMIT_MINUTES = 60 * 24 * 1; // a week
            let age = (new Date().getTime() - this.createdAt) / 60000 ; // in minutes
            if (age > AGE_LIMIT_MINUTES) rejections.push(`this account has been created more than ${AGE_LIMIT_MINUTES} minutes ago`);

            return rejections;
        }

        // is it safe to allow deletion of this user?
        async isNew() {
            let objections = await this.isNewWithRejections();
            return objections === 0;
        }

        _emailTmpPassword(password) {
            mailer.sendMail({
                to: this.email,
                subject: 'Temporary Password',
                html: '<p>Hello '+this.username+',<br/><br/>Your NetsBlox password has been '+
                    'temporarily set to '+password+'. Please change it after '+
                    'logging in.</p>'
            });
        }
    }

    UserStorage.init = function (logger, db) {
        this._logger = logger.fork('users');
        collection = db.collection('users');
    };

    // it does not throw if the user is not found
    UserStorage.get = function (username) {
        // Retrieve the user
        return Q(collection.findOne({username}))
            .then(data => {
                let user = null;
                if (data) {
                    user = new User(this._logger, data);
                } else {
                    this._logger.warn('Invalid username when get users from storage');
                }
                return user;
            })
            .catch(err => {
                this._logger.error(`Error when retrieving user: ${err}`);
                throw err;
            });
    };

    UserStorage.getById = function(id) {
        this._logger.trace(`getting ${id}`);
        if (typeof id === 'string') id = ObjectId(id);
        return Q(collection.findOne({_id: id}))
            .then(data => {
                return new User(this._logger, data);
            })
            .catch(err => {
                this._logger.error(`Error when getting user by id ${err}`);
                throw new Error(`group ${id} not found`);
            });

    };

    UserStorage.names = function () {
        return collection.find().toArray()
            .then(users => users.map(user => user.username))
            .catch(e => this._logger.error('Could not get the user names!', e));
    };

    UserStorage.findGroupMembers = function (groupId) {
        return collection.find({groupId: {$eq: groupId}}).toArray()
            .then(users => users.map(user => new User(this._logger, user)));
    };

    UserStorage.forEach = function (fn) {
        const deferred = Q.defer();
        const stream = collection.find().stream();

        stream.on('data', function(user) {
            fn(user);
        });

        stream.on('end', function() {
            return deferred.resolve();
        });

        return deferred.promise;
    };

    UserStorage.new = function (username, email, groupId, password) {
        groupId = groupId || null; // WARN what should be the default
        var createdAt = Date.now();

        let user = new User(this._logger, {
            username,
            email,
            createdAt,
            groupId,
        });
        if (password !== undefined) user.hash = hash(password);
        return user;
    };

})(exports);
