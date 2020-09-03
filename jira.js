'use strict';
const fetch = require('node-fetch');
const prompts = require('prompts');
const config = require('./config.js');
const { execSync } = require('child_process');

const URL = config.url + 'rest/agile/1.0/';
const AUTH = `Basic ${Buffer.from(`${config.user}:${config.token}`).toString(
  'base64'
)}`;

async function query (url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: AUTH,
        Accept: 'application/json',
      },
    });
    if (response && response.json) {
      return response.json()
    }
    throw 'BadValue'
  } catch (e) {
    return e;
  }
}

async function getActiveSprintId(id) {
  const url = URL + `board/${id}/sprint?state=active`;
  const data = await module.exports.query(url);
  return data?.values?.[0]?.id ?? -1;
}

async function getActiveSprintIssues(id) {
  const url =
    URL + `sprint/${id}/issue?fields=summary&jql=assignee=currentUser()`;
  const data = await module.exports.query(url);
  return data?.issues?.map((issue) => {
    const key = issue?.key ?? '';
    const summary = issue?.fields?.summary ?? '';
    if (key) {
      return {
        title: [key, summary].join(' - '),
        value: key,
      };
    }
  })
}

async function ask(issues) {
  try {
    const response = await prompts({
      type: 'select',
      name: 'value',
      message: 'Pick an Issue to Work on',
      choices: issues,
      initial: 1,
    });
    if (response) {
      return response
    }
    throw 'BadResponse'
  } catch (e) {
    return e;
  }
}

async function main() {
  const res = (
    await module.exports.ask(
      await module.exports.getActiveSprintIssues(await module.exports.getActiveSprintId(config.board))
    )
  )?.value ?? '';
  if (!res) {
    return 'BadAskValue';
  }
  if (res && res.startsWith(config.project)) {
      try {
        const inGitDir = execSync('git rev-parse --git-dir 2> /dev/null')
        if (!!inGitDir) {
          const command = `git checkout -b ${res} && git push -u origin ${res}`
          let result = execSync(command, { stdio: 'inherit', })?.toString();
          return result;
        }
        throw 'NotInGitDir'
      } catch (e) {
        return e;
      }
  }
  return 'ConsoleError'
}

module.exports = {
  query,
  getActiveSprintIssues,
  getActiveSprintId,
  ask,
  main,
}

// main();
