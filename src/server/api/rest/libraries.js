const Libraries = require('../core/libraries');
const LibrariesRouter = require('express').Router();
const {handleErrors, setUsername} = require('./utils');

LibrariesRouter.use(setUsername);
LibrariesRouter.route('/user/')
    .get(handleErrors(async (req, res) => {
        const {username} = req.session;
        const libraries = await Libraries.getLibraries(username, username);
        res.json(libraries);
    }));

LibrariesRouter.route('/user/:owner/:name')
    .get(handleErrors(async (req, res) => {
        const {owner, name} = req.params;
        const {username} = req.session;
        const library = await Libraries.getLibrary(username, owner, name);
        res.send(library);
    }))
    .post(handleErrors(async (req, res) => {
        const {owner, name} = req.params;
        const {username} = req.session;
        const {blocks, notes} = req.body;
        const needsApproval = await Libraries.saveLibrary(username, owner, name, blocks, notes);
        res.json({needsApproval});
    }))
    .delete(handleErrors(async (req, res) => {
        const {owner, name} = req.params;
        const {username} = req.session;
        await Libraries.deleteLibrary(username, owner, name);
        res.sendStatus(200);
    }));

LibrariesRouter.route('/user/:owner/:name/publish')
    .post(handleErrors(async (req, res) => {
        const {owner, name} = req.params;
        const {username} = req.session;
        const needsApproval = await Libraries.publishLibrary(username, owner, name);
        res.json({needsApproval});
    }));

LibrariesRouter.route('/user/:owner/:name/unpublish')
    .post(handleErrors(async (req, res) => {
        const {owner, name} = req.params;
        const {username} = req.session;
        await Libraries.unpublishLibrary(username, owner, name);
        res.sendStatus(200);
    }));

LibrariesRouter.route('/community/')
    .get(handleErrors(async (req, res) => {
        const libraries = await Libraries.getPublicLibraries();
        res.json(libraries);
    }));

module.exports = LibrariesRouter;
