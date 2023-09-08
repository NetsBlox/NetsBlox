const assert = require("assert");

class IntegrationValidationError extends Error {
  constructor(integration, message) {
    super(`${message}. (Required for ${integration} integration)`);
  }
}

class CourseraValidationError extends IntegrationValidationError {
  constructor(message) {
    super("coursera", message);
  }
}

class CourseraKeyError extends CourseraValidationError {
  constructor(name, field) {
    const message = `"${name}" is missing ${field} field.`;
    super("coursera", message);
  }
}

class CourseraIntegration {
  constructor() {
    this.name = "coursera";
  }

  validate(config) {
    config.assignments.forEach((assignment) => {
      assert(
        assignment.CourseraAssignmentKey,
        new CourseraKeyError(assignment.name, "CourseraAssignmentKey"),
      );
      assignment.tests.forEach((test, index) => {
        const name = `Test #${index + 1} for ${assignment.name}`;
        assert(
          test.CourseraPartID,
          new CourseraKeyError(name, "CourseraPartID"),
        );
      });
    });
  }
}

module.exports = {
  get: function (name) {
    if (name === "coursera") {
      return new CourseraIntegration();
    }
    throw new Error(
      `"${name}" is not a valid integration. Did you mean "coursera"?`,
    );
  },
  errors: {
    CourseraKeyError,
  },
};
