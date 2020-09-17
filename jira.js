'use strict'
const fetch = require('node-fetch')
const prompts = require('prompts')
const config = require('./config.js')
const { execSync } = require('child_process')

const URL = config.url + 'rest/agile/1.0/'
const AUTH = `Basic ${Buffer.from(`${config.user}:${config.token}`).toString(
  'base64'
)}`

async function query (url) {
  let result
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json'
      }
    })
    result = response.json()
  } catch (e) {
    if (e.name === 'TypeError') {
      result = 'TypeError'
    } else {
      result = 'Error'
    }
  }
  return result
}

async function getActiveSprintId (id) {
  const url = URL + `board/${id}/sprint?state=active`
  const data = await module.exports.query(url)
  let result
  if (data && data.values && data.values[0] && data.values[0].id) {
    result = data.values[0].id
  } else {
    result = -1
  }
  return result
}

async function getActiveSprintIssues (id) {
  const url =
    URL + `sprint/${id}/issue?fields=summary&jql=assignee=currentUser()`
    // URL + `sprint/${id}/issue?fields=summary,issuetype.name&jql=assignee=currentUser()`
  const data = await module.exports.query(url)
  let result
  if (data && data.issues) {
    result = data.issues.map((issue) => {
      const riss = {
        title: [],
        value: []
      }
      if (issue && issue.key) {
        riss.title.push(issue.key)
        riss.value.push(issue.key)
      }
      if (issue && issue.fields && issue.fields.summary) {
        riss.title.push(issue.fields.summary)
        riss.value.push(issue.fields.summary)
      }
      riss.title = riss.title.join('-')
      riss.value = riss.value
        .join('-')
        .replace(/ /g, '-')
        .replace(/[^A-Za-z0-9-]/g, '')
      return riss
    }).filter(i => {
      return i && i.value
    })
  }
  return result
}

function promptFormat (val, values) {
  return `${val}/${values.issue}`
}

function promptMessage (prev, values) {
  return `Is this correct?\n${prev}`
}

async function ask (issues) {
  let result
  try {
    const response = await prompts([
      {
        type: 'select',
        name: 'issue',
        message: 'Pick an Issue to Work on',
        choices: issues,
        initial: 1
      }, {
        type: 'select',
        name: 'category',
        message: 'Issue Category?',
        format: promptFormat,
        choices: [
          { title: 'feature', value: 'feature' },
          { title: 'bugfix', value: 'bugfix' },
          { title: 'test', value: 'test' }
        ]
      }, {
        type: 'confirm',
        name: 'confirm',
        message: promptMessage,
        initial: true
      }
    ])
    result = response
  } catch (e) {
    result = e.toString()
  }
  return result
}

async function main () {
  let result
  const sprintId = await module.exports.getActiveSprintId(config.board)
  const sprintIssues = await module.exports.getActiveSprintIssues(sprintId)
  const response = await module.exports.ask(sprintIssues)
  let branchName
  try {
    if (response && response.category && response.confirm) {
      branchName = response.category
    }
    if (branchName) {
      const inGitDir = execSync('git rev-parse --git-dir 2> /dev/null').toString()
      if (inGitDir) {
        const command = `git checkout -b ${branchName} && git push -u origin ${branchName}`
        result = execSync(command, { stdio: 'inherit' }).toString()
      }
    }
  } catch (e) {
    result = e.name
  }
  return result
}

module.exports = {
  promptFormat,
  promptMessage,
  query,
  getActiveSprintIssues,
  getActiveSprintId,
  ask,
  main
}
