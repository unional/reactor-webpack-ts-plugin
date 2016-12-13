import test from 'ava'

import { createWorkspaceJson } from './artifacts'

test('createWorkspaceJson', t => {
  const sdk = 'ext'
  const output = 'build/extjs'
  const actualJSON = createWorkspaceJson(sdk, output)
  const actual = JSON.parse(actualJSON)
  t.is(actual.frameworks.ext, '../../ext')
})
