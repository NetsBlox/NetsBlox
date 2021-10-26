const Users = require('../core/users');
const Strategies = require('../core/strategies');
const UsersRouter = require('express').Router();
const {handleErrors, setUsername} = require('./utils');

// TODO: Add a dry run option?
UsersRouter.route('/create')
    .post(handleErrors(async (req, res) => {
        const {username, password, groupId, email} = req.body;
        const dryrun = req.query.dryrun === 'true';
        let requestor = null;
        if (groupId) {
            // TODO: get the requestor username
        }
        await Users.create(requestor, username, email, groupId, password, dryrun);
        res.sendStatus(200);
    }));

UsersRouter.route('/login')
    .post(handleErrors(async (req, res) => {
        const {strategy: strategyName} = req.params;
        const {username, password, clientId} = req.body.projectId;
        const strategy = Strategies.find(strategyName);
        await Users.login(username, password, strategy, clientId);
        // TODO: login and set the session cookies
        // TODO: do we need to return the user?
        res.sendStatus(200);
    }));

UsersRouter.route('/logout')
    .post(handleErrors(async (req, res) => {
        const {clientId} = req.body;
        const {username} = req.session;
        await Users.logout(username, clientId);
        req.session.destroy();
        res.sendStatus(200);
    }));

UsersRouter.route('/delete/:username')
    .post(handleErrors(async (req, res) => {
        const {username} = req.params;
        const requestor = req.session.username;
        await Users.delete(requestor, username);
        req.session.destroy();
        res.sendStatus(200);
    }));

UsersRouter.route('/password/:username')
    .patch(handleErrors(async (req, res) => {
        const {oldPassword, newPassword} = req.body;
        const {username} = req.session;

        await Users.setPassword(username, oldPassword, newPassword);
        return res.sendStatus(200);
    }))
    .post(handleErrors(async (req, res) => {
        const {username} = req.params;

        await Users.resetPassword(username);
        return res.sendStatus(200);
    }));

UsersRouter.route('/view/:username')
    .get(handleErrors(async (req, res) => {
        // TODO: should we allow the requestor to be different? Probably for when editing members
    }));

UsersRouter.route('/link/:username')
    .post(handleErrors(async (req, res) => {
    }));

UsersRouter.route('/unlink/:username')
    .post(handleErrors(async (req, res) => {
    }));
    // TODO: should we allow the requestor to be different? Probably for when editing members

module.exports = UsersRouter;
