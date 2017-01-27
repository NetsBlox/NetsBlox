var publicRoleManager = require('../../src/server/public-role-manager'),
    assert = require('assert');

describe('public-role-manager', function() {
    beforeEach(() => {
        publicRoleManager.reset();
    });

    it('should retrieve socket by the public role id', function() {
        var socket = getMockSocket('room', 'brian', 'somerole'),
            pubId = publicRoleManager.register(socket);
        
        assert.equal(publicRoleManager.lookUp(pubId), socket);
    });

    it('should not retrieve socket if role changes', function() {
        var socket = getMockSocket('room', 'brian', 'somerole'),
            pubId = publicRoleManager.register(socket);
        
        socket.roleId = 'otherRole';
        assert.equal(publicRoleManager.lookUp(pubId), null);
    });

    it('should use number for the public role id', function() {
        var socket = getMockSocket('room', 'brian', 'somerole'),
            pubId = publicRoleManager.register(socket);

        assert(/\d+/.test(pubId));
    });

    it('should not retrieve socket if socket closes', function() {
        var socket = getMockSocket('room', 'brian', 'somerole'),
            pubId = publicRoleManager.register(socket);
        
        socket.onclose.forEach(fn => fn());
        assert.equal(publicRoleManager.lookUp(pubId), null);
    });

});

var getMockSocket = function(roomName, owner, role) {
    return {
        _room: {
            name: roomName,
            owner: {username: owner}
        },
        username: 'test-socket',
        uuid: 'test-socket-uuid',
        hasRoom: () => true,
        onclose: [],
        roleId: role
    };
};

