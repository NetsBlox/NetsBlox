const express = require('express');
const router = express();

router.get(
    '/port',
    async (_, res) => {
        res.status(200).send(process.env.IOTSCAPE_PORT || 'IoTScape is not enabled.');
    }
);

module.exports = router;
