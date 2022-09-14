const express = require('express');
const router = express();

router.get(
    '/port',
    async (_, res) => {
        res.status(200).send(process.env.PHONE_IOT_PORT || 'PhoneIoT is not enabled.');
    }
);

module.exports = router;
