/**
 * Wordle-like game with daily challenges
 * 
 * @alpha
 * @service
 * @category Games
 */
const DailyWordGuess = {};
 
/**
 * Guess the word. Returns a list where each item is the feedback for
 * the corresponding character. Feedback is a "3" if the character is
 * correct, "2" if it is correct but in the wrong place, and "1" if the
 * letter is not present in the word.
 *
 * @param {BoundedString<5,5>} word Guess for this round
 */
DailyWordGuess.guess = function (word) {
    word = word.toLowerCase();
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
    
};

/**
 * Erase in-progress games and select a new word of the day
 */
DailyWordGuess._newDay = function () {
    
};

module.exports = DailyWordGuess;