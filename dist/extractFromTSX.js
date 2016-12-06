"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var ts = require("typescript");
var typescript_1 = require("typescript");
var REACTIFY = 'reactify';
var REACTOR_MODULE_PATTERN = /^@extjs\/reactor$/;
var COMPONENT_MODULE_PATTERN = /^@extjs\/reactor\/(modern|classic)$/;
/**
 * Extracts Ext.create equivalents from jsx tags so that cmd knows which classes to include in the bundle
 * @param {String} js The javascript code
 * @param {String} prefix The prefix that denotes an Ext JS xtype
 * @returns {Array} An array of Ext.create statements
 */
function extractFromTSX(source, scriptTarget) {
    // need to specify the filename as *.tsx for tsc to parse JSX tags
    var sourceFile = ts.createSourceFile('foo.tsx', source, scriptTarget);
    var statements = [];
    var types = {};
    var reactifyNames;
    traverse(sourceFile);
    function traverse(node) {
        if (node.kind === typescript_1.SyntaxKind.ImportDeclaration) {
            var declaration = node;
            var moduleTokenName = declaration.moduleSpecifier.text;
            if (moduleTokenName.match(REACTOR_MODULE_PATTERN)) {
                // console.log(node)
                if (declaration.importClause && declaration.importClause.namedBindings) {
                    var elements = declaration.importClause.namedBindings.elements;
                    var reactifyNodes = elements.filter(function (e) {
                        return (e.propertyName && e.propertyName.text === REACTIFY) || (e.name.text === REACTIFY);
                    });
                    reactifyNames = reactifyNodes.map(function (n) {
                        return n.name.text;
                    });
                }
            }
            else if (moduleTokenName.match(COMPONENT_MODULE_PATTERN)) {
                if (declaration.importClause && declaration.importClause.namedBindings) {
                    var elements = declaration.importClause.namedBindings.elements;
                    for (var _i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
                        var e = elements_1[_i];
                        types[e.name.text] = { xtype: "\"" + (e.propertyName ? e.propertyName.text.toLowerCase() : e.name.text.toLowerCase()) + "\"" };
                    }
                }
            }
        }
        else if (node.kind === typescript_1.SyntaxKind.VariableDeclaration) {
            // console.log(node.getText(sourceFile))
            // console.log(node)
            var d = node;
            if (d.initializer) {
                var call = void 0;
                if (d.initializer.kind === typescript_1.SyntaxKind.CallExpression) {
                    call = d.initializer;
                }
                else if (d.initializer.kind == typescript_1.SyntaxKind.AsExpression && d.initializer.expression.kind === typescript_1.SyntaxKind.CallExpression) {
                    call = d.initializer.expression;
                }
                if (call) {
                    if (~reactifyNames.indexOf(call.expression.text)) {
                        if (d.name.kind === typescript_1.SyntaxKind.Identifier) {
                            // example: const Grid = reactify('grid');
                            var varName = d.name.text;
                            var arg = call.arguments[0];
                            if (!arg)
                                return;
                            if (arg.kind === typescript_1.SyntaxKind.StringLiteral) {
                                var xtype = arg.text;
                                if (xtype) {
                                    types[varName] = { xtype: "\"" + xtype.toLowerCase() + "\"" };
                                }
                            }
                            else if (arg.kind === typescript_1.SyntaxKind.Identifier) {
                                types[varName] = { xclass: "\"" + arg.text + "\"" };
                            }
                        }
                        else if (d.name.kind === typescript_1.SyntaxKind.ArrayBindingPattern) {
                            // example: const [ Grid, Panel ] = reactify('grid', SomePanel);
                            for (var i = 0; i < d.name.elements.length; i++) {
                                var tagName = d.name.elements[i].name.text;
                                if (!tagName)
                                    continue;
                                var arg = call.arguments[i];
                                if (!arg)
                                    continue;
                                if (arg.kind === typescript_1.SyntaxKind.StringLiteral) {
                                    var xtype = arg.text;
                                    if (xtype) {
                                        types[tagName] = { xtype: "\"" + xtype.toLowerCase() + "\"" };
                                    }
                                }
                                else if (arg.kind === typescript_1.SyntaxKind.Identifier) {
                                    types[tagName] = { xclass: "\"" + arg.text + "\"" };
                                }
                            }
                        }
                    }
                }
            }
        }
        else if (node.kind === typescript_1.SyntaxKind.JsxSelfClosingElement || node.kind === typescript_1.SyntaxKind.JsxOpeningElement) {
            // console.log(`JSX found`, node)
            var e = node;
            var tag = e.tagName.text;
            // console.log(node)
            var type = types[tag];
            if (type) {
                var configs = __assign({}, type);
                for (var _a = 0, _b = e.attributes; _a < _b.length; _a++) {
                    var attribute = _b[_a];
                    if (attribute.kind === typescript_1.SyntaxKind.JsxAttribute) {
                        var name_1 = attribute.name.text;
                        if (attribute.initializer) {
                            if (attribute.initializer.kind === typescript_1.SyntaxKind.StringLiteral) {
                                configs[name_1] = "\"" + attribute.initializer.text + "\"";
                            }
                            else if (attribute.initializer.kind === typescript_1.SyntaxKind.JsxExpression) {
                                // console.log(attribute.initializer)
                                var expression = attribute.initializer.expression;
                                if (expression) {
                                    console.log(name_1, expression.kind);
                                    if (expression.kind === typescript_1.SyntaxKind.TrueKeyword) {
                                        configs[name_1] = true;
                                    }
                                    else if (expression.kind === typescript_1.SyntaxKind.FalseKeyword) {
                                        configs[name_1] = false;
                                    }
                                    else if (expression.kind === typescript_1.SyntaxKind.NumericLiteral) {
                                        configs[name_1] = expression.text;
                                    }
                                    else if (expression.kind === typescript_1.SyntaxKind.ObjectLiteralExpression ||
                                        expression.kind === typescript_1.SyntaxKind.ArrayLiteralExpression) {
                                        // console.log(expression.getText(sourceFile))
                                        configs[name_1] = expression.getText(sourceFile);
                                    }
                                }
                            }
                        }
                    }
                }
                // console.log(configs)
                var values = [];
                for (var name_2 in configs) {
                    values.push(name_2 + ": " + configs[name_2]);
                }
                statements.push("Ext.create({" + values.join(', ') + "})");
            }
        }
        ts.forEachChild(node, traverse);
    }
    return statements;
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = extractFromTSX;
;
//# sourceMappingURL=extractFromTSX.js.map