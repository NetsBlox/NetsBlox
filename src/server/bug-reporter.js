const mailer = require('./mailer');
const Users = require('./storage/users');
const version = require('./server-utils').version;
const snap2jsVersion = require('snap2js/package').version;

const BugReporter = function() {
    this.maintainer = process.env.MAINTAINER_EMAIL;
};

BugReporter.prototype.reportPotentialCompilerBug = function(err, block, ctx) {
    const subject = 'Potential Snap2Js Bug';
    const username = ctx.socket.username;
    const data = {
        // Add compiler version, netsblox version...
        filename: `block-${snap2jsVersion}.xml`,
        content: block
    };
    let body = `Failed to compile block function: \n${err.stack.replace('\n', '\n\n')}`;

    return this.getUserEmail(username)
        .then(email => {
            if (email) {
                body += `\nUser email: ${email}`;
            }
            return this.reportBug(subject, body, data);
        });
};

BugReporter.prototype.reportClientBug = function(report) {
    const user = report.user;
    const data = {
        filename: `bug-report-v${report.version}.json`,
        content: JSON.stringify(report)
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
            if (email) body += '\n\nReporter\'s email: ' + user.email;
            return this.reportBug(subject, body, data);
        });
};

BugReporter.prototype.getUserEmail = function(username) {
    return Users.get(username)
        .then(user => {
            if (user) return user.email;
        });
};

BugReporter.prototype.reportBug = function(subject, body, data) {
    // email this to the maintainer
    // Add server version?
    subject += ` (${version})`;
    body += `\n\nNetsBlox Server ${version}`;
    if (this.maintainer) {
        const mailOpts = {
            from: 'bug-reporter@netsblox.org',
            to: this.maintainer,
            subject: subject,
            markdown: body,
            attachments: [data]

        };

        return mailer.sendMail(mailOpts);
    } else {
        this._logger.warn('No maintainer email set! Bug reports will ' +
            'not be recorded until MAINTAINER_EMAIL is set in the env!');
    }
};

module.exports = new BugReporter();
