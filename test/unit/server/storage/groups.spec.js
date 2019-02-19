describe('groups', function() {
    const utils = require('../../../assets/utils');
    const assert = require('assert');
    const Groups = utils.reqSrc('storage/groups');
    const Users = utils.reqSrc('storage/users');
    const Q = require('q');

    before(function(done) {
        utils.reset().then(() => done());
    });

    it('should create group', function(done) {
        const name = 'my-test-group';
        Groups.new(name)
            .then(() => Groups.get(name))
            .then(found => {
                assert(found);
                done();
            })
            .catch(done);
    });

    it('should remove group', function(done) {
        const name = 'my-old-group';
        Groups.new(name)
            .then(() => Groups.remove(name))
            .then(() => Groups.get(name))
            .then(found => {
                assert(!found);
                done();
            })
            .catch(done);
    });

    describe('group', function() {
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
                .then(() => Groups.new(name))
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
