jest.mock('node-fetch')
jest.mock('prompts')
jest.mock('child_process')
jest.mock('fs')

const jira = require('./jira')
const fetch = require('node-fetch')
const fs = require('fs')
const childProcess = require('child_process')
const prompts = require('prompts')
const { Response } = jest.requireActual('node-fetch')

beforeEach(() => {
  fetch.mockClear()
  prompts.mockClear()
})
describe('#query', () => {
  test('normal', async () => {
    const expectedValue = { data: 'value' }
    fetch.mockReturnValueOnce(
      Promise.resolve(new Response(JSON.stringify(expectedValue)))
    )
    const res = await jira.query('', 'https://www.google.com')
    expect(res).toStrictEqual(expectedValue)
  })
  test('bad', async () => {
    fetch.mockImplementationOnce(() => { throw new Error() })
    expect((await jira.query('bad.domain'))).toBe('Error')
  })
  test('bad', async () => {
    fetch.mockImplementationOnce(() => { return {} })
    expect((await jira.query('bad.domain'))).toBe('TypeError')
  })
})
describe('#getActiveSprintId', () => {
  test('normal', async () => {
    const expectedValue = { values: [{ id: 42 }] }
    jest.spyOn(jira, 'query').mockReturnValue(expectedValue)
    expect(await jira.getActiveSprintId(0)).toBe(42)
  })
  test('bad', async () => {
    jest.spyOn(jira, 'query').mockReturnValue(undefined)
    expect(await jira.getActiveSprintId(0)).toBe(-1)
  })
})
describe('#getActiveSprintIssues', () => {
  test('normal', async () => {
    const expectedValue = {
      issues: [
        { key: 'TQS-123', fields: { summary: 'Summary A' } },
        { key: 'TQS-456', fields: { summary: 'Summary B' } }
      ]
    }
    jest.spyOn(jira, 'query').mockReturnValue(expectedValue)
    const res = await jira.getActiveSprintIssues(23)
    expect(res).toStrictEqual([
      { title: 'TQS-123-Summary A', value: 'TQS-123-Summary-A' },
      { title: 'TQS-456-Summary B', value: 'TQS-456-Summary-B' }
    ])
  })
  test('bad', async () => {
    jest.spyOn(jira, 'query').mockReturnValue(undefined)
    const res = await jira.getActiveSprintIssues(23)
    expect(res).toBe(undefined)
  })
  test('badv2', async () => {
    jest.spyOn(jira, 'query').mockReturnValue({ issues: [{ notit: 's' }] })
    const res = await jira.getActiveSprintIssues(23)
    expect(res).toStrictEqual([])
  })
})
describe('#promptMessage', () => {
  test('show a question with input value', () => {
    expect(jira.promptMessage('value')).toBe(
      'Is this correct?\nvalue'
    )
  })
})
describe('#promptFormat', () => {
  test('format the type and issue name', () => {
    expect(jira.promptFormat('type', { issue: 'issue' })).toBe(
      'type/issue'
    )
  })
})
describe('#ask', () => {
  test('simple ask', async () => {
    const expectedValue = { value: 'TQS-123' }
    const issues = [
      { title: 'TQS-123-Summary A', value: 'TQS-123-Summary-A' },
      { title: 'TQS-456-Summary B', value: 'TQS-456-Summary-B' }
    ]
    prompts.mockReturnValue(Promise.resolve(expectedValue))
    const res = await jira.ask(issues)
    expect(res).toStrictEqual(expectedValue)
  })
  test('simple ask', async () => {
    prompts.mockImplementationOnce(() => {
      throw new Error()
    })
    const res = await jira.ask()
    expect(res).toBe('Error')
  })
})
describe('#main', () => {
  const sampleAskResponse = {
    category: 'feature/TQS-123-Summary',
    confirm: true
  }
  test('sample pass', async () => {
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(require('./config.template.js'))
    jest
      .spyOn(jira, 'ask')
      .mockReturnValue(Promise.resolve(sampleAskResponse))
    jest
      .spyOn(childProcess, 'execSync')
      .mockReturnValueOnce('.git')
      .mockReturnValueOnce('command result')
    const res = await jira.main()
    expect(typeof res).toBe('string')
    expect(jira.board)
    // expect(jira.getActiveSprintId).toHaveBeenCalledWith('uesss')
  })
  test('when ask response value is crap', async () => {
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(require('./config.template.js'))
    jest
      .spyOn(jira, 'ask')
      .mockReturnValue(Promise.resolve())
    const res = await jira.main()
    expect(res).toBe('Error')
  })
  test('when inside a git dir', async () => {
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(require('./config.template.js'))
    jest
      .spyOn(jira, 'ask')
      .mockReturnValue(Promise.resolve(sampleAskResponse))
    jest
      .spyOn(childProcess, 'execSync')
      .mockImplementationOnce(() => {
        throw new Error()
      })
    const res = await jira.main()
    expect(res).toBe('Error: git command failed')
  })
  test('when NOT inside git dir', async () => {
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(require('./config.template.js'))
    jest
      .spyOn(jira, 'ask')
      .mockReturnValue(Promise.resolve(sampleAskResponse))
    jest
      .spyOn(childProcess, 'execSync')
      .mockReturnValueOnce('')
    const res = await jira.main()
    expect(res).toBe('Error')
  })
  test('when config file is not there', async () => {
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(undefined)
    const res = await jira.main()
    expect(res).toBe('Error: "./config.js" does not exist')
  })
})
