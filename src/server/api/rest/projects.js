const Projects = require('../core/projects');
const ProjectsRouter = require('express').Router();
const {handleErrors, setUsername} = require('./utils');

ProjectsRouter.use(setUsername);
ProjectsRouter.route('/:projectId/latest')
    .get(handleErrors(async (req, res) => {
        const {username} = req.session;
        const {projectId} = req.params;
        const xml = await Projects.exportProject(username, projectId);
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    }));

ProjectsRouter.route('/:projectId/:roleId/latest')
    .get(handleErrors(async (req, res) => {
        const {username} = req.session;
        const {projectId, roleId} = req.params;
        const xml = await Projects.exportRole(username, projectId, roleId);
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    }));

module.exports = ProjectsRouter;
