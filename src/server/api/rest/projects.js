const Projects = require('../core/projects');
const {RequestError} = require('../core/errors');
const ProjectsRouter = require('express').Router();
const {handleErrors, setUsername} = require('./utils');

ProjectsRouter.use(setUsername);
ProjectsRouter.route('/:projectId/latest')
    .get(handleErrors(async (req, res) => {
        const usernameOrId = getUsernameOrClientId(req);
        const {projectId} = req.params;
        const xml = await Projects.exportProject(usernameOrId, projectId);
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    }));

ProjectsRouter.route('/:projectId/:roleId/latest')
    .get(handleErrors(async (req, res) => {
        const usernameOrId = getUsernameOrClientId(req);
        const {projectId, roleId} = req.params;
        const xml = await Projects.exportRole(usernameOrId, projectId, roleId);
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    }));

function getUsernameOrClientId(req) {
    const {username} = req.session;
    if (username) return username;

    const clientId = req.query.clientId;
    if (clientId) return clientId;

    throw new RequestError('Unauthenticated users must provide a clientId.');
}

module.exports = ProjectsRouter;
