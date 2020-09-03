# jira
> *"Hey, Jira, do I have any issues?"* - **Me**

## Setup
- `git clone https://gitlab.com/bizzk3t/jira.git`
- `cd jira`
- `yarn install`

### Generate `config.js`
`config.js` must exist in the root directory.
- `cat config.template.js > config.js`
```javascript
// config.template.js
module.exports = {
  project: 'TQS',
  url: 'https://traqsys.atlassian.net/', 
  board: 8, // This is the Board ID(its in the jira sprint url)
  user: 'will.harrison@traqsys.com',
  token: '<token>',
}
```

## Install
`yarn global add $PWD`

## Uninstall
`yarn global remove jira`

## Usage
`jira`

## test
`yarn test`
