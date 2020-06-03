const Logger = require('../../logger');
const LibraryStorage = require('../../storage/libraries');
const {LibraryNotFound, RequestError} = require('./errors');
const Auth = require('./auth');
const P = Auth.Permission;
const Filter = require('bad-words');
const profaneChecker = new Filter();

class Libraries {
    constructor() {
        this.logger = new Logger('netsblox:libraries');
    }

    async deleteLibrary(requestor, owner, name) {
        await Auth.ensureAuthorized(requestor, P.Library.DELETE(owner));
        const result = await LibraryStorage.collection.deleteOne({owner, name});
        return result.deletedCount === 1;
    }

    async getLibrary(requestor, owner, name) {
        const library = await this._getLibrary(owner, name);
        await Auth.ensureAuthorized(requestor, P.Library.READ(owner, library));
        return library.blocks;
    }

    async getLibraries(requestor, owner) {
        await Auth.ensureAuthorized(requestor, P.Library.LIST(owner));
        const options = {
            projection: {name: 1, owner: 1, notes: 1, public: 1, needsApproval: 1}
        };
        return await LibraryStorage.collection.find({owner}, options).toArray();
    }

    async getPublicLibraries() {
        const options = {
            projection: {name: 1, owner: 1, notes: 1}
        };
        return await LibraryStorage.collection.find({public: true}, options).toArray();
    }

    async saveLibrary(requestor, owner, name, libraryXML, notes) {
        await Auth.ensureAuthorized(requestor, P.Library.WRITE(owner));
        this.ensureValidName(name);
        const query = {owner, name};
        const updates = {$set: {blocks: libraryXML, notes}};
        const options = {upsert: true};

        const library = await LibraryStorage.collection.findOne({owner, name, public: true});
        if (library) {
            library.blocks = libraryXML;
            library.notes = notes;
            const needsApproval = await this._isApprovalRequired(owner, name, library);
            if (needsApproval) {
                updates.$set.public = false;
                updates.$set.needsApproval = true;
            }
        }

        await LibraryStorage.collection.updateOne(query, updates, options);
    }

    async publishLibrary(requestor, owner, name) {
        await Auth.ensureAuthorized(requestor, P.Library.WRITE(owner));
        const query = {owner, name};
        const needsApproval = await this._isApprovalRequired(owner, name);
        const updates = needsApproval ? {$set: {needsApproval: true}} :
            {$set: {public: true}};
        const result = await LibraryStorage.collection.updateOne(query, updates);
        if (result.matchedCount === 0) {
            throw new LibraryNotFound(owner, name);
        }
        return needsApproval;
    }

    async unpublishLibrary(requestor, owner, name) {
        await Auth.ensureAuthorized(requestor, P.Library.WRITE(owner));
        const query = {owner, name};
        const updates = {$set: {public: false, needsApproval: false}};
        const result = await LibraryStorage.collection.updateOne(query, updates);
        if (result.matchedCount === 0) {
            throw new LibraryNotFound(owner, name);
        }
    }

    async _getLibrary(owner, name) {
        const library = await LibraryStorage.collection.findOne({owner, name});
        if (!library) {
            throw new LibraryNotFound(owner, name);
        }
        return library;
    }

    async _isApprovalRequired(owner, name, library) {
        const isProfaneName = profaneChecker.isProfane(name);
        if (isProfaneName) {
            return true;
        }

        library = library || await this._getLibrary(owner, name);
        return library.blocks.includes('reportJSFunction') ||
            profaneChecker.isProfane(library.notes) ||
            profaneChecker.isProfane(library.blocks);
    }

    ensureValidName(name) {
        const validChars = /^[A-zÀ-ÿ0-9 _-]+$/;
        if(!validChars.test(name)) {
            throw new RequestError('Invalid name. Name can only contain letters, numbers, and spaces');
        }
    }
}

module.exports = new Libraries();
