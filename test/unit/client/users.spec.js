/* globals hex_sha512, $, expect */
describe.skip('users', function() {

    // need a test user account

    const SERVER_URL = 'http://localhost:8080';
    const LOGIN_RESP = 'Service'; // first word of the response

    const logout = function() {
        return $.ajax({
            method: 'POST',
            url: SERVER_URL + '/api/logout',
        });
    };


    const login = function(username, pass) {
        return $.ajax({
            url: SERVER_URL + '/api/?SESSIONGLUE=.sc1m16',
            method: 'POST',
            data: JSON.stringify({
                __h: hex_sha512(pass),
                __u: username.toLowerCase(),
                remember: true
            }),
            contentType: 'application/json; charset=utf-8',
            xhrFields: {
                withCredentials: true
            },
            headers: {
                // SESSIONGLUE: '.sc1m16',
                Accept: '*/*',
            },
            crossDomain: true
        });
    };
    
    // TODO ensure test order

    it('should login successfully', done => {
        login('hamid', 'very valid password')
            .done(resp => {
                expect(resp.substring(0,7)).to.be(LOGIN_RESP);
                done();
            })
            .fail(done);
    });

    it('should logout successfully', done => {
        logout()
            .done(resp => {
                expect(resp).to.be('you have been logged out');
                done();
            })
            .fail(done);
    });

    it('should not be able to login after logout', done => {
        login('hamid', 'arbitraryPassword')
            .done( () => {
                done('logged in.');
            })
            .fail( e => {
                // it should fail
                expect(e.responseText).to.be('Incorrect password');
                done();
            });
    });

});
