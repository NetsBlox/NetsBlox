// These are utils for server specific tasks
'use strict';

var R = require('ramda'),
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    debug = require('debug'),
    info = debug('NetsBlox:API:Utils:info'),
    trace = debug('NetsBlox:API:Utils:trace'),
    error = debug('NetsBlox:API:Utils:error');

var serializeArray = function(content) {
    assert(content instanceof Array);
    return content.map(serialize).join(' ');
};

var serialize = function(service) {
    var pairs = R.toPairs(service);
    return encodeURI(pairs.map(R.join('=')).join('&'));
};

var loadJsFiles = function(dir) {
    return fs.readdirSync(dir)
        // Get only js files
        .filter(name => path.extname(name) === '.js')
        // Require the files
        .map(R.pipe(
            R.nthArg(0),
            path.join.bind(path, dir), 
            require
        ));
};

var uuid = function(owner, name) {
    return owner + '/' + name;
};

var serializeRole = (project, roomName) => {
    var src;
    src = project.SourceCode ? 
        `<snapdata>+${encodeURIComponent(project.SourceCode + project.Media)}</snapdata>` :
        '';
    return `RoomName=${encodeURIComponent(roomName)}&${serialize(R.omit(['SourceCode', 'Media'],
        project))}&SourceCode=${src}`;
};

// Helper for routes
var joinActiveProject = function(userId, room, res) {
    var serialized,
        openRole,
        createdNewRole = false,
        role;

    openRole = Object.keys(room.roles)
        .filter(role => !room.roles[role])  // not occupied
        .shift();

    trace(`room "${room.name}" is already active`);
    if (openRole && room.cachedProjects[openRole]) {  // Send an open role and add the user
        trace(`adding ${userId} to open role "${openRole}" at "${room.name}"`);
        role = room.cachedProjects[openRole];
    } else {  // If no open role w/ cache -> make a new role
        let i = 2,
            base;

        if (!openRole) {
            openRole = base = 'new role';
            while (room.hasOwnProperty(openRole)) {
                openRole = `${base} (${i++})`;
            }
            trace(`creating new role "${openRole}" at "${room.name}" ` +
                `for ${userId}`);
        } else {
            error(`Found open role "${openRole}" but it is not cached! May have lost data!!!`);
        }

        info(`adding ${userId} to new role "${openRole}" at ` +
            `"${room.name}"`);

        room.createRole(openRole);
        createdNewRole = true;
        role = {
            ProjectName: openRole,
            SourceCode: null,
            SourceSize: 0
        };
        room.cachedProjects[openRole] = role;
    }
    serialized = serializeRole(role, room.name);
    return res.send(`OwnerId=${room.owner.username}&NewRole=${createdNewRole}&${serialized}`);
};

module.exports = {
    serialize: serialize,
    loadJsFiles: loadJsFiles,
    serializeArray: serializeArray,
    serializeRole: serializeRole,
    joinActiveProject: joinActiveProject,
    uuid: uuid

};
