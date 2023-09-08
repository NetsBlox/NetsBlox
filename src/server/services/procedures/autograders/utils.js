const { getAuthorizationHeader, SignatureMethod } = require("node-oauth1");
const crypto = require("node:crypto");

function isValidLti1Signature(ltiData, secret) {
  const expected = sign(ltiData, secret);
  const actual = ltiData.oauth_signature;
  return expected === actual;
}

function sign(parameters, secret) {
  const message = {
    action: "about:blank",
    method: "GET",
    parameters,
  };
  const accessor = {
    consumerSecret: secret,
  };
  return SignatureMethod.sign(message, accessor);
}

function sha1(content) {
  const hash = crypto.createHash("sha1");
  hash.update(content);
  return hash.digest("base64");
}

module.exports = { isValidLti1Signature, sha1 };
