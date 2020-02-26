const path = require('path');
const fs = require('fs');
const ServicesAPI = require('./api');
const express = require('express');
const middleware = require('../routes/middleware');
const Storage = require('../storage/storage');
const ServiceStorage = require('./storage');
const ApiKeys = require('./api-keys');
const Logger = require('../logger');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

async function listen(port) {
    const app = express();
    const logger = new Logger('services');

    app.use(bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    }));
    app.use(bodyParser.json({limit: '50mb'}));

    // Session & Cookie settings
    app.use(cookieParser());

    // CORS
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', req.get('origin'));
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, SESSIONGLUE');
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, PATCH, DELETE');
        next();
    });
    app.options('*', (req, res) => res.sendStatus(204));

    await Storage.connect();
    await ServiceStorage.init(logger, Storage._db);
    await ApiKeys.init(Storage._db, logger);
    middleware.init({_logger: logger});
    await ServicesAPI.initialize();
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, PATCH, DELETE');
        next();
    });
    app.use((req, res, next) => middleware.tryLogIn(req, res, next, true));
    app.use('/keys', middleware.isLoggedIn, ApiKeys.router());
    app.use('/', ServicesAPI.router());
    const RPC_ROOT = path.join(__dirname, 'libs');
    const RPC_INDEX = fs.readFileSync(path.join(RPC_ROOT, 'LIBS'), 'utf8')
        .split('\n')
        .filter(line => {
            const parts = line.split('\t');
            const deps = parts[2] ? parts[2].split(' ') : [];
            const displayName = parts[1];

            // Check if we have loaded the dependent rpcs
            for (let i = deps.length; i--;) {
                if (!ServicesAPI.isServiceLoaded(deps[i])) {
                    // eslint-disable-next-line no-console
                    console.log(`Service ${displayName} not available because ${deps[i]} is not loaded`);
                    return false;
                }
            }
            return true;
        })
        .map(line => line.split('\t').splice(0, 2).join('\t'))
        .join('\n');

    app.get('/servicelibs/:filename', (req, res) => {
        if (req.params.filename === 'SERVICELIBS') {
            res.send(RPC_INDEX);
        } else {
            res.sendFile(path.join(RPC_ROOT, req.params.filename));
        }
    });

    app.listen(+port);
}

if (require.main === module) {
    listen(process.env.PORT || 6000);
}

module.exports = listen;

