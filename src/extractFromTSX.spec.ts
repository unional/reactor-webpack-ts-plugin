import test from 'ava'
import { ScriptTarget } from 'typescript'
import extractFromTSX from './extractFromTSX'

test('import *', t => {
  const source = `
  impport X = require('y')
  import * as reactor from '@extjs/reactor'
  const Grid = reactor.reactify('grid')
  const Y = <Grid/>
  `
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.deepEqual(actual, [
    'Ext.create({xtype: "grid"})'
  ])
})

test('import declaration basic', t => {
  const source = `
import { reactify } from '@extjs/reactor'
const Grid = reactify<any, any>('grid')
const Panel = reactify('panel')
const [ X, ,Y ] = reactify('grid', 'textbox', 'panel')

class ABC {
  render() {
    return <X abc='def'><Y def='123'/></X>
  }
}
`
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.deepEqual(actual, [
    'Ext.create({xtype: "grid", abc: "def"})',
    'Ext.create({xtype: "panel", def: "123"})'
  ])
})

test('create with as any', t => {
  const source = `
import { reactify } from '@extjs/reactor';

import data from './data';
import Employee from './Employee';

const Grid = reactify('grid') as any;
const Panel = reactify('panel') as any;
const Container = reactify('container') as any;
const SearchField = reactify('searchfield') as any;
const X =  <Container
                plugins="responsive"
            >
            </Container>
`
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.deepEqual(actual, [
    `Ext.create({xtype: "container", plugins: "responsive"})`
  ])
})

test('JSX', t => {
  const source = `
import { reactify } from '@extjs/reactor'
import { SomeComponent } from './SomeExtComponent'
function foo() {}
const Grid = reactify('grid');
const Y = <Grid string="foo", number=1, bool=true, bool2 = false, expression={foo}, object={{x:1,y:2}} array={['a', { text: 'name' }] ref={this.store}/>
`
  const actual = extractFromTSX(source, ScriptTarget.ES2016)

  // expression and ref are skipped.
  t.deepEqual(actual, [
    `Ext.create({xtype: "grid", string: "foo", object: {x:1,y:2}, array: ['a', { text: 'name' }]})`
  ])
})

test('import with ExtComponent', t => {
  const source = `
import { reactify } from '@extjs/reactor'
import { SomeComponent } from './SomeExtComponent'
function foo() {}
const MyGrid = reactify(SomeComponent)
const Y = <MyGrid doSomething={foo}/>
`
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.deepEqual(actual, [
    'Ext.create({xclass: "SomeComponent"})'
  ])
})

test('import declaration with rename', t => {
  const source = `
import { reactify as abc, reactify as def } from '@extjs/reactor'
const Grid = abc('grid')
const Panel = def('panel')
const Y = <Grid><Panel/></Grid>
`
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.deepEqual(actual, [
    'Ext.create({xtype: "grid"})',
    'Ext.create({xtype: "panel"})'
  ])
})

test('import declaration without named export should do nothing', t => {
  const source = `
import x from '@extjs/reactor'
`
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.is(actual.length, 0)
})

test('import declaration with no import clause should do nothing', t => {
  const source = `import '@extjs/reactor'`
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.is(actual.length, 0)
})

test('import module pattern shortcut', t => {
  const source = `
  import { Grid, Panel as P } from '@extjs/reactor/modern
  const Y = <Grid><P/></Grid>
  `
  const actual = extractFromTSX(source, ScriptTarget.ES2016)
  t.deepEqual(actual, [
    'Ext.create({xtype: "grid"})',
    'Ext.create({xtype: "panel"})'
  ])
})
