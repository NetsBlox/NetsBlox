describe('groups', function() {
    const utils = require('../../../assets/utils');
    const assert = require('assert');
    const Groups = utils.reqSrc('storage/groups');
    const Users = utils.reqSrc('storage/users');
    const Q = require('q');

    const owner = 'username';

    beforeEach(function(done) {
        utils.reset().then(() => done());
    });

    it('should create group', function(done) {
        const name = 'my-test-group';
        Groups.new(name, owner)
            .then(group => Groups.get(group._id))
            .then(doc => {
                assert(doc);
                assert.equal(doc.name, name);
                done();
            })
            .catch(done);
    });

    it('should remove group', function(done) {
        const name = 'my-old-group';
        let id;
        Groups.new(name, owner)
            .then(group => {
                id = group._id;
                return Groups.remove(group._id);
            })
            .then(() => Groups.get(id))
            .catch(err => {
                assert.deepEqual(err.message, 'group not found');
                done();
            });
    });

    it('should update', function(done) {
        const name = 'to-update',
            newName = 'new-name';
        Groups.new(name, owner)
            .then(grp => {
                grp.name = newName;
                return grp.save();
            })
            .then(grp => {
                assert.equal(grp.name, newName);
                return Groups.get(grp._id);
            })
            .then(grp => {
                assert.deepEqual(grp.name, newName);
                done();
            })
            .catch(done);
    });

    it('get should throw when finding non-existing groups', function(done) {
        const id = 'non-existing-id';
        Groups.get(id)
            .catch(err => {
                assert(err.message === 'group not found');
                done();
            });
    });


    it('findOne should return null when finding non-existing groups', function(done) {
        const name = 'non-existing-name';
        Groups.findOne(name, owner)
            .then(found => {
                assert(!found);
                done();
            });
    });

    describe.skip('group members', function() {
        let group = null;
        let user = null;
        let user2 = null;
        const name = 'member-tests-' + Date.now();

        before(function(done) {
            user = Users.new('user1', 'bla@gmail.com');
            user2 = Users.new('user2', 'bla2@gmail.com');
            user.hash = 123;
            user2.hash = 123;

            Q.all([user, user2].map(item => item.save()))
                .then(() => Groups.new(name, owner))
                .then(g => group = g)
                .then(() => done())
                .catch(done);
        });

        it('should add members', function(done) {
            group.addMember(user)
                .then(() => group.getMembers())
                .then(members => {
                    assert(members.includes(user.username));
                    done();
                })
                .catch(done);
        });

        it('should not add member twice', function(done) {
            group.addMember(user)
                .then(() => group.addMember(user))
                .then(() => group.getMembers())
                .then(members => {
                    assert.equal(members.length, 1);
                    done();
                })
                .catch(done);
        });

        it('should remove members', function(done) {
            group.addMember(user)
                .then(() => group.addMember(user2))
                .then(() => group.removeMember(user))
                .then(() => group.getMembers())
                .then(members => {
                    assert(!members.includes(user.username));
                    assert.equal(members.length, 1);
                    done();
                })
                .catch(done);
        });
    });
});
