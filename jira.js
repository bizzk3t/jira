'use strict'
const fs = require('fs')
const fetch = require('node-fetch')
const prompts = require('prompts')
const { execSync } = require('child_process')

async function query (url, auth) {
  let result
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: auth,
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

async function getActiveSprintId (baseUrl, auth, id) {
  const url = baseUrl + `board/${id}/sprint?state=active`
  const data = await module.exports.query(url, auth)
  let result
  if (data && data.values && data.values[0] && data.values[0].id) {
    result = data.values[0].id
  } else {
    result = -1
  }
  return result
}

async function getActiveSprintIssues (baseUrl, auth, id) {
  const url =
    baseUrl + `sprint/${id}/issue?fields=summary&jql=assignee=currentUser()`
    // URL + `sprint/${id}/issue?fields=summary,issuetype.name&jql=assignee=currentUser()`
  const data = await module.exports.query(url, auth)
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

async function main (filename = './config.js') {
  const config = fs.readFileSync(filename, 'utf8')
  if (!config) {
    return `Error: "${filename}" does not exist`
  }
  const baseUrl = config.url + 'rest/agile/1.0/'
  const auth = `Basic ${Buffer.from(`${config.user}:${config.token}`).toString(
    'base64'
  )}`
  const sprintId = await module.exports.getActiveSprintId(baseUrl, auth, config.board)
  const sprintIssues = await module.exports.getActiveSprintIssues(baseUrl, auth, sprintId)
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
        return execSync(command, { stdio: 'inherit' }).toString()
      }
    }
  } catch (e) {
    return 'Error: git command failed'
  }
  return 'Error'
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
