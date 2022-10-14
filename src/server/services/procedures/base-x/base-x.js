/**
 * The BaseX Service provides access to an existing BaseX instance.
 *
 * @service
 * @category Utilities
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
    return this._baseXRequest(url, username, password);
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

    const hasTextContents = xml.children.length === 1 && xml.children[0].type === 'text';
    if (hasTextContents) {
        jsonml.push(toJsonML(xml.children[0]));
    } else {
        const childElements = xml.children.filter(child => child.type !== 'text');
        jsonml.push(...childElements.map(toJsonML));
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
    return this._baseXRequest(url, username, password);
};

BaseX._baseXRequest = async function(url, username, password) {
    const opts = {headers: {}};
    if (username && password) {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        opts.headers.Authorization = `Basic ${auth}`;
    }

    try {
        const response = await axios.get(url, opts);
        return this._parseResponse(response.data);
    } catch (err) {
        throw rewordError(err);
    }
};

function rewordError(err) {
    const isAxiosError = !!err.response;
    if (isAxiosError) {
        const {response} = err;
        return new Error(response.data);
    }
    return err;
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
