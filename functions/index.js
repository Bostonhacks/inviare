/* eslint-disable promise/no-nesting */
/* eslint-disable promise/always-return */
/* eslint-disable promise/catch-or-return */
const functions = require('firebase-functions');
require('dotenv').config();
const axios = require('axios');
const yaml = require('js-yaml');
const Busboy = require('busboy');
const simpleParser = require('mailparser').simpleParser;
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(functions.config().parser.sg_api_key); // Make sure this is set!

const SPAM_THRESHOLD = functions.config().parser.spam_threshold;
let TEAM_EMAILS = [];
let ROUTES = {};

// Fetch current team members
/*axios
    .get('https://raw.githubusercontent.com/Bostonhacks/squadra/master/team.yml') // Look at this delicious backwards compatability
    .then(res => {
        const doc = yaml.safeLoad(res.data);
        doc.routes.forEach(route => {
            // Create map of route to nice formatted address
            ROUTES[route.name] = route.formatted
        });
        TEAM_EMAILS = doc.members
            .filter(member => member.status !== "inactive") // Filter out inactive members
            .map(member => { // Keep only their name/email and routes
                const { email, routes } = member.sendgrid;
                return {
                    email: `${member.name} <${email}>`,
                    routes
                };
            })
        console.log('TEAM_EMAILS set:', TEAM_EMAILS);
        console.log('ROUTES set:', ROUTES)
    })
    .catch(error => console.error(error));*/

module.exports.parser = functions.https.onRequest((req, res) => {
    console.log('Received Email Buffer:', req.rawBody);

    const busboy = new Busboy({ headers: req.headers });
    const bussedEmail = {};

    busboy.on('field', (fieldname, value) => {
        bussedEmail[fieldname] = value;
    });

    busboy.on('finish', () => {
        console.log('Busboy finished:', bussedEmail);
        console.log(`Received spam_score: ${bussedEmail.spam_score}. spam_threshold: ${SPAM_THRESHOLD}`);

        // If spam_score is too high, drop it like its porn
        if (parseFloat(bussedEmail.spam_score) >= parseFloat(SPAM_THRESHOLD)) {
            console.log("Received Spam!");
            res.send("Sorry buddy gonna drop this one");
        } else {
            // Grab formatted fromField, fallbock to route
            const route = JSON.parse(bussedEmail.envelope).to[0];
            let fromField = route;
            if (ROUTES.hasOwnProperty(route)) {
                fromField = ROUTES[route];
            }

            // Send email only to relevant members
            const toField = ['Rishab Nayak <rishab@bu.edu>', 'Rudhra Raveendran <rooday@bu.edu>'];//TEAM_EMAILS.filter(member => member.routes.includes(route)).map(member => member.email);

            // Attempt to parse email
            simpleParser(bussedEmail.email, { skipImageLinks: true })
                .then(parsed => {
                    // Parsing success! Use this information to reconstruct email
                    console.log("Parsed email:", parsed);

                    // Convert parsed attachments to the form SendGrid expects
                    const attachments = parsed.attachments.map(attachment => {
                        return {
                            content: attachment.content.toString('base64'), // MailParser turns content into a buffer, so we need to turn it back to base64
                            filename: attachment.filename,
                            type: attachment.contentType,
                            disposition: attachment.contentDisposition,
                            contentId: attachment.contentId
                        }
                    });

                    return {
                        from: fromField,
                        to: toField,
                        replyTo: parsed.from.text, // Have to access text property as MailParser converts addresses into objects
                        cc: parsed.cc ? parsed.cc.text : undefined, // These address fields may not exist, so check for that
                        bcc: parsed.bcc ? parsed.bcc.text : undefined,
                        subject: parsed.subject,
                        text: parsed.text,
                        html: parsed.html ? parsed.html : parsed.textAsHtml, // This also may not exist, so use textAsHtml as fallback
                        attachments: attachments
                    };
                })
                .catch(error => {
                    // Parsing failure! Just use the text that SendGrid extracts so we have something
                    console.error("Failed to parse email:", error);
                    console.log("Sending email text as fallback");

                    return {
                        from: fromField,
                        to: toField,
                        replyTo: bussedEmail.from,
                        subject: bussedEmail.subject,
                        text: bussedEmail.text || '' // Fallback in case the email had no text
                    };
                })
                .then(msg => {
                    // Regardless of parsing status, we'll have something at this point so send it
                    sgMail
                        .sendMultiple(msg)
                        .then(() => {
                            console.log('Email forwarded!');
                            res.send('Email forwarded!');
                        })
                        .catch(error => {
                            console.error('Email forwarding failed:', error); // This is an error within the actual sendgrid-nodejs package
                            if (error.response) { // This is an error from the SendGrid API
                                console.error(error.response.body)
                            }
                            res.status(500).send('Email forwarding failed!');
                        });
                });
        }
    });

    busboy.end(req.rawBody);
});