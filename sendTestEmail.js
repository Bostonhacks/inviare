require('dotenv').config();
const prompts = require('prompts');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const questions = [
  {
    type: 'text',
    name: 'from',
    message: "Who's this from?",
    initial: "Keanu Reeves <therealkeanu@askreeves.com>"
  },
  {
    type: 'text',
    name: 'subject',
    message: 'Subject:',
    initial: "I'd like to sponsor"
  },
  {
    type: 'text',
    name: 'text',
    message: 'Text:',
    initial: "Just kidding ;)"
  }
];

(async () => {
  const response = await prompts(questions);
  const msg = {
    to: 'BostonHacks <contact@bostonhacks.io>',
    from: response.from,
    subject: response.subject,
    text: response.text
  };

  sgMail
    .send(msg)
    .then(() => {
      console.log("Success!")
    })
    .catch(console.error);
})();