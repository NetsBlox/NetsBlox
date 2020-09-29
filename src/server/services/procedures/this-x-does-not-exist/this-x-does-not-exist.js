/**
 * This service uses Artificial Intelligence (AI) to make random, realistic images.
 * For a list of example websites, see https://thisxdoesnotexist.com/.
 * These are typically made by a Generative Adversarial neural Network (GAN).
 * Put simply, this involves two AIs: one to make images and another to guess if they're real or fake, and making them compete to mutually improve.
 * For more information, see https://en.wikipedia.org/wiki/Generative_adversarial_network.
 * 
 * @alpha
 * @service
 * @category ArtificialIntelligence
 */
'use strict';

// I got the list of X to support from: https://thisxdoesnotexist.com/ and a few reddit pages.
// most are supported, but some were not applicable or inaccessible for direct download.

const logger = require('../utils/logger')('this-x-does-not-exist');
const axios = require('axios');

const TXDNE = {};

TXDNE._getX = async function(rsp, url) {
    logger.info(`requesting image from: ${url}`);
    let resp = await axios({url, method: 'GET', responseType: 'arraybuffer'});
    
    rsp.set('content-type', 'image/jpeg');
    rsp.set('content-length', resp.data.length);
    rsp.set('connection', 'close');

    logger.info('sent the image');
    return rsp.status(200).send(resp.data);
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