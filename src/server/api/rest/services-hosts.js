const ServicesHosts = require('../core/services-hosts');
const ServicesHostsRouter = require('express').Router();
const {handleErrors, ensureLoggedIn} = require('./utils');

// TODO: Ensure current user is "name"
ServicesHostsRouter.route('/user/:name')
    .get(handleErrors(async (req, res) => {
        const {name} = req.params;
        const hosts = await ServicesHosts.getUserHosts(name);
        res.json(hosts);
    }))
    .post(handleErrors(async (req, res) => {
        const {name} = req.params;
        const servicesHosts = req.body;
        await ServicesHosts.setUserServicesHosts(name, servicesHosts);
        res.sendStatus(200);
    }));

ServicesHostsRouter.route('/group/:id')
    //.use(ensureLoggedIn)
    .get(handleErrors(async (req, res) => {
        // TODO: Ensure current user is owner or member
        const {id} = req.params;
        const hosts = await ServicesHosts.getGroupHosts(id);
        res.json(hosts);
    }))
    .post(handleErrors(async (req, res) => {
        // TODO: Ensure current user is owner or member
        const {id} = req.params;
        const servicesHosts = req.body;
        await ServicesHosts.setGroupServicesHosts(id, servicesHosts);
        res.sendStatus(200);
    }));

ServicesHostsRouter.route('/all/:name')
    .get(handleErrors(async (req, res) => {
        // TODO: Ensure current user is "name"
        const {name} = req.params;
        const hosts = await ServicesHosts.getAllHosts(name);
        res.json(hosts);
    }));

module.exports = ServicesHostsRouter;
