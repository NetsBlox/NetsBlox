/**
 * Provides access to images from various websites typically called this<X>doesnotexist.com.
 * These are images of X generated from random noise by (typically) a GAN.
 * 
 * @alpha
 * @service
 * @category Science
 */
'use strict';

// I got the list of X to support from: https://thisxdoesnotexist.com/ and a few reddit pages.
// most are supported, but some were not applicable or inaccessible for direct download.

const logger = require('../utils/logger')('this-x-does-not-exist');
const request = require('request');

const TXDNE = {};

TXDNE._getX = function(rsp, url) {
    logger.info(`requesting image from: ${url}`);
    request.get({url, encoding: null}, (err, res, body) => {
        rsp.set('content-type', 'image/jpeg');
        rsp.set('content-length', body.length);
        rsp.set('connection', 'close');
        rsp.status(200).send(body);
        logger.info('sent the image');
    });
    return null; // we're async
};

/**
 * Gets an image of a person that does not exist
 */
TXDNE.getPerson = function() {
    return TXDNE._getX(this.response, 'http://www.thispersondoesnotexist.com/image');
};

/**
 * Gets an image of a cat that does not exist
 */
TXDNE.getCat = function() {
    return TXDNE._getX(this.response, 'http://www.thiscatdoesnotexist.com');
};

/**
 * Gets an image of a horse that does not exist
 */
TXDNE.getHorse = function() {
    return TXDNE._getX(this.response, 'http://www.thishorsedoesnotexist.com');
};

/**
 * Gets an image of an artwork that does not exist
 */
TXDNE.getArtwork = function() {
    return TXDNE._getX(this.response, 'https://thisartworkdoesnotexist.com');
};

/**
 * Gets an image of a waifu that does not exist
 */
TXDNE.getWaifu = function() {
    const r = Math.floor(Math.random() * 100000);
    return TXDNE._getX(this.response, `https://www.thiswaifudoesnotexist.net/example-${r}.jpg`);
};

/**
 * Gets an image of a fursona that does not exist
 */
TXDNE.getFursona = function() {
    const r = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return TXDNE._getX(this.response, `https://thisfursonadoesnotexist.com/v2/jpgs/seed${r}.jpg`);
};

/**
 * Gets an image of a pony that does not exist
 */
TXDNE.getPony = function() {
    const r = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    return TXDNE._getX(this.response, `https://thisponydoesnotexist.net/v1/w2x-redo/jpgs/seed${r}.jpg`);
};

/**
 * Gets an image of a home interior that does not exist
 */
TXDNE.getHomeInterior = function() {
    const options = ['hero', 'img1', 'img2', 'img3', 'img4'];
    const r = Math.floor(Math.random() * options.length);
    return TXDNE._getX(this.response, `https://thisrentaldoesnotexist.com/img-new/${options[r]}.jpg`);
};

/**
 * Gets an image of a congress person that does not exist
 */
TXDNE.getCongressPerson = function() {
    const r = String(Math.floor(Math.random() * 651)).padStart(5, '0');
    return TXDNE._getX(this.response, `https://vole.wtf/this-mp-does-not-exist/mp/mp${r}.jpg`);
};

module.exports = TXDNE;