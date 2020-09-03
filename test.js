jest.mock('node-fetch');
jest.mock('prompts');
jest.mock('child_process');

const jira = require('./jira');
const fetch = require('node-fetch');
const child_process = require('child_process');
const prompts = require('prompts');
const { Response } = jest.requireActual('node-fetch');

beforeEach(() => {
  fetch.mockClear();
  prompts.mockClear();
});

test('#query', async () => {
  const expectedValue = {
    data: 'value',
  };
  fetch.mockReturnValueOnce(
    Promise.resolve(new Response(JSON.stringify(expectedValue)))
  );
  const res = await jira.query('https://www.google.com');
  expect(res).toStrictEqual(expectedValue);
});

test('#getActiveSprintId', async () => {
  const expectedValue = { values: [{ id: 42 }] };
  jest.spyOn(jira, 'query').mockReturnValue(expectedValue);
  expect(await jira.getActiveSprintId(0)).toBe(42);
  jira.query.mockClear();
});

test('#getActiveSprintIssues', async () => {
  const expectedValue = {
    issues: [
      { key: 'TQS-123', fields: { summary: 'Summary A' } },
      { key: 'TQS-456', fields: { summary: 'Summary B' } },
    ],
  };
  jest.spyOn(jira, 'query').mockReturnValue(expectedValue);
  const res = await jira.getActiveSprintIssues(23);
  expect(res).toStrictEqual([
    { title: 'TQS-123 - Summary A', value: 'TQS-123' },
    { title: 'TQS-456 - Summary B', value: 'TQS-456' },
  ]);
});
test('#ask', async () => {
  const expectedValue = { value: 'TQS-123' };
  const issues = [
    { title: 'TQS-123 - Summary A', value: 'TQS-123' },
    { title: 'TQS-456 - Summary B', value: 'TQS-456' },
  ];
  prompts.mockReturnValue(Promise.resolve(expectedValue));
  const res = await jira.ask(issues);
  expect(res).toStrictEqual(expectedValue);
});

test('#main', async () => {
  jest
    .spyOn(jira, 'ask')
    .mockReturnValue(Promise.resolve({ value: 'TQS-123' }));
  jest
    .spyOn(child_process, 'execSync')
    .mockReturnValueOnce('.git')
    .mockReturnValueOnce('command result');
  const res = await jira.main();
  expect(typeof res).toBe('string');
});
