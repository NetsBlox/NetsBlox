/**
 * The Autograders service enables users to create custom autograders for
 * use within NetsBlox.
 *
 * For more information, check out https://github.com/NetsBlox/NetsBlox/wiki/Autograders-Overview
 *
 * @service
 */
const assert = require('assert');
const _ = require('lodash');
const MONGODB_DOC_TOO_LARGE = 'Attempt to write outside buffer bounds';
const getDatabase = require('./storage');
const Integrations = require('./integrations');

const validateName = name => {
    const validRegex = /^[a-zA-Z][a-zA-Z0-9_ :-]*$/;
    if (!validRegex.test(name)) {
        throw new Error('Invalid name. Must start with a letter and be alphanumeric (+ underscores, dashes, and colons)');
    }
};

const preprocessConfig = config => {
    if (!config.assignments) {
        throw new Error('No assignments provided.');
    }
    config.assignments = config.assignments.map(assignment => {
        const newAssignment = _.fromPairs(assignment);
        if (newAssignment.tests) {
            newAssignment.tests = newAssignment.tests.map(_.fromPairs);
        }
        return newAssignment;
    });
    validateConfig(config);
    return config;
};

const validateAssignment = assignment => {
    assert(assignment.name, 'Assignment name is required.');
    assert(assignment['starter template'] || assignment.tests, 'Assignment must have starter template and/or tests.');
    assignment.tests.forEach(test => {
        assert(test.type, 'Unspecified type of test!');
    });

    const integrationNames = (assignment.integrations || []).map(name => name.toLowerCase());
    integrationNames
        .map(name => Integrations.get(name))
        .forEach(integration => integration.validate(assignment));
};

const validateConfig = config => {
    validateName(config.name);
    config.assignments.forEach(validateAssignment);
    assert(config.name);
};

const ensureLoggedIn = function(caller) {
    if (!caller.username) {
        throw new Error('Login required.');
    }
};
const Autograders = {};

/**
 * Create an autograder using the supplied configuration.
 *
 * @param {Object} configuration
 */
Autograders.createAutograder = async function(config) {
    ensureLoggedIn(this.caller);
    config = preprocessConfig(config);
    const storage = getDatabase();
    const author = this.caller.username;
    const extension = {
        type: 'Autograder',
        name: config.name,
        author,
        createdAt: new Date(),
        version: '0.0.1',
        config,
    };
    const query = {$set: extension};
    try {
        await storage.updateOne({author, name: config.name}, query, {upsert: true});
    } catch (err) {
        if (err.message === MONGODB_DOC_TOO_LARGE) {
            throw new Error('Upload is too large. Please decrease the size and try again.');
        }
        throw err;
    }
};

/**
 * List the autograders for the given user.
 */
Autograders.getAutograders = async function() {
    ensureLoggedIn(this.caller);
    const author = this.caller.username;
    const storage = getDatabase();
    const options = {
        projection: {name: 1}
    };
    const autograders = await storage.find({author}, options).toArray();
    return autograders.map(grader => grader.name);
};

/**
 * Fetch the autograder configuration.
 *
 * @param {String} name
 */
Autograders.getAutograderConfig = async function(name) {
    ensureLoggedIn(this.caller);
    const storage = getDatabase();
    const author = this.caller.username;
    const autograder = await storage.findOne({author, name});
    if (!autograder) {
        throw new Error('Autograder not found.');
    }
    return autograder.config;
};

module.exports = Autograders;
