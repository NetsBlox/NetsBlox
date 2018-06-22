describe('active-room', function() {
    var ROOT_DIR = '../../../../',
        _ = require('lodash'),
        utils = require(ROOT_DIR + 'test/assets/utils'),
        RoomManager = utils.reqSrc('rooms/room-manager'),
        ActiveRoom = utils.reqSrc('rooms/active-room'),
        Constants = utils.reqSrc('../common/constants'),
        assert = require('assert'),
        Logger = utils.reqSrc('logger'),
        logger = new Logger('active-room'),
        owner = {
            username: 'test',
            _messages: [],
            send: msg => owner._messages.push(msg)
        },
        room;

    const Users = utils.reqSrc('storage/users');
    const Projects = utils.reqSrc('storage/projects');

    before(function(done) {
        RoomManager.init(new Logger('active-room-test'), {}, ActiveRoom);
        utils.reset().then(() => done()).catch(done);
    });

    describe('sendToEveryone', function() {
        var socket = {getPublicId: () => 'test@myRole@sendToEveryoneTest'},
            msg;

        beforeEach(function() {
            room = new ActiveRoom(logger, 'sendToEveryoneTest', owner);
            room.sockets = () => [socket];
            msg = {
                type: 'message',
                msgType: 'message',
                dstId: 'test',
                content: {msg: 'test'}
            };
        });

        it('should set dstId if not set', function() {
            delete msg.dstId;
            socket.send = msg => {
                assert.equal(Constants.EVERYONE, msg.dstId);
            };
            room.sendToEveryone(msg);
        });

        it('should not set dstId if set', function() {
            var initialDst = msg.dstId;
            socket.send = msg => {
                assert.equal(initialDst, msg.dstId);
            };
            room.sendToEveryone(msg);
        });

        it('should call "send" on sockets w/ the msg', function(done) {
            socket.send = m => {
                assert.equal(m, msg);
                done();
            };
            room.sendToEveryone(msg);
        });
    });

    // Things to test:
    //   - add
    //   - getUnoccupiedRole
    it('should return the unoccupied role', function(done) {
        utils.createRoom({
            name: 'test-room',
            owner: 'brian',
            roles: {
                p1: ['brian', 'cassie'],
                p2: ['todd', null],
                third: null
            }
        }).then(room => {
            let name = room.getUnoccupiedRole();
            assert.equal(name, 'third');
            done();
        });
    });

    describe('close', function() {
        it('should send "project-closed" message to all sockets', function(done) {
            utils.createRoom({
                name: 'test-room',
                owner: 'brian',
                roles: {
                    p1: ['brian', 'cassie'],
                    p2: ['todd', null],
                    third: null
                }
            }).then(room => {
                const sockets = room.sockets();
                room.close();

                sockets.map(s => s._socket)
                    .forEach(socket => {
                        const msg = socket.message(-1);
                        assert.equal(msg.type, 'project-closed');
                    });
                done();
            });
        });
    });

    describe('get sockets at role', function() {
        let room = null;

        before(function(done) {
            utils.createRoom({
                name: 'move-test',
                owner: 'first',
                roles: {
                    role1: ['first'],
                    role2: [],
                }
            }).then(_room => {
                room = _room;
                done();
            });
        });

        it('should return the sockets for a given role', function() {
            const sockets = room.getSocketsAt('role1');
            assert.equal(sockets.length, 1);
            assert.equal(sockets[0].username, 'first');
        });

        it('should return empty array if no sockets', function() {
            const sockets = room.getSocketsAt('role2');
            assert.equal(sockets.length, 0);
        });
    });

    describe('changing roles', function() {
        let room = null;
        let s1 = null;

        before(function(done) {
            utils.createRoom({
                name: 'move-test',
                owner: 'first',
                roles: {
                    role1: ['first'],
                    role2: [],
                }
            }).then(_room => {
                room = _room;
                s1 = room.getSocketsAt('role1')[0];
                return room.add(s1, 'role2');
            })
            .nodeify(done);
        });

        it('should send update message on changing roles', function() {
            const msg = s1._socket.message(-1);
            assert.equal(msg.type, 'room-roles');

            const roles = Object.values(msg.roles);
            const role2 = roles.find(role => role.name === 'role2');
            assert.equal(role2.occupants[0].username, 'first');
        });

        it('should remove the socket from the original role', function() {
            assert.equal(room.getSocketsAt('role1').length, 0);
        });

        it('should add the socket to new role', function() {
            assert.equal(room.getSocketsAt('role2')[0], s1);
        });
    });

    describe('add', function() {
        let room, s1, s2;

        before(function(done) {
            const config = {
                name: 'add-test',
                owner: 'owner',
                roles: {
                    role1: [],
                    role2: [],
                    role3: ['owner'],
                }
            };
            return utils.createRoom(config)
                .then(result => {
                    room = result;
                    s1 = utils.createSocket('role1');
                    return room.add(s1, 'role1');
                })
                .then(() => {
                    s2 = utils.createSocket('role2');
                    return room.add(s2, 'role2');
                })
                .nodeify(done);
        });

        it('should update the role name', function() {
            assert.equal(s1.role, 'role1');
            assert.equal('role2', s2.role);
        });

        it('should send update messages to each socket', function() {
            assert(s1._socket.messages().find(msg => msg.type === 'room-roles'));
            assert(s2._socket.messages().find(msg => msg.type === 'room-roles'));
        });

        it('should send same updated room to each socket', function() {
            assert(_.isEqual(s1._socket.message(-1), s2._socket.message(-1)));
        });

        it('should send updated room', function() {
            var expected = {
                role1: [s1.username],
                role2: [s2.username]
            };
            const stateMsg = s1._socket.message(-1);
            const roles = Object.values(stateMsg.roles);
            const role1 = roles.find(role => role.name === 'role1');
            const role2 = roles.find(role => role.name === 'role2');

            // We only care about the usernames
            assert.deepEqual(
                role1.occupants.map(info => info.username),
                expected.role1
            );
            assert.deepEqual(
                role2.occupants.map(info => info.username),
                expected.role2
            );
        });
    });

    describe('join role', function() {
        var alice, bob;

        before(function(done) {
            utils.createRoom({
                name: 'add-test',
                owner: 'alice',
                collaborators: ['alice', 'bob'],
                roles: {
                    role1: ['alice'],
                    role2: ['bob'],
                }
            }).then(room => {
                alice = room.getSocketsAt('role1')[0];
                bob = room.getSocketsAt('role2')[0];

                return room.add(alice, 'role2');
            }).nodeify(done);
        });

        it('should both receive update messages', function() {
            assert(alice._socket.message(-1));
            assert(_.isEqual(alice._socket.message(-1), bob._socket.message(-1)));
        });

        it('should send correct update message', function() {
            const msg = alice._socket.message(-1);
            const role2 = Object.values(msg.roles).find(role => role.name === 'role2');
            const usersAtRole2 = role2.occupants.map(info => info.username);
            assert(_.isEqual(usersAtRole2, ['bob', 'alice']));
        });

    });

    describe('editable', function() {
        let room = null;
        before(function(done) {
            utils.createRoom({
                name: 'add-test',
                owner: 'alice',
                collaborators: ['bob'],
                roles: {
                    role1: ['alice'],
                    role2: ['bob', 'eve'],
                }
            }).then(r => {
                room = r;
                done();
            });
        });

        it('should be editable to owner', function() {
            assert(room.isEditableFor('alice'));
        });

        it('should be editable to collaborators', function() {
            room.getCollaborators = () => ['bob'];
            assert(room.isEditableFor('bob'));
        });

        it('should be not be editable to guests', function() {
            assert(!room.isEditableFor('eve'));
        });

    });
    
    let defaultConfig = {
        name: 'test',
        owner: 'alice',
        roles: {
            role1: ['alice'],
            role2: ['bob', 'eve']
        }
    };
    
    describe('without projects', function() {
        let room = null;
        let alice, bob;
        before(function(done) {
            utils.createRoom(defaultConfig)
                .then(_room => {
                    room = _room;
                    alice = room.getSocketsAt('role1')[0];
                    bob = room.getSocketsAt('role2')[0];
                    done();
                });
        });
        
        describe('remove', function() {
            it('should remove a socket', function() {
                room.remove(alice);
                assert.deepEqual(room.getSocketsAt('role1'), []);
            });
        
            it('should receive update messages', function() {
                room.remove(bob);
                assert(alice._socket.message(-1));
            });
        });
        
        describe('change name', function() {
            it('should change name of the room', function(done) {
                room.changeName('abc').then((name) => {
                    assert.equal(name, 'abc');
                    done();
                });
            });
        });
    
        describe('owner', function() { //TODO: set up user storage

        });
    });
    
    describe('with projects', function() {
        before(function(done) {
            utils.connect().then(() => done()).catch(() => done());
        });
    
        let project = null;
        let r = null;
        
        beforeEach(function(done) {
            utils.createRoom(defaultConfig).then(room => {
                project = room.getProject();
                r = room;
                done();
            }).catch(() => done());
        });
    
        afterEach(function(done) {
            project.destroy()
                .then(() => done())
                .catch(done);
        });
        
        describe('collaborators', function() {
            it('should add one collaborator', function(done) {
                r.addCollaborator('bob').then(() => {
                    assert.equal(r.getCollaborators().length, 1);
                    done();
                }).catch(() => done());
            });
        
            it('should remove one collaborator', function(done) {
                r.addCollaborator('bob').then(() => {
                    r.removeCollaborator('bob').then(() => {
                        assert.equal(r.getCollaborators().length, 0);
                        done();
                    }).catch(() => done());
                }).catch(() => done());
            });
        
            it('should not remove collaborator if username is wrong', function(done) {
                r.addCollaborator('bob').then(() => {
                    r.removeCollaborator('wrong').then(() => {
                        assert.equal(r.getCollaborators().length, 1);
                        done();
                    });
                }).catch(() => done());
            });
        
        });
    
        describe('collaborators', function() {
            it('should add one collaborator', function(done) {
                r.addCollaborator('bob').then(() => {
                    assert.equal(r.getCollaborators().length, 1);
                    done();
                }).catch(() => done());
            });
        
            it('should remove one collaborator', function(done) {
                r.addCollaborator('bob').then(() => {
                    r.removeCollaborator('bob').then(() => {
                        assert.equal(r.getCollaborators().length, 0);
                        done();
                    }).catch(() => done());
                }).catch(() => done());
            });
        
            it('should remove no collaborator if username is wrong', function(done) {
                r.addCollaborator('bob').then(() => {
                    r.removeCollaborator('wrong').then(() => {
                        assert.equal(r.getCollaborators().length, 1);
                        done();
                    });
                }).catch(() => done());
            });
        
        });
        
        describe('roles', function() {
            it('should check whether has a role', function() {
                assert(r.hasRole('role1'));
                assert(!(r.hasRole('role3')));
            });
    
            it('should return right roles array', function() {
                assert.equal(r.getRoleNames().length, 2);
            });
    
            it('should return a role', function(done) {
                r.getRole('role1').then((data) => {
                    assert.equal(data.ProjectName, 'role1');
                    done();
                }).catch(() => done());
            });
            
            it('should create a role', function(done) {
                r.createRole('role3').then(() => {
                    assert.equal(r.getRoleNames().length, 3);
                    done();
                })
                    .catch(() => done());
            });
    
            it('should remove a role', function(done) {
                r.removeRole('role1').then(() => {
                    assert.equal(r.getRoleNames().length, 2);
                    done();
                })
                    .catch(() => done());
            });
    
            it('should rename a role', function(done) {
                r.renameRole('role1', 'roleNew').then(() => {
                    assert.equal(r.getRoleNames()[1], 'roleNew');
                    done();
                })
                    .catch(() => done());
            });
        });
    });
    
    describe('getProjectId', function() {
        it('should be able to get the project id', function(done) {
            utils.createRoom({
                name: 'test-room-id',
                owner: 'brian',
                roles: {
                    p1: ['brian', 'cassie'],
                    p2: ['todd', null],
                    third: null
                }
            }).then(room => {
                assert(room.getProjectId());
                done();
            });
        });
    });

    describe('updating the name', function() {
        let room = null;
        const OWNER = 'owner-' + Date.now();
        const PROJECT_NAME = 'proj-' + Date.now();
        const createRoom = function(username, projectName) {
            return utils.createRoom({
                name: projectName,
                owner: username,
                roles: {
                    p1: [username],
                    p2: ['cassie'],
                    third: null
                }
            });
        };

        beforeEach(function(done) {
            // Create the user
            let user = Users.new(OWNER, 'test@dummy.com');
            utils.reset()
                .then(() => createRoom(OWNER, PROJECT_NAME))
                .then(_room => {
                    room = _room;
                    return user.save();
                })
                .then(() => done())
                .catch(done);

        });

        it('should no-op if no collisions exist', function(done) {
            const name = room.name;

            room.changeName()
                .then(() => {
                    assert.equal(name, room.name);
                    done();
                })
                .catch(done);
        });

        it('should set the room name to provided value', function(done) {
            const name = `new name ${Date.now()}`;

            room.changeName(name)
                .then(() => {
                    assert.equal(name, room.name);
                    done();
                })
                .catch(done);
        });

        it('should append number to name if colliding with existing', function(done) {
            // Create a room (no user)
            createRoom('_netsblox_' + Date.now(), PROJECT_NAME)
                .then(_room => room = _room)
                // set the owner
                .then(() => room.setOwner(OWNER))
                .then(name => assert.notEqual(name, PROJECT_NAME))
                .nodeify(done);
        });

        describe('persisted', function() {
            let room = null;
            beforeEach(function(done) {
                utils.createRoom({
                    name: 'test-room',
                    owner: OWNER,
                    roles: {
                        p1: [OWNER]
                    }
                })
                .then(_room => room = _room)
                .then(() => room.getProject().persist())
                .nodeify(done);
            });

            it('should duplicate project if not inPlace', function(done) {
                const name = `new name ${Date.now()}`;
                const oldName = room.name;

                room.changeName(name)
                    .then(() => Projects.get(OWNER, oldName))
                    .then(oldProject => {
                        assert(oldProject);
                        done();
                    })
                    .catch(done);
            });

            it('should not duplicate project if inPlace', function(done) {
                const name = 'new project name';
                const oldName = room.name;

                room.changeName(name, false, true)
                    .then(() => Projects.get(OWNER, oldName))
                    .then(oldProject => {
                        assert(!oldProject);
                        done();
                    })
                    .catch(done);
            });
        });
    });
});
