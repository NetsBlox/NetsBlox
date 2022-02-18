const WordGuess = require('../word-guess/word-guess');
const GetStorage = require('./storage');
const logger = require('../utils/logger')('daily-word-guess');

/**
 * Wordle-like game with daily challenges
 * 
 * @alpha
 * @service
 * @category Games
 */
const DailyWordGuess = {};

DailyWordGuess._collection = GetStorage().usedWords;
DailyWordGuess._dailyWord = '';
DailyWordGuess._dailyWordDate = null;
DailyWordGuess._states = {};

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

    WordGuess._validateGuess(word, realWord);
    return WordGuess._calculateMatches(realWord, word);
};

/**
 * Give up on the current game and learn the target word
 * @returns {String} Target word of daily game
 */
DailyWordGuess.giveUp = function () {
    DailyWordGuess._setUserState(this.caller.clientId, { tries: 0 });
    return DailyWordGuess._getDailyWord();
};

/**
 * The number (out of six) of attempts at the daily puzzle remaining
 * @returns {Number} Number of attempts remaining
 */
DailyWordGuess.triesRemaining = function () {
    return DailyWordGuess._getUserState(this.caller.clientId).tries;    
};

/**
 * The amount of time in hours:minutes:seconds remaining to attempt the current day's puzzle
 * @returns {String} Amount of time remaining 
 */
DailyWordGuess.timeRemaining = function () {
    const currentTime = new Date();
    return (23 - currentTime.getHours()).toString().padStart(2,'0') + ':' + (59 - currentTime.getMinutes()).toString().padStart(2,'0') + ':' + (59 - currentTime.getSeconds()).toString().padStart(2,'0');
};

/**
 * Get the day's word
 */
DailyWordGuess._getDailyWord = async function () {
    if (DailyWordGuess._dailyWordDate == null || (DailyWordGuess._dailyWordDate.getDate() != new Date().getDate() && DailyWordGuess._dailyWordDate.getMonth() != new Date().getMonth())) {
        // Check if word of the day already in DB

        let date = new Date();
        date.setHours(0, 0, 0, 0);

        let existing = await DailyWordGuess._collection.findOne({
            date
        });

        if (existing != null) {
            logger.log('Existing word found');
            DailyWordGuess._dailyWord = existing.word;
            DailyWordGuess._dailyWordDate = new Date(existing.date);
        } else {
            logger.log('Generating new word');
            
            do {
                DailyWordGuess._dailyWord = WordGuess._getRandomCommonWord(5);

                let oldDate = new Date(date);
                oldDate.setFullYear(oldDate.getFullYear() - 1);

                // Test if word already used in past year
                existing = await DailyWordGuess._collection.findOne({
                    word: DailyWordGuess._dailyWord,
                    date: {
                        '$gte' : oldDate
                    }
                });
            } while (existing != null);
            
            DailyWordGuess._collection.insertOne({
                date,
                word: DailyWordGuess._dailyWord
            });
            DailyWordGuess._dailyWordDate = new Date();
        }

        logger.log(`Word for ${DailyWordGuess._dailyWordDate.toDateString()}: ${DailyWordGuess._dailyWord}`);

        // Clear game states
        DailyWordGuess._states = {};
    }

    return DailyWordGuess._dailyWord;
};

/**
 * Get the state of a client or create it if none exists
 * @param {String} clientId ID of client to get state for
 * @returns {Object} State of client
 */
DailyWordGuess._getUserState = function (clientId) {
    if (!Object.keys(DailyWordGuess._states).includes(clientId)) {
        DailyWordGuess._states[clientId] = {
            tries: 6
        };
    }

    return DailyWordGuess._states[clientId];
};

/**
 * Update the state of a client or create it if none exists
 * @param {String} clientId ID of client to get state for
 * @returns {Object} State of client
 */
DailyWordGuess._setUserState = function (clientId, newState) {
    if (!Object.keys(DailyWordGuess._states).includes(clientId)) {
        DailyWordGuess._states[clientId] = {
            tries: 6
        };
    }

    Object.assign(DailyWordGuess._states[clientId], newState);

    return DailyWordGuess._states[clientId];
};

module.exports = DailyWordGuess;