/**
 * The BaseX Service provides access to an existing BaseX instance.
 *
 * @alpha
 * @service
 * @category Database
 */
const axios = require('axios');
const parseXml = require('@rgrove/parse-xml');
const BaseX = {};

/**
 * Evaluate an XQuery expression.
 *
 * @param {String} url
 * @param {String} database
 * @param {String} query
 * @param {String=} username
 * @param {String=} password
 */
BaseX.query = async function(url, database, query, username, password) {
    url = `${url}/rest/${database}?query=${encodeURIComponent(query)}`;
    return baseXRequest(url, username, password);
};

function toJsonML(xml) {
    if (xml.type === 'text') {
        return xml.text;
    }
    const name = xml.type === 'element' ? xml.name : xml.type;
    const jsonml = [name];

    const hasAttributes = Object.keys(xml.attributes || {}).length > 0;
    if (hasAttributes) {
        jsonml.push(xml.attributes);
    }

    const hasTextContents = xml.children.length && xml.children[0].type === 'text';
    if (hasTextContents) {
        jsonml.push(toJsonML(xml.children[0]));
    } else {
        jsonml.push(...xml.children.map(toJsonML));
    }

    return jsonml;
}

/**
 * Execute a single database command.
 *
 * A list of commands can be found at http://docs.basex.org/wiki/Commands
 *
 * @param {String} url
 * @param {String} command
 * @param {String=} username
 * @param {String=} password
 */
BaseX.command = function(url, command, username, password) {
    url = `${url}/rest?command=${encodeURIComponent(command)}`;
    return baseXRequest(url, username, password);
};

async function baseXRequest(url, username, password) {
    const opts = {headers: {}};
    if (username && password) {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        opts.headers.Authorization = `Basic ${auth}`;
    }

    try {
        const response = await axios.get(url, opts);
        return this._parseResponse(response.data);
    } catch (err) {
        throw new Error(rewordError(err));
    }
}

function rewordError(err) {
    const {response} = err;
    return response.data;
}

BaseX._parseResponse = function(data) {
    const isXmlData = typeof data === 'string' && data.startsWith('<');
    if (isXmlData) {
        const xml = parseXml(`<root>${data}</root>`);
        const results = toJsonML(xml.children[0]).slice(1);
        return results.length === 1 ? results.pop() : results;
    } else {
        return data;
    }
};

module.exports = BaseX;
