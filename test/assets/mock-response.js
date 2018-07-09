var MockResponse = function() {
    this.code = null;
    this.response = null;
    this.headersSent = false;
    this.headers = {};
};

MockResponse.prototype.set = function(header, value) {
    this.headers[header] = value;
    return this;
};

MockResponse.prototype.status = function(code) {
    this.code = code;
    return this;
};

MockResponse.prototype.send = function(text) {
    this.response = text;
    this.headersSent = true;
    return this;
};

MockResponse.prototype.json = MockResponse.prototype.send;

module.exports = MockResponse;
