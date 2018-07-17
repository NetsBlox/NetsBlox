(function(GroupStore) {
    var logger, collection;
    const Data = require('./data');

    class Group extends Data {

        constructor(data) {
            super(collection, data);
            this._logger = logger.fork(data.name);
        }

        // returns the group owner
        getOwner() {
            return this.owner;
        }

        save() {
            return this._db.updateOne(this._query(), { $set: {name: this.name, owner: this.owner} })
                .then(() => this);
        }

        // TODO lookup the members from the users collections
        findMember() {
        }

        create() {
            return this._db.insertOne({
                name: this.name,
                owner: this.owner,
            }).then(res => {
                this._id = res.insertedId;
                return this;
            });
        }

        // generates a query that finds this entity in the db
        _query() {
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
        if (curGroup) throw new Error('group exists');
        let group = new Group({
            name: name,
            owner: owner,
        });
        return group.create();
    };

    GroupStore.findOne = function(name, owner) {
        logger.trace(`getting ${owner}/${name}`);
        return collection.findOne({name, owner})
            .then(data => {
                if (data) {
                    return new Group(data);
                }
                return null;
            });
    };

    GroupStore.get = function(id) {
        logger.trace(`getting ${id}`);
        return collection.findOne({_id: id})
            .then(data => {
                if (data) {
                    return new Group(data);
                }
                throw new Error('group not found');
            });
    };

    GroupStore.remove = function(id) {
        logger.info(`removing ${id}`);
        return collection.deleteOne({_id: id});
    };

    GroupStore.all = function(owner) {
        return collection.find({owner}).toArray();
    };

})(exports);
