require('dotenv').config();
const express = require('express');
const multer  = require('multer')
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
const upload = multer();

app.get('/', (req, res) => res.send('Parser is running!'));

app.post('/parse', upload.none(), (req, res) => {
  console.log('Received Email:');
  console.log(req.body);

  const msg = {
    to: 'rooday@bu.edu', // [of bhacks members]
    from: 'contact@bostonhacks.io',
    replyTo: req.body.from,
    subject: req.body.subject,
    text: 'and easy to do anywhere, even with Node.js',
    html: '<strong>and easy to do anywhere, even with Node.js</strong>',
  };

  sgMail
    .send(msg)
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