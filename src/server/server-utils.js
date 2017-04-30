// These are utils for server specific tasks
'use strict';

var R = require('ramda'),
    assert = require('assert'),
    debug = require('debug'),
    info = debug('netsblox:api:utils:info'),
    trace = debug('netsblox:api:utils:trace'),
    error = debug('netsblox:api:utils:error'),
    version = require('../../package.json').version;

var uuid = function(owner, name) {
    return owner + '/' + name;
};

// Helpers for routes
var APP_REGEX = /app="([^"]+)"/;
var getRoomXML = function(project) {
    var roles = [project.activeRole].concat(Object.keys(project.roles)
        .filter(name => name !== project.activeRole))
        .map(roleName => project.roles[roleName]);
    var roleXml = roles.map(role =>
        `<role name="${role.ProjectName}">${role.SourceCode + role.Media}</role>`
    ).join('');
    var app = roleXml.match(APP_REGEX)[1] || `NetsBlox ${version}, http://netsblox.org`;

    return `<room name="${project.name}" app="${app}">${roleXml}</room>`;
};

var serializeArray = function(content) {
    assert(content instanceof Array);
    return content.map(serialize).join(' ');
};

var serialize = function(service) {
    var pairs = R.toPairs(service);
    return encodeURI(pairs.map(R.join('=')).join('&'));
};

var serializeRole = (project, roomName) => {
    var src;
    src = project.SourceCode ? 
        `<snapdata>+${encodeURIComponent(project.SourceCode + project.Media)}</snapdata>` :
        '';
    return `RoomName=${encodeURIComponent(roomName)}&${serialize(R.omit(['SourceCode', 'Media'],
        project))}&SourceCode=${src}`;
};

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

// Function helpers
var FN_ARGS = /^(function)?\s*[^\(]*\(\s*([^\)]*)\)/m,
    FN_ARG_SPLIT = /,/,
    STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

var getArgumentsFor = function(fn) {
    var fnText,
        args;

    if (fn.args) {
        return fn.args;
    }

    fnText = fn.toString().replace(STRIP_COMMENTS, '');
    args = fnText.match(FN_ARGS)[2].split(FN_ARG_SPLIT);
    return args
        .map(arg => arg.replace(/\s+/g, ''))
        .filter(arg => !!arg);
};

// given a project source code returns an array of used services as tags.
var extractRpcs = function(projectXml){
    let rpcs = [];
    let foundRpcs = projectXml.match(/getJSFromRPCStruct"><l>([a-zA-Z\-_0-9]+)<\/l>/g);
    if (foundRpcs) {
        foundRpcs.forEach(txt=>{
            rpcs.push(txt.match(/getJSFromRPCStruct"><l>([a-zA-Z\-_0-9]+)<\/l>/)[1]);
        });                
    }
    return rpcs;
};

var computeAspectRatioPadding = function(width, height, ratio){
    var diff,
        left = 0,
        top = 0,
        right = 0,
        bottom = 0,
        expectedHeight = width/ratio;

    if (expectedHeight > height) {  // Add padding to the height
        diff = expectedHeight - height;
        top = bottom = diff/2;
        trace(`new dims should be ${width}x${height+diff}`);
    } else {  // add padding to the width
        diff = ratio * height - width;
        left = right = diff/2;
        trace(`new dims should be ${width+diff}x${height}`);
    }
    return {left, right, top, bottom};
};

module.exports = {
    serialize,
    serializeArray,
    serializeRole,
    joinActiveProject,
    uuid,
    getRoomXML,
    extractRpcs,
    computeAspectRatioPadding,
    getArgumentsFor
};
