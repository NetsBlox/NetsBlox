describe.only('groups', function() {
    const utils = require('../../../assets/utils');
    const assert = require('assert');
    const Groups = utils.reqSrc('storage/groups');
    const Users = utils.reqSrc('storage/users');
    const Q = require('q');

    const owner = 'testUsername';

    beforeEach(function(done) {
        utils.reset().then(() => done()).catch(done);
    });

    it('should create group', async function() {
        const name = 'my-test-group';
        let group = await Groups.new(name, owner);
        let doc = await Groups.findOne(name, owner);
        assert(doc);
        assert.equal(doc.name, name);
    });

    it('get should work with mongodb ObjectId input', async function() {
        const name = 'my-aaf-group';
        let group = await Groups.new(name, owner);
        let doc = await Groups.get(group.getId());
        assert(doc);
        assert.equal(doc.name, name);
    });

    it('get should work with string id', async function() {
        const name = 'my-aaf-group';
        let group = await Groups.new(name, owner);
        let id = group.getId().toString();
        let doc = await Groups.get(id);
        assert(doc);
        assert.equal(doc.name, name);
    });

    it('should remove group', async function() {
        const name = 'my-old-group';
        let id;
        let group = await Groups.new(name, owner)
        await Groups.remove(group._id);
        try {
            await Groups.get(group._id);
            throw new Error('did no remove the group');
        } catch (e) {
            assert(e.message.includes('not found'), 'get didnt throw properly');
        }
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
        const id = '5b50e4104be2cd3f493b1af1'; // non existing id
        Groups.get(id)
            .catch(err => {
                assert(err.message.includes('not found'));
                done();
            });
    });


    it('findOne should return null when finding non-existing groups', async function() {
        const name = 'non-existing-name';
        let group = await Groups.findOne(name, owner);
        assert(!group);
    });


    it('should not allow duplicate groups', async function() {
        const name = 'gpname';
        await Groups.new(name, owner);
        try {
            await Groups.new(name, owner);
        } catch (e) {
            assert(e.message.includes('exists'));
        }
    });


    it('should find all groups', async function() {
        const gps = ['gpname', 'gp2'];
        await Groups.new(gps[0], owner);
        await Groups.new(gps[1], owner);
        let groups = await Groups.all(owner);
        assert.deepEqual(gps.length, groups.length);
        gps.forEach(gpName => {
            assert(groups.find(group => group.name = gpName));
        })
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
