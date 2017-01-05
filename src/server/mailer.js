var nodemailer = require('nodemailer'),
    markdown = require('nodemailer-markdown').markdown,
    transporter = nodemailer.createTransport();  // TODO: Change to smtp

transporter.use('compile', markdown());

module.exports = {
    sendMail: function(opts) {
        opts.from = opts.from || 'no-reply@netsblox.org';
        return transporter.sendMail(opts);
    }
};
