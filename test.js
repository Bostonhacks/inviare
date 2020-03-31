require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const args = process.argv.slice(2);

const msg = {
  to: 'BostonHacks <contact@bostonhacks.io>',
  from: 'Keanu Reeves <therealkeanu@askreeves.com>',
  subject: args[0] || "I'd like to sponsor",
  text: args[1] || 'Just kidding ;)',
};

sgMail
  .send(msg)
  .then(() => {
    console.log("Success!")
  })
  .catch(console.error);