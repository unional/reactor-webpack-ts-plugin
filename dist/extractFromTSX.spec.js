"use strict";
var ava_1 = require("ava");
var typescript_1 = require("typescript");
var extractFromTSX_1 = require("./extractFromTSX");
ava_1.default('import *', function (t) {
    var source = "\n  impport X = require('y')\n  import * as reactor from '@extjs/reactor'\n  const Grid = reactor.reactify('grid')\n  const Y = <Grid/>\n  ";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.deepEqual(actual, [
        'Ext.create({xtype: "grid"})'
    ]);
});
ava_1.default('import declaration basic', function (t) {
    var source = "\nimport { reactify } from '@extjs/reactor'\nconst Grid = reactify<any, any>('grid')\nconst Panel = reactify('panel')\nconst [ X, Y ] = reactify('grid', 'panel')\n\nclass ABC {\n  render() {\n    return <X abc='def'><Y def='123'/></X>\n  }\n}\n";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.deepEqual(actual, [
        'Ext.create({xtype: "grid", abc: "def"})',
        'Ext.create({xtype: "panel", def: "123"})'
    ]);
});
ava_1.default('create with as any', function (t) {
    var source = "\nimport { reactify } from '@extjs/reactor';\n\nimport data from './data';\nimport Employee from './Employee';\n\nconst Grid = reactify('grid') as any;\nconst Panel = reactify('panel') as any;\nconst Container = reactify('container') as any;\nconst SearchField = reactify('searchfield') as any;\nconst X =  <Container\n                plugins=\"responsive\"\n            >\n            </Container>\n";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.deepEqual(actual, [
        "Ext.create({xtype: \"container\", plugins: \"responsive\"})"
    ]);
});
ava_1.default('JSX', function (t) {
    var source = "\nimport { reactify } from '@extjs/reactor'\nimport { SomeComponent } from './SomeExtComponent'\nfunction foo() {}\nconst Grid = reactify('grid');\nconst Y = <Grid string=\"foo\", number=1, bool=true, bool2 = false, expression={foo}, object={{x:1,y:2}} array={['a', { text: 'name' }] ref={this.store}/>\n";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    // expression and ref are skipped.
    t.deepEqual(actual, [
        "Ext.create({xtype: \"grid\", string: \"foo\", object: {x:1,y:2}, array: ['a', { text: 'name' }]})"
    ]);
});
ava_1.default('import with ExtComponent', function (t) {
    var source = "\nimport { reactify } from '@extjs/reactor'\nimport { SomeComponent } from './SomeExtComponent'\nfunction foo() {}\nconst MyGrid = reactify(SomeComponent)\nconst Y = <MyGrid doSomething={foo}/>\n";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.deepEqual(actual, [
        'Ext.create({xclass: "SomeComponent"})'
    ]);
});
ava_1.default('import declaration with rename', function (t) {
    var source = "\nimport { reactify as abc, reactify as def } from '@extjs/reactor'\nconst Grid = abc('grid')\nconst Panel = def('panel')\nconst Y = <Grid><Panel/></Grid>\n";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.deepEqual(actual, [
        'Ext.create({xtype: "grid"})',
        'Ext.create({xtype: "panel"})'
    ]);
});
ava_1.default('import declaration without named export should do nothing', function (t) {
    var source = "\nimport x from '@extjs/reactor'\n";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.is(actual.length, 0);
});
ava_1.default('import declaration with no import clause should do nothing', function (t) {
    var source = "import '@extjs/reactor'";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.is(actual.length, 0);
});
ava_1.default('import module pattern shortcut', function (t) {
    var source = "\n  import { Grid, Panel as P } from '@extjs/reactor/modern\n  const Y = <Grid><P/></Grid>\n  ";
    var actual = extractFromTSX_1.default(source, typescript_1.ScriptTarget.ES2016);
    t.deepEqual(actual, [
        'Ext.create({xtype: "grid"})',
        'Ext.create({xtype: "panel"})'
    ]);
});
//# sourceMappingURL=extractFromTSX.spec.js.map