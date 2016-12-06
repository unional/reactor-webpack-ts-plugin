import * as ts from 'typescript'
import { SyntaxKind } from 'typescript'

const REACTIFY = 'reactify'
const REACTOR_MODULE_PATTERN = /^@extjs\/reactor$/
const COMPONENT_MODULE_PATTERN = /^@extjs\/reactor\/(modern|classic)$/

/**
 * Extracts Ext.create equivalents from jsx tags so that cmd knows which classes to include in the bundle
 * @param {String} js The javascript code
 * @param {String} prefix The prefix that denotes an Ext JS xtype
 * @returns {Array} An array of Ext.create statements
 */
export default function extractFromTSX(source, scriptTarget: ts.ScriptTarget) {
  // need to specify the filename as *.tsx for tsc to parse JSX tags
  const sourceFile = ts.createSourceFile('foo.tsx', source, scriptTarget)
  const statements: string[] = []
  const types = {}
  let reactifyNames: string[] = []
  let reactorNames: string[] = []
  traverse(sourceFile)
  function traverse(node: ts.Node) {
    if (node.kind === SyntaxKind.ImportDeclaration) {
      const declaration = node as ts.ImportDeclaration
      const moduleTokenName = (declaration.moduleSpecifier as ts.StringLiteral).text
      if (moduleTokenName.match(REACTOR_MODULE_PATTERN)) {
        if (declaration.importClause && declaration.importClause.namedBindings) {
          if (declaration.importClause.namedBindings.kind === SyntaxKind.NamespaceImport) {
            // import * as reactor from '@extjs/reactor'
            reactorNames.push(declaration.importClause.namedBindings.name.text)
            reactifyNames = ['reactify']
          }
          else if (declaration.importClause.namedBindings.kind === SyntaxKind.NamedImports) {
            // import { reactify } from '@extjs/reactor'
            const elements = declaration.importClause.namedBindings.elements
            const reactifyNodes = elements.filter(e => {
              return (e.propertyName && e.propertyName.text === REACTIFY) || (e.name.text === REACTIFY)
            })
            reactifyNames.push(...reactifyNodes.map(n => {
              return n.name.text
            }))
          }
        }
      }
      else if (moduleTokenName.match(COMPONENT_MODULE_PATTERN)) {
        // import { Grid } from '@extjs/reactor/?
        if (declaration.importClause && declaration.importClause.namedBindings) {
          const elements: any[] = (declaration.importClause.namedBindings as any).elements
          for (let e of elements) {
            types[e.name.text] = { xtype: `"${e.propertyName ? e.propertyName.text.toLowerCase() : e.name.text.toLowerCase()}"` }
          }
        }
      }
    }
    // Look for reactify calls. Keep track of the names of each component so we can map JSX tags to xtypes and
    // convert props to configs so Sencha Cmd can discover automatic dependencies in the manifest.
    else if (node.kind === SyntaxKind.VariableDeclaration) {
      const d = node as ts.VariableDeclaration
      if (d.initializer) {
        let call
        if (d.initializer.kind === SyntaxKind.CallExpression) {
          // reactify(...)
          call = d.initializer
        }
        else if (d.initializer.kind === SyntaxKind.AsExpression && (d.initializer as ts.AsExpression).expression.kind === SyntaxKind.CallExpression) {
          // reactor.reactify(...)
          call = (d as any).initializer.expression
        }

        if (call) {
          if (call.expression.kind === SyntaxKind.PropertyAccessExpression && ~reactorNames.indexOf(call.expression.expression.text) && ~reactifyNames.indexOf(call.expression.name.text) ||
            ~reactifyNames.indexOf((call.expression as ts.Identifier).text)) {
            if (d.name.kind === SyntaxKind.Identifier) {
              // example: const Grid = reactify('grid');
              const varName = d.name.text
              const arg = call.arguments[0]
              if (!arg) {
                return
              }

              if (arg.kind === SyntaxKind.StringLiteral) {
                const xtype = (arg as ts.StringLiteral).text
                if (xtype) {
                  types[varName] = { xtype: `"${xtype.toLowerCase()}"` }
                }
              }
              else if (arg.kind === SyntaxKind.Identifier) {
                types[varName] = { xclass: `"${(arg as ts.Identifier).text}"` }
              }
            }
            else if (d.name.kind === SyntaxKind.ArrayBindingPattern) {
              // example: const [ Grid, Panel ] = reactify('grid', SomePanel);
              for (let i = 0; i < d.name.elements.length; i++) {
                const tagName = ((d.name.elements[i] as any).name as ts.Identifier).text
                if (!tagName) {
                  continue
                }
                const arg = call.arguments[i]
                if (!arg) {
                  continue
                }
                if (arg.kind === SyntaxKind.StringLiteral) {
                  const xtype = (arg as ts.StringLiteral).text
                  if (xtype) {
                    types[tagName] = { xtype: `"${xtype.toLowerCase()}"` }
                  }
                }
                else if (arg.kind === SyntaxKind.Identifier) {
                  types[tagName] = { xclass: `"${(arg as ts.Identifier).text}"` }
                }
              }
            }
          }
        }
      }
    }
    else if (node.kind === SyntaxKind.JsxSelfClosingElement || node.kind === SyntaxKind.JsxOpeningElement) {
      // convert reactified components to Ext.create calls to put in the manifest
      const e = (node as ts.JsxSelfClosingElement | ts.JsxOpeningElement)
      const tag = (e.tagName as ts.Identifier).text
      const type = types[tag]
      if (type) {
        const configs = { ...type };
        for (let attribute of e.attributes) {
          if (attribute.kind === SyntaxKind.JsxAttribute) {
            const name = attribute.name.text
            if (attribute.initializer) {
              if (attribute.initializer.kind === SyntaxKind.StringLiteral) {
                configs[name] = `"${attribute.initializer.text}"`
              }
              else if (attribute.initializer.kind === SyntaxKind.JsxExpression) {
                const { expression } = attribute.initializer
                if (expression) {
                  if (expression.kind === SyntaxKind.ObjectLiteralExpression ||
                    expression.kind === SyntaxKind.ArrayLiteralExpression) {
                    configs[name] = expression.getText(sourceFile)
                  }
                }
              }
            }
          }
        }

        const values: string[] = [];

        for (let name in configs) {
          values.push(`${name}: ${configs[name]}`)
        }

        statements.push(`Ext.create({${values.join(', ')}})`);
      }
    }
    ts.forEachChild(node, traverse)
  }

  return statements;
};
