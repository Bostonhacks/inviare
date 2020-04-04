# Inviare
BostonHacks' SendGrid Inbound Parse webhook. This repository is a good example of using Inbound Parse to route emails from a domain to specific individuals.

## Development
The function code/devependencies are inside `functions`. Make sure to run `npm install` inside that folder. To use the email tester, run `npm install` at root. To deploy, you'll need the Firebase CLI, install with `npm install -g firebase-tools`. Then run `firebase login` to authenticate. When ready to deploy, run `firebase deploy --only functions` from the project root.