jest.mock('node-fetch')
jest.mock('prompts')
jest.mock('child_process')

const jira = require('./jira')
const fetch = require('node-fetch')
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
    const res = await jira.query('https://www.google.com')
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
      { title: 'TQS-123 - Summary A', value: 'TQS-123' },
      { title: 'TQS-456 - Summary B', value: 'TQS-456' }
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
describe('#ask', () => {
  test('simple ask', async () => {
    const expectedValue = { value: 'TQS-123' }
    const issues = [
      { title: 'TQS-123 - Summary A', value: 'TQS-123' },
      { title: 'TQS-456 - Summary B', value: 'TQS-456' }
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
  test('sample pass', async () => {
    jest
      .spyOn(jira, 'ask')
      .mockReturnValue(Promise.resolve({ value: 'TQS-123' }))
    jest
      .spyOn(childProcess, 'execSync')
      .mockReturnValueOnce('.git')
      .mockReturnValueOnce('command result')
    const res = await jira.main()
    expect(typeof res).toBe('string')
  })
  test('inside a git dir', async () => {
    jest
      .spyOn(jira, 'ask')
      .mockReturnValue(Promise.resolve({ value: 'TQS-123' }))
    jest
      .spyOn(childProcess, 'execSync')
      .mockImplementationOnce(() => {
        throw new Error()
      })
    const res = await jira.main()
    expect(res).toBe('Error')
  })
  test('not inside git dir', async () => {
    jest
      .spyOn(jira, 'ask')
      .mockReturnValue(Promise.resolve({ value: 'TQS-123' }))
    jest
      .spyOn(childProcess, 'execSync')
      .mockReturnValueOnce('')
    const res = await jira.main()
    expect(res).toBe(undefined)
  })
})
