/**
 * A Wordle-like word guessing game with a single daily word for all users.
 *
 * @alpha
 * @service
 * @category Games
 */
const { RPCError } = require('../utils');
const WordGuess = require('../word-guess/word-guess');
const GetStorage = require('./storage');
const logger = require('../utils/logger')('daily-word-guess');
const DailyWordGuess = {};


/**
 * Guess the word. Returns a list where each item is the feedback for
 * the corresponding character. Feedback is a "3" if the character is
 * correct, "2" if it is correct but in the wrong place, and "1" if the
 * letter is not present in the word.
 *
 * @param {BoundedString<5,5>} word Guess for this round
 */
DailyWordGuess.guess = async function (word) {
    word = word.toLowerCase();
    let realWord = await DailyWordGuess._getDailyWord();
    let prevState = await DailyWordGuess._getUserState(this.caller);

    if (prevState.complete) {
        throw new RPCError('Word already guessed correctly. Come back tomorrow for a new word!');
    }

    // Reject after game over
    if (prevState.tries <= 0) {
        throw new RPCError('No attempts remaining. Better luck tomorrow!');
    }

    WordGuess._validateGuess(word, realWord);

    const matches = WordGuess._calculateMatches(realWord, word);
    const complete = matches.every(num => num === 3);

    await DailyWordGuess._setUserState(this.caller, { complete, tries: prevState.tries - 1 });

    return matches;
};

/**
 * Give up on the current game and learn the target word
 * @returns {String} Target word of daily game
 */
DailyWordGuess.giveUp = async function () {
    await DailyWordGuess._setUserState(this.caller, { tries: 0 });
    return DailyWordGuess._getDailyWord();
};

/**
 * The number (out of six) of attempts at the daily puzzle remaining
 * @returns {Number} Number of attempts remaining
 */
DailyWordGuess.triesRemaining = async function () {
    return (await DailyWordGuess._getUserState(this.caller)).tries;
};

/**
 * The amount of time in hours:minutes:seconds remaining to attempt the current day's puzzle
 * @returns {String} Amount of time remaining 
 */
DailyWordGuess.timeRemaining = function () {
    const currentTime = new Date();
    const hours = 23 - currentTime.getHours();
    const minutes = 59 - currentTime.getMinutes();
    const seconds = 59 - currentTime.getSeconds();
    const format = num => num.toString().padStart(2, '0');

    return [hours, minutes, seconds].map(format).join(':');
};

/**
 * Get a list of all the possible words
 * @returns {Array<String>} word list
 */
DailyWordGuess.getWordList = function () {
    return WordGuess.getWordList(5);
};

/**
 * Get the day's word
 */
DailyWordGuess._getDailyWord = async function () {
    const date = DailyWordGuess._getTodaysDate();
    const collection = GetStorage().dailyWords;

    const doc = await collection.findOne({ date });
    if (!doc) {
        return await DailyWordGuess._generateDailyWord(collection);
    }
    return doc.word;
};

DailyWordGuess._generateDailyWord = async function (collection) {

    // Get a word not used in the past year
    const lastYear = DailyWordGuess._getTodaysDate();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const wordDocs = await collection.find({ date: { '$gte': lastYear } }).toArray();
    const usedWords = new Set(wordDocs.map(doc => doc.word));

    const word = WordGuess._getRandomCommonWord(5, word => !usedWords.has(word));

    // Save the word in the database. If a word was already added concurrently
    // return that one instead of ours
    const date = DailyWordGuess._getTodaysDate();
    const query = { date };
    const update = { '$setOnInsert': { word, date } };
    const options = { upsert: true };
    const { value } = await collection.findOneAndUpdate(query, update, options);
    return value?.word || word;
};

DailyWordGuess._getTodaysDate = function () {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

/**
 * Get the state of a client or create it if none exists
 * @param {String} caller caller to retrieve state for
 * @returns {Object} State of client
 */
DailyWordGuess._getUserState = async function (caller) {
    const { games } = GetStorage();
    const date = DailyWordGuess._getTodaysDate();
    const query = { date, caller: caller.username || caller.clientId };
    const initialState = Object.assign({ tries: 6 }, query);
    const update = { '$setOnInsert': initialState };
    const options = { upsert: true };
    const { value } = await games.findOneAndUpdate(query, update, options);

    return value || initialState;
};

/**
 * Update the state of a client or create it if none exists
 * @param {String} caller caller to retrieve state for
 * @returns {Object} State of client
 */
DailyWordGuess._setUserState = async function (caller, newState) {
    const { games } = GetStorage();

    const date = DailyWordGuess._getTodaysDate();
    const query = { date, caller: caller.username || caller.clientId };
    const update = { '$set': newState, '$setOnInsert': query };
    const options = { upsert: true };
    await games.updateOne(query, update, options);
};

module.exports = DailyWordGuess;
