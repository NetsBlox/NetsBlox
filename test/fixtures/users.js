/*
 * "username" is required. Everything else is optional. Email will be set to
 *
 *   <username>@netsblox.org
 *
 * and the password will be set to "password"
 */
const Users = {};
Users.addDefaults = function (user) {
    user.email = user.email || `${user.username}@netsblox.org`;
    user.password = user.password || 'password';

    return user;
};

Users.defaultUsers = [
    {
        username: 'brian',
        password: 'secretPassword'
    },
    {
        username: 'hamid',
        password: 'monkey123'
    },
    {
        username: 'akos'
    },
    {
        username: 'test'
    }
].map(Users.addDefaults);

module.exports = Users;
