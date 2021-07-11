const Users = require('../core/users');
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
        const projectId = req.body.projectId;
        const {username, password} = req.body.projectId;
        // TODO: login and set the session cookies
    }));

UsersRouter.route('/logout')
    .post(handleErrors(async (req, res) => {
        const {clientId} = req.body;
        await Users.logout(clientId);
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

module.exports = UsersRouter;
