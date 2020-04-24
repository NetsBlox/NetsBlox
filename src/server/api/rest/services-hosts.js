const ServicesHosts = require('../core/services-hosts');
const ServicesHostsRouter = require('express').Router();
const {handleErrors, setUsername} = require('./utils');

ServicesHostsRouter.use(setUsername);
ServicesHostsRouter.route('/user/:name')
    .get(handleErrors(async (req, res) => {
        const {name} = req.params;
        const {username} = req.session;
        const hosts = await ServicesHosts.getUserHosts(username, name);
        res.json(hosts);
    }))
    .post(handleErrors(async (req, res) => {
        const {name} = req.params;
        const {username} = req.session;
        const servicesHosts = req.body;
        await ServicesHosts.setUserServicesHosts(username, name, servicesHosts);
        res.sendStatus(200);
    }));

ServicesHostsRouter.route('/group/:id')
    .get(handleErrors(async (req, res) => {
        const {id} = req.params;
        const {username} = req.session;
        const hosts = await ServicesHosts.getGroupHosts(username, id);
        res.json(hosts);
    }))
    .post(handleErrors(async (req, res) => {
        const {id} = req.params;
        const {username} = req.session;
        const servicesHosts = req.body;
        await ServicesHosts.setGroupServicesHosts(username, id, servicesHosts);
        res.sendStatus(200);
    }));

ServicesHostsRouter.route('/all/:name?')
    .get(handleErrors(async (req, res) => {
        const {username} = req.session;
        const {name = username} = req.params;
        const hosts = await ServicesHosts.getServicesHosts(username, name);
        res.json(hosts);
    }));

module.exports = ServicesHostsRouter;
