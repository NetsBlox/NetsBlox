const testUtils = require("../../../../../assets/utils");

describe(testUtils.suiteName(__filename), function () {
  const assert = require("assert");
  const routes = testUtils.reqSrc("services/procedures/autograders/routes");
  const getDatabase = testUtils.reqSrc(
    "services/procedures/autograders/storage",
  );
  const request = require("supertest");

  before(async () => testSuite = await testUtils.TestSuiteBuilder().setup());
  after(() => testSuite.takedown());

  it("should list autograders by author", async function () {
    const storage = getDatabase().autograders;
    await storage.insertOne({ name: "test1", author: "brian" });
    await storage.insertOne({ name: "test10", author: "notBrian" });
    const response = await request(routes)
      .get("/brian/");
    const names = JSON.parse(response.text);

    assert(names.includes("test1"));
    assert(!names.includes("test10"));
    assert.equal(names.length, 1);
  });

  it("should return autograder config", async function () {
    const storage = getDatabase().autograders;
    const config = { name: "testConfig", assignments: [] };
    const autograder = { name: "testConfig", author: "brian", config };
    await storage.insertOne(autograder);

    const response = await request(routes)
      .get(`/${autograder.author}/${autograder.name}/config.json`);
    const data = JSON.parse(response.text);

    assert.deepEqual(data, config);
  });
});
