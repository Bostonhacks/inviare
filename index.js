const axios = require('axios');
const yaml = require('js-yaml');
const express = require('express');
const multer  = require('multer');
const simpleParser = require('mailparser').simpleParser;
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Make sure this is set!

const app = express();
const upload = multer(); // Middleware to allow our endpoint to receive multipart/form-data
const TEAM_EMAILS = [];

axios
  .get('https://raw.githubusercontent.com/Bostonhacks/squadra/master/team.yml') // Look at this delicious backwards compatability
  .then(res => {
    const doc = yaml.safeLoad(res.data);
    doc.members.forEach(member => TEAM_EMAILS.push(`${member.name} <${member.mailgun.email}>`));
    console.log('Team emails set:', TEAM_EMAILS);
  })
  .catch(error => console.error(error));

app.get('/', (req, res) => res.send('Parser is running!'));

app.post('/parse', upload.none(), (req, res) => {
  console.log('Received Email:', req.body);

  const toField = ['Rudhra Raveendran <rooday@bu.edu>', 'Jennifer Roh <smroh17@bu.edu>', 'Rishab Nayak <rishab@bu.edu>'] //TEAM_EMAILS,

  // Attempt to parse email
  simpleParser(req.body.email, { skipImageLinks: true })
    .then(parsed => { // Parsing success! Use this information to reconstruct email
      // Convert parsed attachments to form SendGrid expects
      parsed.attachments.map(attachment => {
        return {
          content: attachment.content.toString('base64'), // MailParser turns content into a buffer, so we need to turn it back to base64
          filename: attachment.filename,
          type: attachment.contentType,
          disposition: attachment.contentDisposition,
          contentId: attachment.contentId
        }
      });

      return {
        from: 'BostonHacks <contact@bostonhacks.io>',
        to: toField,
        cc: parsed.cc,
        bcc: parsed.bcc,
        replyTo: parsed.from,
        subject: parsed.subject,
        text: parsed.text,
        html: parsed.html,
        attachments: parsed.attachments
      };
    })
    .catch(error => { // Parsing failure! Just use the text that SendGrid extracts so we have something
      console.error("Failed to parse email:", error);
      console.log("Sending email text as fallback");

      return {
        from: 'BostonHacks <contact@bostonhacks.io>',
        to: toField,
        replyTo: req.body.from,
        subject: req.body.subject,
        text: req.body.text
      };
    })
    .then(msg => { // Regardless of parsing status, we'll have something at this point so send it
      sgMail
        .sendMultiple(msg)
        .then(() => {
          console.log('Email forwarded!');
          res.send('Email forwarded!');
        })
        .catch(error => {
          console.error('Email forwarding failed:', error.response.body);
          res.status(500).send('Email forwarding failed!');
        });
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Example app listening on port ${port}!`));