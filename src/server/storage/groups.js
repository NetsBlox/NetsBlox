(function(GroupStore) {
    var logger, collection;
    const Data = require('./data'),
        Q = require('q'),
        Users = require('./users'),
        ObjectId = require('mongodb').ObjectId;

    class Group extends Data {

        constructor(data) {
            super(collection, data);
            this._logger = logger.fork(data.name);
        }

        // returns the group owner
        getOwner() {
            return this.owner;
        }

        async findMembers() {
            return Users.findGroupMembers(this._id.toString());
        }

        data() {
            return {
                name: this.name,
                _id: this._id
            };
        }

        update() {
            return this._db.updateOne({_id: this._id}, { $set: {name: this.name} })
                .then(() => this);
        }

        save() {
            return this._db.save({
                name: this.name,
                owner: this.owner,
            })
                .then(result => {
                    const id = result.ops[0]._id;
                    this._id = id;
                })
                .then(() => this);
        }

        // generates a query that finds this entity in the db
        getStorageId() {
            return {_id: this._id};
        }

        getId() {
            return this._id;
        }

        // is new or is safe to delete
        async isNew() {
            let checks = []; // stores failed checks

            // #1
            let members = await this.findMembers();
            if (members.length > 0) checks.push('it has members');

            // #2
            let age = (new Date().getTime() - this.createdAt) / 60000 ; // compute age in minutes
            const AGE_LIMIT_MINUTES = 60 * 24; // a day
            if (age > AGE_LIMIT_MINUTES) checks.push('it was created a while ago');

            if (checks.length > 0) logger.warn(`group is not new: ${checks.join('& ')}`);
            return checks.length === 0;
        }
    }

    GroupStore.init = function(_logger, db) {
        logger = _logger.fork('groups');
        collection = db.collection('groups');
    };

    // in: groupName and owner's username
    GroupStore.new = async function(name, owner) {
        logger.trace(`creating new group: ${owner}/${name}`);
        let curGroup = await this.findOne(name, owner);
        logger.error(`group ${owner}/${name} exists`);
        if (curGroup) throw new Error('Group already exists.');
        var createdAt = Date.now();
        let group = new Group({
            name: name,
            createdAt,
            owner: owner,
        });
        return group.save();
    };

    GroupStore.findOne = function(name, owner) {
        logger.trace(`finding group ${owner}/${name}`);
        return Q(collection.findOne({name, owner}))
            .then(data => {
                return new Group(data);
            })
            .catch(() => {
                return null;
            });
    };

    GroupStore.get = async function(id) {
        logger.trace(`getting group ${id}`);
        if (typeof id === 'string') id = ObjectId(id);
        let data = await Q(collection.findOne({_id: id}));
        if (data) {
            return new Group(data);
        } else {
            throw new Error(`group ${id} not found`);
        }
    };

    GroupStore.remove = function(id) {
        logger.info(`removing group ${id}`);
        return Q(collection.deleteOne({_id: id}));
    };

    // find all groups belonging to a user
    GroupStore.findAllUserGroups = async function(owner) {
        let groupsArr = await Q(collection.find({owner}).toArray());
        return groupsArr.map(group => new Group(group));
    };

    GroupStore.all = async function() {
        let groupsArr = await Q(collection.find({}).toArray());
        return groupsArr.map(group => new Group(group));
    };

})(exports);
