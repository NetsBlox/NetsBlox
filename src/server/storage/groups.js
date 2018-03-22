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
                members: []
            }).then(() => this);
        }

        getStorageId () {
            return {name: this.name};
        }
    }

    GroupStore.init = function(_logger, db) {
        logger = _logger.fork('groups');
        collection = db.collection('groups');
    };

    GroupStore.new = function(name) {
        logger.trace(`creating new group: ${name}`);
        let group = new Group({
            name: name,
            members: []
        });
        return group.create();
    };

    GroupStore.get = function(name) {
        logger.trace(`getting ${name}`);
        return collection.findOne({name})
            .then(data => {
                if (data) {
                    return new Group(data);
                }
                return null;
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
