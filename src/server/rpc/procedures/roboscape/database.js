const getServiceStorage = require('../../advancedStorage');

const schemaDef = {
    robotId: {type: String, required: true},
    isPublic: {type: Boolean, default: true},
    owner: {type: String, required: true}, // username of the owner
    ownedAt: {type: Date, required: true}, // last date the user proved ownership of the robot
    users: [ // users that ever had access to the robot
        {
            username: {type: String, required: true},
            hasAccess: {type: Boolean, required: true},
            updatedAt: {type: Date, required: true},
        }
    ]
};

module.exports = getServiceStorage('Roboscape', schemaDef);
