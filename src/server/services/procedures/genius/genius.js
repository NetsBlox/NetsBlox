/**
 * The Genius service provides access to the Genius API, the world's
 * biggest collection of song lyrics and musical knowledge.
 *
 * @service
 */
const {parse: parseHTML} = require('node-html-parser');
const ApiConsumer = require('../utils/api-consumer');
const {GeniusKey} = require('../utils/api-key');
const baseUrl = 'https://api.genius.com/';
const days = 24 * 60 * 60;
const Genius = new ApiConsumer('Genius', baseUrl, {cache: {ttl: 7*days}});
ApiConsumer.setRequiredApiKey(Genius, GeniusKey);
const prepare = require('./data-prep');

Genius._requestData = async function(options) {
    options.headers = options.headers || {};
    options.headers.Authorization = `Bearer ${this.apiKey.value}`;
    try {
        return await ApiConsumer.prototype._requestData.call(this, options);
    } catch (err) {
        throw new Error('Song or artist not found.');
    }
};

/**
 * Search for a song.
 *
 * @param{String} query
 * @returns{Array<Object>}
 */
Genius.searchSongs = async function(query) {
    const response = await this._requestData({
        path: 'search',
        queryString: `q=${encodeURIComponent(query)}`,
    });
    return response.response.hits.map(hit => prepare.SongSearchResult(hit.result));
};

/**
 * Get information about a given song.
 *
 * @param{BoundedInteger<1>} ID
 * @returns{Array<Object>}
 */
Genius.getSong = async function(id) {
    const {response} = await this._requestData({
        path: `songs/${id}`,
        queryString: 'text_format=plain',
    });
    return prepare.Song(response.song);
};

/**
 * Get information about a given artist.
 *
 * @param{BoundedInteger<1>} ID
 * @returns{Array<Object>}
 */
Genius.getArtist = async function(id) {
    const {response} = await this._requestData({
        path: `artists/${id}`,
        queryString: 'text_format=plain',
    });
    return prepare.Artist(response.artist);
};

/**
 * Get a list of songs performed by a given artist.
 *
 * @param{BoundedInteger<1>} ID
 * @returns{Array<Object>}
 */
Genius.getSongsByArtist = async function(id) {
    const {response} = await this._requestData({
        path: `artists/${id}/songs`,
        queryString: 'text_format=plain&per_page=50&sort=popularity',
    });
    return response.songs.map(prepare.SongSearchResult);
};

/**
 * Get the lyrics for a given song.
 *
 * @param{BoundedInteger<1>} ID
 * @returns{String}
 */
Genius.getSongLyrics = async function(id) {
    // This approach is based off the one used by lyricsgenius (python module).
    // It's a bit ugly as it fetches the HTML for the lyrics and scrapes it...
    const {response} = await this._requestData({
        path: `songs/${id}`,
        queryString: 'text_format=plain',
    });
    if (!response.song.path) {
        throw new Error(`No lyrics available for ${response.song.title}`);
    }

    const baseUrl = 'https://genius.com';
    const lyricsHTML = await this._requestData({
        baseUrl,
        path: response.song.path,
    });
    try {
        return this._parseLyrics(lyricsHTML);
    } catch (err) {
        if (err instanceof LyricsSectionNotFound) {
            const url = baseUrl + response.song.path;
            throw new Error(`Could not find the lyrics section.\nPlease report this if the song has lyrics.\nSong URL: ${url}`);
        }
    }
};

Genius._parseLyrics = function(html) {
    const doc = parseHTML(html);
    const isLyricsElement = node => {
        const isDiv = node.tagName === 'DIV';
        if (!isDiv) return false;

        const classes = node.classList;
        if (!classes) return false;

        for (let className of classes.values()) {
            if (className.startsWith('Lyrics__Root') || className === 'lyrics') {
                return true;
            }
        }

        return false;
    };
    const lyricsElement = findElement(doc, isLyricsElement);
    if (!lyricsElement) throw LyricsSectionNotFound();
    return lyricsElement.text;
};

function findElement(node, fn) {
    if (fn(node)) return node;
    for (let i = 0; i < node.childNodes.length; i++) {
        const match = findElement(node.childNodes[i], fn);
        if (match) {
            return match;
        }
    }
}

class LyricsSectionNotFound extends Error {}

module.exports = Genius;
