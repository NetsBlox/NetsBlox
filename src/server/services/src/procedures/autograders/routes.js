const fs = require('fs');
const path = require('path');
const AutograderCode = fs.readFileSync(path.join(__dirname, 'template.ejs'), 'utf8');
const getDatabase = require('./storage');
const express = require('express');
const router = express();
const rp = require('request-promise');

router.get(
    '/:author/:name.js',
    async (req, res) => {
        const {author, name} = req.params;
        const storage = getDatabase();
        const autograder = await storage.findOne({author, name});
        if (!autograder) {
            return res.sendStatus(404);
        }

        const code = AutograderCode.replace(
            'AUTOGRADER_CONFIG',
            JSON.stringify(autograder.config)
        );
        return res.send(code);
    }
);

router.post(
    '/submit/coursera',
    async (req, res) => {
        const url = 'https://www.coursera.org/api/onDemandProgrammingScriptSubmissions.v1';
        try {
            const response = await rp({
                uri: url,
                method: 'POST',
                json: req.body,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
            });
            return res.send(response);
        } catch (err) {
            const isStatusCodeError = err.name === 'StatusCodeError';
            const status = isStatusCodeError ? err.statusCode : 500;
            const message = isStatusCodeError ? err.error.message : `An error occurred: ${err.message}`;
            return res.status(status).send(message);
        }
    }
);

module.exports = router;
