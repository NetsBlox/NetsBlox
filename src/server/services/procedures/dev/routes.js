const express = require('express');
const router = express();
const NetsBloxAddress = require('../../../netsblox-address');
const RemoteClient = require('../../remote-client');
const bodyParser = require('body-parser');

router.post(
    '/send',
    bodyParser.json({limit: '1mb'}),
    async (req, res) => {
        const {address, messageType, data} = req.body;
        const resolvedAddr = await NetsBloxAddress.new(address)
            .catch(err => {
                res.status(400).send(err.message);
            });

        if (resolvedAddr) {
            const client = new RemoteClient(resolvedAddr.projectId);
            await client.sendMessageToRoom(messageType, data);
            res.sendStatus(200);
        }
    }
);

module.exports = router;
