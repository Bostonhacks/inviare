require('dotenv').config();
const axios = require('axios');
const yaml = require('js-yaml');
const express = require('express');
const multer  = require('multer')
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
const upload = multer();
const TEAM_EMAILS = [];

axios.get('https://raw.githubusercontent.com/Bostonhacks/squadra/master/team.yml')
  .then(res => {
    const doc = yaml.safeLoad(res.data);
    doc.members.forEach(member => TEAM_EMAILS.push(`${member.name} <${member.mailgun.email}>`));
    console.log('Team emails set:', TEAM_EMAILS);
  })
  .catch(error => console.error(error));

app.get('/', (req, res) => res.send('Parser is running!'));

app.post('/parse', upload.none(), (req, res) => {
  console.log('Received Email:', req.body);

  const msg = {
    to: TEAM_EMAILS,
    from: 'BostonHacks <contact@bostonhacks.io>',
    replyTo: req.body.from,
    subject: req.body.subject,
    text: req.body.text,
    html: req.body.html,
  };

  sgMail
    .sendMultiple(msg)
    .then(() => {
      res.send('Email forwarded!');
    })
    .catch(error => {
      console.error(error);
      res.status(500).send('Email forwarding failed!');
    });
});


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Example app listening on port ${port}!`));