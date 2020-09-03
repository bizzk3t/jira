# jira

> Hey, Jira, get me my frickin sprint issues please.
> - Me

## Setup
- `git clone https://gitlab.com/bizzk3t/jira.git && cd jira`
- `yarn install`

### config.js
A config.js file must be present in the directory in order to work.

Try something like this command:
- `cat config.template.js > config.js`

### Example config.js file

```javascript
module.exports = {
  project: 'TQS',
  url: 'https://traqsys.atlassian.net/', 
  board: 8, // This is the Board ID(its in the jira sprint url)
  user: 'will.harrison@traqsys.com',
  token: '<token>',
}
```

## Installation
`yarn global add .`

