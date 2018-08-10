(function(GroupStore) {
    var logger, collection;
    const Data = require('./data'),
        Q = require('q'),
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

        // TODO lookup the members from the users collections
        findMember() {
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
        let group = new Group({
            name: name,
            owner: owner,
        });
        return group.save();
    };

    GroupStore.findOne = function(name, owner) {
        logger.trace(`getting ${owner}/${name}`);
        return Q(collection.findOne({name, owner}))
            .then(data => {
                return new Group(data);
            })
            .catch(() => {
                return null;
            });
    };

    GroupStore.get = function(id) {
        logger.trace(`getting ${id}`);
        if (typeof id === 'string') id = ObjectId(id);
        return Q(collection.findOne({_id: id}))
            .then(data => {
                return new Group(data);
            })
            .catch(err => {
                logger.error(err);
                throw new Error(`group ${id} not found`);
            });

    };

    GroupStore.remove = function(id) {
        logger.info(`removing ${id}`);
        return Q(collection.deleteOne({_id: id}));
    };

    GroupStore.all = async function(owner) {
        let groupsArr = await Q(collection.find({owner}).toArray());
        return groupsArr.map(group => new Group(group));
    };

})(exports);
