const mailer = require('./mailer');
const Logger = require('./logger');
const logger = new Logger('netsblox:bug-reporter');
const version = require('../package.json').version;
const snap2jsVersion = require('snap2js/package').version;
const request = require('request-promise');
const cloud = require('./cloud-client');
const fs = require('fs');
const path = require('path');
const {promisify} = require('util');
const writeFile = promisify(fs.writeFile);

const BugReporter = function() {
    this.maintainer = process.env.MAINTAINER_EMAIL;
    this.reportUrl = process.env.REPORT_URL;
    this.bugDir = process.env.BUG_DIR;
    if (this.reportUrl || this.maintainer) {
        const endpoints = [this.reportUrl, this.maintainer].filter(word => !!word).join(' and ');
        logger.trace(`sending bug reports to ${endpoints}`);
    } else {
        logger.warn('Not reporting bug reports. Set MAINTAINER_EMAIL or ' +
            'REPORT_URL in the environment to report bug reports.');
    }
};

BugReporter.prototype.reportInvalidSocketMessage = function(err, msg, socket) {
    const subject = 'Invalid Socket Message';
    const username = socket.username;
    const req = socket._socket.upgradeReq;
    const headerFields = [
        'user-agent',
        'sec-websocket-version',
        'sec-websocket-extensions',
        'accept-encoding',
        'accept-language'
    ];
    const headers = {};
    headerFields.forEach(header => headers[header] = req.headers[header]);

    const data = {
        filename: 'message.json',
        content: {
            bugType: 'SocketMessage',
            stackTrace: err.stack,
            error: err.message,
            timestamp: new Date(),
            username: username,
            uuid: socket.uuid,
            reqHeaders: headers,
            readyState: socket._socket.readyState,
            message: msg
        }
    };

    return this.createBody('parse socket message', err, username)
        .then(body => this.reportBug(subject, body, data))
        .catch(err => logger.error(err));
};

BugReporter.prototype.reportPotentialCompilerBug = function(err, block) {
    const subject = 'Potential Snap2Js Bug';
    const data = {
        // Add compiler version, netsblox version...
        filename: `block-${snap2jsVersion}.xml`,
        content: {
            bugType: 'Snap2Js',
            version: snap2jsVersion,
            error: err.message,
            timestamp: new Date(),
            stackTrace: err.stack,
            block: block
        }
    };

    const body = `Failed to compile block function: \n${err.stack.replace('\n', '\n\n')}`;
    this.reportBug(subject, body, data);
};

BugReporter.prototype.createBody = async function(action, err, username) {
    let body = `Failed to ${action}: \n${err.stack.replace('\n', '\n\n')}`;
    const email = await this.getUserEmail(username);
    if (email) {
        body += `\nUser email: ${email}`;
    }
    return body;
};

BugReporter.prototype.reportClientBug = function(socket, report) {
    const user = report.user;
    report.bugType = 'Client';
    const data = {
        filename: `bug-report-v${report.version}.json`,
        content: report
    };
    let subject = 'Bug Report' + (user ? ' from ' + user : '');

    if (report.isAutoReport) {
        subject = 'Auto ' + subject;
    }

    let body = 'Hello,\n\nA new bug report has been created' +
        (user !== null ? ' by ' + user : '') + ':\n\n---\n\n' +
        report.description + '\n\n---\n\n';

    return this.getUserEmail(report.user)
        .then(email => {
            if (email) body += '\n\nReporter\'s email: ' + email;
            return cloud.getRoomState(socket);
        })
        .then(roomState => {
            report.room = roomState;
            return this.reportBug(subject, body, data);
        })
        .catch(err => logger.error(err));
};

BugReporter.prototype.getUserEmail = function(username) {
    // TODO: update to use cloud client
    return Users.get(username)
        .then(user => {
            if (user) return user.email;
        });
};

BugReporter.prototype.reportBug = function(subject, body, data) {
    // email this to the maintainer
    // Add server version?
    data.content.serverVersion = version;
    if (this.reportUrl) {
        request({
            uri: this.reportUrl,
            method: 'POST',
            body: data.content,
            json: true
        }).catch(err =>
            logger.warn(`Failed to report bug to URL. ${err.message}`));
    }

    if (this.bugDir) {
        const filename = `${subject}-${version}-${Date.now()}.json`;
        writeFile(path.join(this.bugDir, filename), JSON.stringify(data.content));
    }

    if (this.maintainer) {
        subject += ` (${version})`;
        body += `\n\nNetsBlox Server ${version}`;
        data.content = JSON.stringify(data.content);
        const mailOpts = {
            from: 'bug-reporter',
            to: this.maintainer,
            subject: subject,
            html: `<p>${body.split('\n').join('<br/>')}</p>`,
            attachments: [data]
        };

        return mailer.sendMail(mailOpts);
    }

    if (!this.maintainer && !this.reportUrl && !this.bugDir) {
        logger.warn('Not reporting bug reports. Set MAINTAINER_EMAIL or ' +
            'REPORT_URL in the environment to report bug reports.');
    }
};

module.exports = new BugReporter();
