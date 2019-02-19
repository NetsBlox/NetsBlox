/*
 * "username" is required. Everything else is optional. Email will be set to
 *
 *   <username>@netsblox.org
 *
 * and the password will be set to "password"
 */
function addDefaults(user) {
    user.email = user.email || `${user.username}@netsblox.org`;
    user.password = user.password || 'password';

    return user;
}

module.exports = [
    {
        username: 'brian',
        password: 'secretPassword'
    },
    {
        username: 'hamid'
    },
    {
        username: 'akos'
    },
    {
        username: 'test'
    }
].map(addDefaults);
