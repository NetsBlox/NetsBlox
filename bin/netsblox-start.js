'use strict';
const path = require('path');
const {spawn} = require('child_process');
require('dotenv').load({
    path: path.join(__dirname, '..', '.env'),
    silent: true
});

const VANTAGE_PORT = process.env.VANTAGE_PORT || 1234;
const ENV = process.env.ENV;
const isDevMode = ENV !== 'production';
const DEBUG = process.env.DEBUG;

if (isDevMode && !DEBUG) process.env.DEBUG = 'netsblox:*';

function isVantageEnabled() {
    const VANTAGE_ENABLED = process.env.VANTAGE_ENABLED === 'true';
    if (ENV === 'production') return false;
    if (VANTAGE_ENABLED !== undefined) return VANTAGE_ENABLED;
    if (VANTAGE_PORT) return true;
    return isDevMode;
}

const Command = require('commander').Command;
const program = new Command();
program
    .option('-s, --services', 'Only start services server')
    .option('-c, --core', 'Only start server providing core functionality')
    .parse(process.argv);

if (program.core && program.services) {
    throw new Error('--core and --services options cannot be used together');
}

const startAll = !program.core && !program.services;
const port = +(process.env.PORT || 8080);
process.env.NETSBLOX_API_PORT = process.env.NETSBLOX_API_PORT || 1357;
if (startAll) {
    const servicesBin = path.join(__dirname, '..', 'src', 'server', 'services', 'index.js');
    const servicesPort = port + 1;
    process.env.PORT = servicesPort;
    const opts = {env: process.env};
    const services = spawn('node', [servicesBin], opts);
    services.stdout.pipe(process.stdout);
    services.stderr.pipe(process.stderr);
    process.env.SERVICES_URL = 'http://localhost:' + servicesPort;
}

if (program.services) {
    const startServices = require('../src/server/services');
    const port = process.env.PORT || 8081;
    startServices(port)
        .then(() => {
            console.log(`Services available at http://localhost:${port}.`);
        })
        .catch(err => {
            console.error('Unable to start services:', err);
        });
} else {
    const Server = require('../src/server/server');
    const opts = {
        port: port,
        vantagePort: VANTAGE_PORT,
        vantage: isVantageEnabled(),
        servicesURL: process.env.SERVICES_URL,
        useServiceProxy: isSetToTrue(process.env.PROXY_RPCS) || startAll
    };

    const buildDocsBin = path.join(__dirname, 'build-docs.js');
    const buildDocs = spawn('node', [buildDocsBin], {env: process.env});
    buildDocs.stdout.pipe(process.stdout);
    buildDocs.stderr.pipe(process.stderr);
    const server = new Server(opts);

    server.start();
}

function isSetToTrue(envValue) {
    return envValue && (envValue.toLowerCase() === 'true' || envValue === '1');
}
