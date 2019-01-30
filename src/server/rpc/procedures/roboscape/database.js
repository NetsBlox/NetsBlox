const serviceStorage = require('../../advancedStorage');

const schemaDef = {
    owner: String, // username of the owner
    ownedAt: Date, // last date the user proved ownership of the robot
    users: [ // users that ever had access to the robot
        {
            username: String,
            hasAccess: Boolean,
            updatedAt: Date,
        }
    ]
};

module.exports = serviceStorage('Roboscape', schemaDef);
