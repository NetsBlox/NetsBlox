const getServiceStorage = require('../../advancedStorage');

const schemaDef = {
    robotId: {type: String, required: true, index: true},
    isPublic: {type: Boolean, default: true},
    owner: {type: String, required: true}, // username of the owner
    ownedAt: {type: Date, required: true}, // last date the user proved ownership of the robot
    users: [ // users that ever had access to the robot for the current owner
        {
            username: {type: String, required: true},
            hasAccess: {type: Boolean, required: true},
            updatedAt: {type: Date, required: true},
        }
    ]
};

module.exports = getServiceStorage('Roboscape', schemaDef);
