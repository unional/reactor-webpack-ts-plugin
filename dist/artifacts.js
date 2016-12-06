"use strict";
exports.buildXML = "\n<project name=\"simple-build\" basedir=\".\">\n    <!--  internally, watch calls the init target, so need to have one here -->\n    <target name=\"init\"/>\n    <target name=\"init-cmd\">\n        <taskdef resource=\"com/sencha/ant/antlib.xml\"\n                        classpath=\"${cmd.dir}/sencha.jar\"\n                        loaderref=\"senchaloader\"/>\n        <x-extend-classpath>\n            <jar path=\"${cmd.dir}/sencha.jar\"/>\n        </x-extend-classpath>\n        <x-sencha-init prefix=\"\"/>\n        <x-compile refid=\"theCompiler\"\n                         dir=\"${basedir}\"\n                         initOnly=\"true\"\n                         inheritAll=\"true\">\n                  <![CDATA[\n                  -classpath=${basedir}/manifest.js\n                  load-app\n                      -temp=${basedir}/temp\n                      -tag=App\n            ]]>\n          </x-compile>\n    </target>\n    <target name=\"build\" depends=\"init-cmd\">\n       <x-compile refid=\"theCompiler\"\n                  dir=\"${basedir}\"\n                  inheritAll=\"true\">\n          <![CDATA[\n          exclude\n          -all\n          and\n          include\n          -f=Boot.js\n          and\n          concatenate\n              ext.js\n          and\n          exclude\n          -all\n          and\n          # include all js files needed for manifest.js\n              include\n              -r\n              -f=manifest.js\n          and\n          # exclude the generated manifest file itself,\n          # since we don't want the generated bundle file to create any components\n          exclude\n          -f=manifest.js\n          and\n          concatenate\n          +append\n              ext.js\n          and\n          scss\n              -appName=App\n              -imageSearchPath=resources\n              -themeName=triton\n              -resourceMapBase=.\n              -output=ext.scss\n          and\n          resources\n              -excludes=-all*.css\n              -out=resources\n          and\n          resources\n              -model=true\n              -out=resources\n          ]]>\n       </x-compile>\n       <x-sencha-command dir=\"${basedir}\">\n           <![CDATA[\n           fashion\n               -pwd=.\n               -split=4095\n               -compress\n                   ext.scss\n               ext.css\n           then\n           fs\n           minify\n               -yui\n               -from=ext.js\n               -to=ext.js\n           ]]>\n       </x-sencha-command>\n    </target>\n    <target name=\"watch\" depends=\"init-cmd,build\">\n        <x-watch compilerRef=\"theCompiler\"\n                 targets=\"build\"/>\n    </target>\n</project>\n".trim();
/**
 * Creates the app.json file
 * @param {String} theme The name of the theme to use.
 * @param {String[]} packages The names of packages to include in the build
 */
function createAppJson(_a) {
    var theme = _a.theme, packages = _a.packages, toolkit = _a.toolkit;
    return JSON.stringify({
        framework: 'ext',
        toolkit: toolkit,
        theme: theme,
        requires: packages,
        output: {
            base: '.',
            resources: {
                path: './resources',
                shared: './resources'
            }
        }
    }, null, 4);
}
exports.createAppJson = createAppJson;
/**
 * Creates the workspace.json file
 * @param {String} sdk The path to the sdk
 */
function createWorkspaceJson(sdk) {
    return JSON.stringify({
        'frameworks': {
            'ext': sdk
        },
        'packages': {
            'dir': '${workspace.dir}/packages/local,${workspace.dir}/packages',
            'extract': '${workspace.dir}/packages/remote'
        }
    }, null, 4);
}
exports.createWorkspaceJson = createWorkspaceJson;
//# sourceMappingURL=artifacts.js.map