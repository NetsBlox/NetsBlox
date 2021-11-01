const Users = require('../core/users');
const Strategies = require('../core/strategies');
const UsersRouter = require('express').Router();
const {handleErrors, setUsername} = require('./utils');
const jwt = require('jsonwebtoken');
const sessionSecret = process.env.SESSION_SECRET || 'DoNotUseThisInProduction';
const COOKIE_ID = 'netsblox-cookie';

// TODO: Add a dry run option?
UsersRouter.route('/create')
    .post(handleErrors(async (req, res) => {
        const {username, password, groupId, email} = req.body;
        // TODO: ensure required parameters exist
        const dryrun = req.query.dryrun === 'true';
        let requestor = null;
        if (groupId) {
            requestor = await getUsername(req);
            // TODO: get the requestor username
        }
        await Users.create(requestor, username, email, groupId, password, dryrun);
        res.sendStatus(200);
    }));

UsersRouter.route('/login')
    .post(handleErrors(async (req, res) => {
        const {strategy: strategyName} = req.params;
        const remember = req.params === 'true';
        const {username, password, clientId} = req.body.projectId;
        const strategy = Strategies.find(strategyName);
        const user = await Users.login(username, password, strategy, clientId);
        setNetsBloxCookie(res, user, remember);
        res.sendStatus(200);
    }));

UsersRouter.route('/logout')
    // TODO: need to be logged in
    .post(handleErrors(async (req, res) => {
        const {clientId} = req.body;
        const {username} = req.session;
        await Users.logout(username, clientId);
        req.session.destroy();
        res.sendStatus(200);
    }));

UsersRouter.route('/delete/:username')
    // TODO: need to be logged in
    .post(handleErrors(async (req, res) => {
        const {username} = req.params;
        const requestor = req.session.username;
        await Users.delete(requestor, username);
        req.session.destroy();
        res.sendStatus(200);
    }));

UsersRouter.route('/password/:username')
    .post(handleErrors(async (req, res) => {
        const {username} = req.params;

        await Users.resetPassword(username);
        return res.sendStatus(200);
    }))
    // TODO: need to be logged in
    .patch(handleErrors(async (req, res) => {
        const {oldPassword, newPassword} = req.body;
        const {username} = req.session;

        await Users.setPassword(username, oldPassword, newPassword);
        return res.sendStatus(200);
    }));

UsersRouter.route('/view/:username')
    .get(handleErrors(async (req, res) => {
        // TODO: should we allow the requestor to be different? Probably for when editing members
    }));

UsersRouter.route('/link/:username')
    // TODO: need to be logged in
    .post(handleErrors(async (req, res) => {
    }));

UsersRouter.route('/unlink/:username')
    // TODO: need to be logged in
    .post(handleErrors(async (req, res) => {
    }));
    // TODO: should we allow the requestor to be different? Probably for when editing members

function setNetsBloxCookie(res, user, remember=false) {
    const cookie = {  // TODO: Add an id
        id: user.id || user._id,  // FIXME: which to use?
        username: user.username,
        email: user.email,
    };
    if (remember) {
        cookie.remember = remember;
    }

    const token = jwt.sign(cookie, sessionSecret);
    const options = getCookieOptions();

    if (cookie.remember) {
        const date = new Date();
        date.setDate(date.getDate() + 14);  // valid for 2 weeks
        options.expires = date;
    }

    res.cookie(COOKIE_ID, token, options);
}

function getCookieOptions() {
    const options = {
        httpOnly: true,
    };

    if (process.env.HOST !== undefined) {
        options.domain = process.env.HOST;
    }
    if (process.env.SERVER_PROTOCOL === 'https') {
        options.sameSite = 'None';
        options.secure = true;
    }

    return options;
}
module.exports = UsersRouter;
