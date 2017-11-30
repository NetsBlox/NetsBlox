(function(GroupStore) {
    var logger, collection;
    const Data = require('./data');

    class Group extends Data {

        constructor(data) {
            super(collection, data);
            this._logger = logger.fork(data.name);
        }

        addMember (user) {
            const op = {$push: {members: user.username}};
            const query = this.getStorageId();
            query.members = {$not: new RegExp('^' + user.username + '$')};
            return this._db.update(query, op)
                .then(() => user.setGroupId(this.name));
        }

        // returns the group owner
        getOwner() {
            return this.owner;
        }

        removeMember (user) {
            const op = {$pull: {members: user.username}};
            return this._db.update(this.getStorageId(), op)
                .then(() => user.setGroupId(null));
        }

        getMembers () {
            return this._db.findOne(this.getStorageId())
                .then(data => {
                    if (data) return data.members || [];
                    return [];
                });
        }

        create () {
            return this._db.save({
                name: this.name,
                owner: this.owner,
                members: []
            });
        }

        getStorageId () {
            return {name: this.name};
        }
    }

    GroupStore.init = function(_logger, db) {
        logger = _logger.fork('groups');
        collection = db.collection('groups');
    };

    // in: groupName and owner's username
    GroupStore.new = function(name, ownerName) {
        logger.trace(`creating new group: ${name}`);
        // TODO ensure unique groupname
        let group = new Group({
            name: name,
            owner: ownerName,
            members: []
        });
        return group.create();
    };

    GroupStore.findOne = function(name) {
        logger.trace(`getting ${name}`);
        return collection.findOne({name})
            .then(data => {
                if (data) {
                    return new Group(data);
                }
                return null;
            });
    };

    GroupStore.get = function(name) {
        logger.trace(`getting ${name}`);
        return collection.findOne({name})
            .then(data => {
                if (data) {
                    return new Group(data);
                }
                throw new Error('group not found');
            });
    };

    GroupStore.remove = function(name) {
        logger.info(`removing ${name}`);
        return collection.deleteOne({name});
    };

    GroupStore.all = function() {
        return collection.find({}).toArray();
    };

})(exports);
