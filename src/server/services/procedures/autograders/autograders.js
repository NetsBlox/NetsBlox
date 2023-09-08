/**
 * The Autograders service enables users to create custom autograders for
 * use within NetsBlox.
 *
 * For more information, check out https://editor.netsblox.org/docs/services/Autograders/index.html
 *
 * @service
 * @category Utilities
 */
const assert = require("assert");
const uuid = require("uuid");
const _ = require("lodash");
const MONGODB_DOC_TOO_LARGE = "Attempt to write outside buffer bounds";
const getDatabase = require("./storage");
const Integrations = require("./integrations");
const TEST_TYPES = ["CustomBlockTest"];
const SERVICES_URL = process.env.SERVER_URL;

const validateName = (name) => {
  const validRegex = /^[a-zA-Z][a-zA-Z0-9_ :-]*$/;
  if (!validRegex.test(name)) {
    throw new Error(
      "Invalid name. Must start with a letter and be alphanumeric (+ underscores, dashes, and colons)",
    );
  }
};

const preprocessConfig = (config) => {
  if (!config.assignments) {
    throw new Error("No assignments provided.");
  }
  config.assignments = config.assignments.map((assignment) => {
    const newAssignment = _.fromPairs(assignment);
    if (newAssignment.tests) {
      newAssignment.tests = newAssignment.tests.map(_.fromPairs);
    }
    return newAssignment;
  });
  validateConfig(config);
  return config;
};

const validateAssignment = (assignment) => {
  assert(assignment.name, "Assignment name is required.");
  assert(
    assignment["starter template"] || assignment.tests,
    "Assignment must have starter template and/or tests.",
  );
  assignment.tests.forEach((test) => {
    validateTest(test);
  });

  const integrationNames = (assignment.integrations || []).map((name) =>
    name.toLowerCase()
  );
  integrationNames
    .map((name) => Integrations.get(name))
    .forEach((integration) => integration.validate(assignment));
};

const validateConfig = (config) => {
  assert(config.name, "Name is required.");
  validateName(config.name);
  assert(config.assignments.length > 0, "Assignments are required.");
  config.assignments.forEach(validateAssignment);
  assert(config.name);
};

const validateTest = (testConfig) => {
  assert(testConfig.type, 'Unspecified type of test. Requires "type" field');
  assert(
    TEST_TYPES.includes(testConfig.type),
    `Unsupported test type: ${testConfig.type}`,
  );

  if (testConfig.type === "CustomBlockTest") {
    assert(
      testConfig.spec,
      'Custom block test is missing block spec. Requires "spec" field',
    );
    const isSimpleTest = testConfig.hasOwnProperty("inputs") &&
      testConfig.hasOwnProperty("output");
    assert(
      isSimpleTest || testConfig.function,
      "Test must specify inputs and output or a function",
    );
    if (!isSimpleTest) {
      assert(
        testConfig.name,
        "Names are required when using a custom test function",
      );
    }
  }
};

const ensureLoggedIn = function (caller) {
  if (!caller.username) {
    throw new Error("Login required.");
  }
};
const Autograders = {};

/**
 * Create an autograder using the supplied configuration.
 *
 * @param {Object} configuration
 */
Autograders.createAutograder = async function (config) {
  ensureLoggedIn(this.caller);
  config = preprocessConfig(config);
  const { autograders } = getDatabase();
  const author = this.caller.username;
  const extension = {
    type: "Autograder",
    name: config.name,
    author,
    createdAt: new Date(),
    version: "0.0.1",
    config,
    ltiConsumers: [],
  };

  const query = { $set: extension };
  try {
    await autograders.updateOne({ author, name: config.name }, query, {
      upsert: true,
    });
  } catch (err) {
    if (err.message === MONGODB_DOC_TOO_LARGE) {
      throw new Error(
        "Upload is too large. Please decrease the size and try again.",
      );
    }
    throw err;
  }
};

/**
 * Add an LTI (v1.1) consumer to an existing autograder.
 *
 * @category LTI
 * @param {String} autograder - name of the autograder to update
 * @param {String} consumer - name of the consumer to add (eg, Coursera)
 */
Autograders.addLTIConsumer = async function (autograder, consumer) {
  ensureLoggedIn(this.caller);
  const { autograders } = getDatabase();
  const author = this.caller.username;
  try {
    const secret = uuid.v4();
    const consumerData = {
      name: consumer,
      secret,
    };
    // Add it if ltiConsumers exists and doesn't contain it
    const result = await autograders.updateOne(
      {
        author,
        name: autograder,
        ltiConsumers: { $not: { $elemMatch: { name: consumer } } },
      },
      { $push: { ltiConsumers: consumerData } },
    );

    if (result.modifiedCount === 0) {
      // Check if the autograder:
      //  - doesn't exist
      //  - already contains the consumer
      //  - needs to be updated from the old format
      const grader = await autograders.findOne(
        { author, name: autograder },
      );
      if (!grader) {
        throw new Error("Autograder not found.");
      } else if (grader.ltiConsumers) {
        throw new Error(`LTI Consumer already exists: ${consumer}`);
      } else {
        await autograders.updateOne(
          { author, name: autograder, ltiConsumers: { $exists: false } },
          { $set: { ltiConsumers: [consumerData] } },
        );
      }
    }

    const launchUrl = `${SERVICES_URL}/routes/autograders/v2/lti/v1.1/user/${
      encodeURIComponent(author)
    }/${encodeURIComponent(autograder)}/launch`;

    return {
      launchUrl,
      consumerKey: consumer,
      secret,
    };
  } catch (err) {
    if (err.message === MONGODB_DOC_TOO_LARGE) {
      throw new Error(
        "Upload is too large. Please decrease the size and try again.",
      );
    }
    throw err;
  }
};

/**
 * List LTI (v1.1) consumers for an existing autograder.
 *
 * @category LTI
 * @param {String} autograder - name of the autograder to update
 */
Autograders.getLTIConsumers = async function (autograder) {
  ensureLoggedIn(this.caller);
  const { autograders } = getDatabase();
  const author = this.caller.username;
  const grader = await autograders.findOne(
    { author, name: autograder },
  );

  if (!grader) {
    throw new Error("Autograder not found.");
  }

  const consumers = grader.ltiConsumers || [];
  return consumers.map((c) => c.name);
};

/**
 * Remove an LTI (v1.1) consumer from an existing autograder.
 *
 * @category LTI
 * @param {String} autograder - name of the autograder to update
 * @param {String} consumer - name of the consumer to add (eg, Coursera)
 */
Autograders.removeLTIConsumer = async function (autograder, consumer) {
  ensureLoggedIn(this.caller);
  const { autograders } = getDatabase();
  const author = this.caller.username;
  const grader = await autograders.findOne(
    { author, name: autograder },
  );

  if (!grader) {
    throw new Error("Autograder not found.");
  }

  const consumers = grader.ltiConsumers || [];
  const consumerData = consumers.find((c) => c.name === consumer);
  if (consumerData) {
    await autograders.updateOne(
      { author, name: autograder },
      {
        $pull: { ltiConsumers: consumerData },
      },
    );
  }
};

/**
 * List the autograders for the given user.
 */
Autograders.getAutograders = async function () {
  ensureLoggedIn(this.caller);
  const author = this.caller.username;
  const { autograders } = getDatabase();
  const options = {
    projection: { name: 1 },
  };
  const graders = await autograders.find({ author }, options).toArray();
  return graders.map((grader) => grader.name);
};

/**
 * Fetch the autograder configuration.
 *
 * @param {String} name
 */
Autograders.getAutograderConfig = async function (name) {
  ensureLoggedIn(this.caller);
  const author = this.caller.username;
  const { autograders } = getDatabase();
  const autograder = await autograders.findOne({ author, name });
  if (!autograder) {
    throw new Error("Autograder not found.");
  }
  return autograder.config;
};

module.exports = Autograders;
