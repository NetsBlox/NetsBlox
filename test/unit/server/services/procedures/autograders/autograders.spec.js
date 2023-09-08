const utils = require("../../../../../assets/utils");

describe(utils.suiteName(__filename), function () {
  const Autograders = utils.reqSrc(
    "services/procedures/autograders/autograders",
  );
  const getDatabase = utils.reqSrc("services/procedures/autograders/storage");
  const MockService = require("../../../../../assets/mock-service");
  const assert = require("assert");
  let service;

  before(() => service = new MockService(Autograders));
  after(() => service.destroy());

  utils.verifyRPCInterfaces("Autograders", [
    ["getAutograders"],
    ["getAutograderConfig", ["name"]],
    ["createAutograder", ["configuration"]],
    ["getLTIConsumers", ["autograder"]],
    ["addLTIConsumer", ["autograder", "consumer"]],
    ["removeLTIConsumer", ["autograder", "consumer"]],
  ]);

  describe("getAutograders", function () {
    it("should require login", async function () {
      await assert.rejects(
        () => service.getAutograders(),
      );
    });
  });

  describe("getAutograderConfig", function () {
    it("should require login", async function () {
      await assert.rejects(
        () => service.getAutograderConfig(),
      );
    });
  });

  describe("createAutograder", function () {
    it("should require login", async function () {
      service.socket.username = null;
      await assert.rejects(
        () => service.createAutograder({}),
        /Login required./,
      );
    });

    it("should require name", async function () {
      service.socket.username = "brian";
      await assert.rejects(
        () => service.createAutograder({ assignments: [] }),
        /name is required/i,
      );
    });

    it("should require assignments", async function () {
      service.socket.username = "brian";
      await assert.rejects(
        () => service.createAutograder({ name: "TestGrader", assignments: [] }),
        /Assignments are required/i,
      );
    });

    it("should require names for assignments", async function () {
      service.socket.username = "brian";
      await assert.rejects(
        () =>
          service.createAutograder({
            name: "TestGrader",
            assignments: [
              {},
            ],
          }),
        /Assignment name is required/i,
      );
    });

    it("should require test type", async function () {
      service.socket.username = "brian";
      await assert.rejects(
        () =>
          service.createAutograder({
            name: "TestGrader2",
            assignments: [
              Object.entries({
                name: "SomeAssignment",
                tests: [
                  {},
                ],
              }),
            ],
          }),
        /Unspecified type of test/i,
      );
    });

    it("should require spec for custom block tests", async function () {
      service.socket.username = "brian";
      await assert.rejects(
        () =>
          service.createAutograder({
            name: "TestGrader2",
            assignments: [
              Object.entries({
                name: "SomeAssignment",
                tests: [
                  Object.entries({ type: "CustomBlockTest" }),
                ],
              }),
            ],
          }),
        /missing block spec/i,
      );
    });

    it("should require name for function tests", async function () {
      service.socket.username = "brian";
      await assert.rejects(
        () =>
          service.createAutograder({
            name: "TestGrader2",
            assignments: [
              Object.entries({
                name: "SomeAssignment",
                tests: [
                  {},
                ],
              }),
            ],
          }),
        /Unspecified type of test/i,
      );
    });

    it("should require function or inputs/outputs for tests", async function () {
      service.socket.username = "brian";
      await assert.rejects(
        () =>
          service.createAutograder({
            name: "TestGrader2",
            assignments: [
              Object.entries({
                name: "SomeAssignment",
                tests: [
                  Object.entries({
                    type: "CustomBlockTest",
                    spec: "someBlockSpec",
                  }),
                ],
              }),
            ],
          }),
        /must specify inputs and output or a function/i,
      );
    });

    it("should allow test w/ inputs, outputs", async function () {
      service.socket.username = "brian";
      await service.createAutograder({
        name: "TestGrader2",
        assignments: [
          Object.entries({
            name: "SomeAssignment",
            tests: [
              Object.entries({
                type: "CustomBlockTest",
                spec: "someBlockSpec",
                inputs: [1, 2, 3],
                output: true,
              }),
            ],
          }),
        ],
      });
    });
  });

  describe("LTI Consumers", function () {
    const getValidConfig = (name) => ({
      name,
      assignments: [
        Object.entries({
          name: "SomeAssignment",
          tests: [
            Object.entries({
              type: "CustomBlockTest",
              spec: "someBlockSpec",
              inputs: [1, 2, 3],
              output: true,
            }),
          ],
        }),
      ],
    });

    before(() => {
      service.socket.username = "brian";
      return utils.connect();
    });

    it("should be able to add consumers to old graders", async function () {
      service.socket.username = "brian";
      const name = "exampleGrader-" + Date.now();
      const extension = {
        type: "Autograder",
        name,
        author: service.socket.username,
        createdAt: new Date(),
        version: "0.0.1",
      };
      const { autograders } = getDatabase();
      await autograders.insertOne(extension);

      const consumer = "testConsumer";
      await service.addLTIConsumer(name, consumer);
      const grader = await autograders.findOne(extension);
      assert.equal(grader.ltiConsumers.length, 1);
    });

    it("should be able to add consumers to new graders", async function () {
      const name = "AddConsumerTest";
      await service.createAutograder(getValidConfig(name));

      const consumer = "testConsumer";
      await service.addLTIConsumer(name, consumer);

      const { autograders } = getDatabase();
      const grader = await autograders.findOne({ name });
      assert.equal(grader.ltiConsumers.length, 1);
    });

    it("should escape spaces, etc, in launch URL", async function () {
      const name = "Escape Spaces";
      await service.createAutograder(getValidConfig(name));

      const consumer = "testConsumer";
      const consumerData = await service.addLTIConsumer(name, consumer);
      assert(!consumerData.launchUrl.includes(" "));
    });

    it("should not add duplicate consumer", async function () {
      const name = "DuplicateConsumerTest";
      await service.createAutograder(getValidConfig(name));

      const consumer = "testConsumer";
      await service.addLTIConsumer(name, consumer);

      await assert.rejects(service.addLTIConsumer(name, consumer));

      const { autograders } = getDatabase();
      const grader = await autograders.findOne({ name });
      assert.equal(grader.ltiConsumers.length, 1);
    });

    it("should remove consumer", async function () {
      const name = "RemoveConsumerTest";
      await service.createAutograder(getValidConfig(name));

      const consumer = "testConsumer";
      await service.addLTIConsumer(name, consumer);
      await service.removeLTIConsumer(name, consumer);

      const { autograders } = getDatabase();
      const grader = await autograders.findOne({ name });
      assert.equal(grader.ltiConsumers.length, 0);
    });

    it("should list consumers", async function () {
      const name = "ListConsumersTest";
      await service.createAutograder(getValidConfig(name));

      const consumers = [...new Array(20)].map((_, i) => `consumer_${i}`);
      await Promise.all(consumers.map((c) => service.addLTIConsumer(name, c)));
      const consumerList = await service.getLTIConsumers(name);

      assert.equal(consumerList.length, consumers.length);
    });
  });
});
