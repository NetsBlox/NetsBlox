const ProjectsStorage = require('../../storage/projects');
const NetworkTopology = require('../../network-topology');
const Logger = require('../../logger');
const UsersStorage = require('../../storage/users');
const {UserNotFound, IncorrectUserOrPassword} = require('./errors');
const {MissingArguments, InvalidArgument, RequestError} = require('./errors');
const Auth = require('./auth');
const P = Auth.Permission;
const {hex_sha512} = require('../../../common/sha512');
const randomString = require('just.randomstring');
const defaultMailer = require('../../mailer');
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

    async delete(requestor, username) {
        await Auth.ensureAuthorized(requestor, P.User.DELETE(username));
        const result = await UsersStorage.collection.deleteOne({username});
        if (result.deletedCount === 0) {
            throw new UserNotFound(username);
        }
        await ProjectsStorage._collection.deleteMany({owner: username});
    }

    async setPassword(requestor, username, newPassword, oldPassword=null) {
        await Auth.ensureAuthorized(requestor, P.User.WRITE(username));

        const newHash = hex_sha512(newPassword);
        const query = {username};
        if (oldPassword) {
            query.hash = hex_sha512(oldPassword);
        }
        const updates = {$set: {hash: newHash}};

        const result = await UsersStorage.collection.updateOne(query, updates);
        if (result.matchedCount !== 1) {
            throw new IncorrectUserOrPassword();
        }
    }

    async resetPassword(username, mailer=defaultMailer) {
        const password = randomString(8);
        const hash = hex_sha512(password);
        const query = {username};
        const update = {$set: {hash}};
        const result = await UsersStorage.collection.findOneAndUpdate(query, update);
        if (!result.value) {
            throw new UserNotFound(username);
        }

        mailer.sendMail({
            to: result.value.email,
            subject: 'Temporary Password',
            html: '<p>Hello '+username+',<br/><br/>Your NetsBlox password has been '+
                'temporarily set to '+password+'. Please change it after '+
                'logging in.</p>'
        });
    }

    async login(username, password, strategy, clientId) {
        if (!username) throw new MissingArguments('username');
        if (!password) throw new MissingArguments('password');

        let user;
        if (strategy) {  // TODO: should we make a "default strategy"?
            await strategy.authenticate(username, password);
            user = await UsersStorage.findWithStrategy(username, strategy.type);
        } else {
            const hash = hex_sha512(password);
            user = await UsersStorage.collection.findOne({username, hash});
            if (!user) {
                throw new IncorrectUserOrPassword();
            }
        }

        if (clientId) {
            const client = NetworkTopology.getClient(clientId);
            if (!client) {
                throw new RequestError('Client not found.');
            }
            client.setUsername(user.username);
            await ProjectsStorage._collection.updateOne(
                {owner: client.uuid},
                {$set: {owner: user.username}}
            );
                // TODO: Update this
            //if (project && Utils.isSocketUuid(project.owner)) {
                //const name = await user.getNewName(project.name);
                //await project.setName(name);
                //await project.setOwner(username);
                //await NetworkTopology.onRoomUpdate(projectId);
            //}
        }
    }

    async logout(requestor, clientId) {
        // TODO: permissions? Can edit client?
        const client = NetworkTopology.getClient(clientId);
        if (client) {
            client.onLogout();
        }
    }

    async linkAccount(requestor, username, strategy, strategyUsername, password) {
        await Auth.ensureAuthorized(requestor, P.User.WRITE(username));
        await strategy.authenticate(strategyUsername, password);
        const user = await UsersStorage.findWithStrategy(strategyUsername, strategy.type);
        if (user) {
            throw new RequestError(`${strategyUsername} is already linked to a NetsBlox account.`);
        }

        const result = await UsersStorage.collection.updateOne(
            {username},
            {$push: {linkedAccounts: {username: strategyUsername, type: strategy.type}}}
        );
        if (result.modifiedCount === 0) {
            throw new UserNotFound(username);
        }
        return result.modifiedCount === 1;
    }

    async unlinkAccount(requestor, username, account) {
        await Auth.ensureAuthorized(requestor, P.User.WRITE(username));
        const result = await UsersStorage.collection.updateOne(
            {username},
            {$pull: {linkedAccounts: account}}
        );
        if (result.matchedCount === 0) {
            throw new UserNotFound(username);
        }
    }
}

module.exports = new Users();
