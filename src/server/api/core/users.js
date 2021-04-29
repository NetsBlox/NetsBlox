const NetworkTopology = require('../../network-topology');
const Logger = require('../../logger');
const UsersStorage = require('../../storage/users');
const {UserNotFound, IncorrectUserOrPassword} = require('./errors');
const {MissingArguments, InvalidArgument, RequestError} = require('./errors');
const Auth = require('./auth');
const P = Auth.Permission;
const {hex_sha512} = require('../../../common/sha512');
const randomString = require('just.randomstring');
const mailer = require('../../mailer');
const _ = require('lodash');

class Users {
    constructor() {
        this.logger = new Logger('netsblox:users');
    }

    async create(requestor, username, email, groupId, password, dryrun=false) {
        // Must have an email and username
        if (!username) throw new MissingArguments('username');
        if (!email) throw new MissingArguments('email');

        // validate username
        const nameRegex = /[^a-zA-Z0-9][a-zA-Z0-9_\-\(\)\.]*/;
        if (username.startsWith('_') || nameRegex.test(username)) {
            throw new InvalidArgument('username');
        }

        if (groupId) {
            await Auth.ensureAuthorized(requestor, P.Group.WRITE(groupId));
        }

        const user = UsersStorage.new(username, email, groupId, password);
        await user.prepare();
        const userData = user._saveable();

        const query = {username};
        const update = {$setOnInsert: userData};

        let alreadyExists = false;
        if (dryrun) {
            const doc = await UsersStorage.collection.findOne(query);
            alreadyExists = !!doc;
        } else {
            const result = await UsersStorage.collection.updateOne(query, update, {upsert: true});
            alreadyExists = result.upsertedCount === 0;
        }

        if (alreadyExists) {
            throw new RequestError(`User "${username}" already exists.`);
        }
    }

    async view(requestor, username) {
        await Auth.ensureAuthorized(requestor, P.User.READ(username));
        const user = await UsersStorage.collection.findOne({username});
        return _.omit(user, ['_id', 'hash']);
    }

    async login(username, password, strategy, projectId) {
        if (!username) throw new MissingArguments('username');
        if (!password) throw new MissingArguments('password');
        //let user = null;

        //// Should check if the user has a valid cookie. If so, log them in with it!
        //// Explicit login
        //try {
            //await middleware.login(req, res);
        //} catch (err) {
            //logger.log(`Login failed for "${username}": ${err}`);
            //if (req.body.silent) {
                //return res.sendStatus(204);
            //} else {
                //return res.status(403).send(err.message);
            //}
        //}

        //username = req.session.username;
        //user = req.session.user;

        //// Update the project if logging in from the netsblox app
        //if (projectId) {  // update project owner
            //const project = await Projects.getById(projectId);

            //// Update the project owner, if needed
            //if (project && Utils.isSocketUuid(project.owner)) {
                //const name = await user.getNewName(project.name);
                //await project.setName(name);
                //await project.setOwner(username);
                //await NetworkTopology.onRoomUpdate(projectId);
            //}
        //}

        //if (req.body.return_user) {
            //return res.status(200).json({
                //username: username,
                //admin: user.admin,
                //email: user.email
            //});
        //} else {
            //return res.status(200).json(ExternalAPI);
        //}
    }

    async delete(requestor, username) {
        await Auth.ensureAuthorized(requestor, P.User.DELETE(username));
        const result = await UsersStorage.collection.deleteOne({username});
        if (result.deletedCount === 0) {
            throw new UserNotFound(username);
        }
    }

    async setPassword(username, oldPassword, newPassword) {
        // TODO: Check if the username is correct for better error message?
        const oldHash = hex_sha512(oldPassword);
        const newHash = hex_sha512(newPassword);
        const query = {username, hash: oldHash};
        const updates = {$set: {hash: newHash}};

        const result = await UsersStorage.collection.updateOne(query, updates);
        if (result.matchedCount !== 1) {
            throw new IncorrectUserOrPassword();
        }
    }

    async resetPassword(username) {
        const password = randomString(8);
        const hash = hex_sha512(password);
        const query = {username};
        const update = {$set: {hash}};
        const user = await UsersStorage.findOneAndUpdate(query, update);
        if (!user) {
            throw new UserNotFound(username);
        }

        mailer.sendMail({
            to: user.email,
            subject: 'Temporary Password',
            html: '<p>Hello '+username+',<br/><br/>Your NetsBlox password has been '+
                'temporarily set to '+password+'. Please change it after '+
                'logging in.</p>'
        });
    }

    async logout(clientId) {
        const client = NetworkTopology.getClient(clientId);
        if (client) {
            client.onLogout();
        }
    }

}

module.exports = new Users();
