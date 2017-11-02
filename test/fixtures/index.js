// TODO: seed the database with the fixtures
const users = require('./users');
const Q = require('q');
const hash = require('../../src/common/sha512').hex_sha512;

function seed(storage) {
    // TODO: Add the users
    return Q.all(users.map(data => {  // create the users
        let user = storage.users.new(data.username, data.email);
        user.hash = hash(data.password);
        return user.save();
    }));
}

module.exports.init = seed;
