describe('users', function() {
    const utils = require('../../../assets/utils');
    const assert = require('assert');
    const Users = utils.reqSrc('storage/users');
    const Q = require('q');

    before(function(done) {
        utils.reset().then(() => done());
    });

    describe('getGroupMembers', function() {
        let users = null;

        before(function(done) {
            const groups = [undefined, 'class1', 'class2'];
            // Create three users in each group
            users = groups.map(groupId =>  // make three users for each
                ['alice', 'bob', 'eve']
                    .map(name => groupId ? `${name}-${groupId}` : name)
                    .map(name => Users.new(name, name + '@null.com'))
            ).reduce((l1, l2) => l1.concat(l2));

            users.map(user => user.hash = 123);

            return Q.all(users.map(user => user.save().then(() => {
                let groupId = undefined;
                if (user.username.includes('-')) {
                    let index = user.username.indexOf('-');
                    groupId = user.username.substring(index + 1);
                }
                return user.setGroupId(groupId);
            })))
                .nodeify(done);
        });

        it('should not include users in groups from outside', function(done) {
            let alice = users[0];
            alice.getGroupMembers()
                .then(users => {
                    let names = users.map(u => u.username);
                    assert(!names.some(name => name.includes('-class')));
                    done();
                })
                .catch(done);
        });

        it('should only show users in groups', function(done) {
            let user = users[5];
            user.getGroupMembers()
                .then(users => {
                    let names = users.map(u => u.username);
                    assert.equal(names.length, 3);
                    done();
                })
                .catch(done);
        });
    });

    describe('setPassword', function() {
        it('should update user password in memory', function(done) {
            let firstHash = null;
            Users.get('brian')
                .then(user => {
                    firstHash = user.hash;
                    return user.setPassword('someNewPasswordForMemoryTest')
                        .then(() => assert.notEqual(firstHash, user.hash));
                })
                .nodeify(done);
        });

        it('should update user password in database', function(done) {
            let firstHash = null;
            Users.get('brian')
                .then(user => {
                    firstHash = user.hash;
                    return user.setPassword('someNewPasswordForDBTest');
                })
                .then(() => Users.get('brian'))
                .then(user => assert.notEqual(firstHash, user.hash))
                .nodeify(done);
        });
    });

    it('should fail to update users username', async () => {
        const newUsername = 'hamidz',
            oldUsername = 'hamid';

        let user = await Users.get(oldUsername);
        user.username = newUsername;
        await user.update();
        let updatedUser = await Users.getById(user._id);
        assert.deepEqual(updatedUser.username, oldUsername);

    });

    it('should update users email', async () => {
        const newEmail = 'newBrianEmail@email.com';

        let user = await Users.get('hamid');
        user.email = newEmail;
        await user.update();
        let updatedUser = await Users.getById(user._id);
        assert.deepEqual(updatedUser.email, newEmail);

    });
});
