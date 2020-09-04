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
  const data = await module.exports.query(url)
  let result
  if (data && data.issues) {
    result = data.issues.map((issue) => {
      const riss = {
        title: [],
        value: ''
      }
      if (issue && issue.key) {
        riss.title.push(issue.key)
        riss.value = issue.key
      }
      if (issue && issue.fields && issue.fields.summary) {
        riss.title.push(issue.fields.summary)
      }
      riss.title = riss.title.join(' - ')
      return riss
    }).filter(i => {
      return i && i.value
    })
  }
  return result
}

async function ask (issues) {
  let result
  try {
    const response = await prompts({
      type: 'select',
      name: 'value',
      message: 'Pick an Issue to Work on',
      choices: issues,
      initial: 1
    })
    result = response
  } catch (e) {
    result = e.toString()
  }
  return result
}

async function main () {
  const sprintId = await module.exports.getActiveSprintId(config.board)
  const sprintIssues = await module.exports.getActiveSprintIssues(sprintId)
  const response = await module.exports.ask(sprintIssues)
  let result
  let value
  try {
    value = response.value
    const inGitDir = execSync('git rev-parse --git-dir 2> /dev/null').toString()
    if (inGitDir) {
      const command = `git checkout -b ${value} && git push -u origin ${value}`
      result = execSync(command, { stdio: 'inherit' }).toString()
    }
  } catch (e) {
    result = e.name
  }
  return result
}

module.exports = {
  query,
  getActiveSprintIssues,
  getActiveSprintId,
  ask,
  main
}

// main();
