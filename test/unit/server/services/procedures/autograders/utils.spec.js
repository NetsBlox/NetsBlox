const testUtils = require("../../../../../assets/utils");

describe(testUtils.suiteName(__filename), function () {
  const assert = require("assert");
  const { isValidLti1Signature } = testUtils.reqSrc(
    "services/procedures/autograders/utils",
  );

  it("should return true if sig is valid", function () {
    const data = {
      tool_consumer_info_product_family_code: "ims",
      lti_version: "LTI-1p0",
      resource_link_title: "Test LTI Integration",
      context_title: "NetsBlox Autograder Test",
      roles: "Learner",
      tool_consumer_instance_description: "Coursera",
      tool_consumer_instance_guid: "ondemand.coursera.org",
      ext_basiclti_submit: "Launch Endpoint with BasicLTI Data",
      resource_link_id: "ondemand~ZNN12j8tEeuHtw6H03Fn9w!~ExMU0",
      lis_result_sourcedid:
        "ondemand~77f090c96d1791d8d113f1956d3b634a!~ZNN12j8tEeuHtw6H03Fn9w!~ExMU0!~WIvEF0zPEe6wxQ4RJkF_AQ",
      lis_outcome_service_url:
        "https://api.coursera.org/api/onDemandLtiOutcomes.v1",
      lti_message_type: "basic-lti-launch-request",
      tool_consumer_info_version: "1.1",
      custom_session_id: "euo3BD8tEeud7hKhBPpAyw",
      context_id: "ondemand~ZNN12j8tEeuHtw6H03Fn9w",
      context_label: "netsblox-autograder-test",
      custom_session_created_at: "1611092263963",

      oauth_callback: "about:blank",
      oauth_nonce: "96210441160725",
      oauth_consumer_key: "ConsumerKey!",
      oauth_signature: "bsFYIL5hzvF3g0/tC4TRfppyPSU=",
      oauth_signature_method: "HMAC-SHA1",
      oauth_version: "1.0",
      oauth_timestamp: "1694016392",
    };

    const secret = "ThisIsTheSecret!";
    assert(isValidLti1Signature(data, secret));
  });

  it("should validate invalid sig", function () {
    const data = {
      tool_consumer_info_product_family_code: "ims",
      lti_version: "LTI-1p0",
      oauth_signature: "bsFYIL5hzvF3g0/tC4TRfppyPSU=",
      resource_link_title: "Test LTI Integration",
      context_title: "NetsBlox Autograder Test",
      roles: "Learner",
      tool_consumer_instance_description: "Coursera",
      tool_consumer_instance_guid: "ondemand.coursera.org",
      oauth_consumer_key: "ConsumerKey!",
      ext_basiclti_submit: "Launch Endpoint with BasicLTI Data",
      resource_link_id: "ondemand~ZNN12j8tEeuHtw6H03Fn9w!~ExMU0",
      oauth_signature_method: "HMAC-SHA1",
      oauth_version: "1.0",
      oauth_timestamp: "1694016392",
      lis_result_sourcedid:
        "ondemand~77f090c96d1791d8d113f1956d3b634a!~ZNN12j8tEeuHtw6H03Fn9w!~ExMU0!~WIvEF0zPEe6wxQ4RJkF_AQ",
      lis_outcome_service_url:
        "https://api.coursera.org/api/onDemandLtiOutcomes.v1",
      oauth_nonce: "96210441160725",
      lti_message_type: "basic-lti-launch-request",
      oauth_callback: "about:blank",
      tool_consumer_info_version: "1.1",
      custom_session_id: "euo3BD8tEeud7hKhBPpAyw",
      context_id: "ondemand~ZNN12j8tEeuHtw6H03Fn9w",
      context_label: "netsblox-autograder-test",
      custom_session_created_at: "1611092263963",
    };

    const secret = "ThisIsNotTheSecret!";
    assert(isValidLti1Signature(data, secret));
  });
});
