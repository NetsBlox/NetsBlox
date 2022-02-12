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
    
};

/**
 * The number (out of six) of attempts at the daily puzzle remaining
 * @returns {Number} Number of attempts remaining
 */
DailyWordGuess.triesRemaining = function () {
    
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
        let existing = await DailyWordGuess._collection.findOne({
            date: (new Date()).toDateString()
        });

        if (existing != null) {
            logger.log('Existing word found');
            DailyWordGuess._dailyWord = existing.word;
            DailyWordGuess._dailyWordDate = new Date(existing.date);
        } else {
            logger.log('Generating new word');
            DailyWordGuess._dailyWord = WordGuess._getRandomCommonWord(5);
            DailyWordGuess._collection.insertOne({
                date: (new Date()).toDateString(),
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

module.exports = DailyWordGuess;