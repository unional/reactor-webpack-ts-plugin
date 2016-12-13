import test from 'ava'

import { createWorkspaceJson, createAppJson } from './artifacts'

test('createWorkspaceJson', t => {
  const sdk = 'ext'
  const output = 'build/extjs'
  const actualJSON = createWorkspaceJson(sdk, output)
  const actual = JSON.parse(actualJSON)
  t.is(actual.frameworks.ext, '../../ext')
})

test('createAppJson', t=> {
  const actualJson = createAppJson({ theme: 'theme-material', packages: ['charts'], toolkit: 'modern'})
  const actual = JSON.parse(actualJson)
  t.is(actual.framework, 'ext')
  t.is(actual.toolkit, 'modern')
  t.is(actual.theme, 'theme-material')
  t.deepEqual(actual.requires, ['charts'])
})
