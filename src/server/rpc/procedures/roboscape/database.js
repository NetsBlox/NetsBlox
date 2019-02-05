const getServiceStorage = require('../../advancedStorage');

const schemaDef = {
    robotId: {type: String, required: true},
    owner: {type: String, required: true}, // username of the owner
    ownedAt: {type: Date, required: true}, // last date the user proved ownership of the robot
    users: [ // users that ever had access to the robot
        {
            username: String,
            hasAccess: Boolean,
            updatedAt: Date,
        }
    ]
};

module.exports = getServiceStorage('Roboscape', schemaDef);
