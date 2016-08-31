module.exports = function(grunt) {
    var VERSION = '0.4.0';
    var osxArchive = './installers/osx64/PhoneGap-Desktop-Beta-' + VERSION + '-mac.zip';
    var winArchive = './installers/win32/PhoneGap-Desktop-Beta-' + VERSION + '-win.zip';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        'electron': {
            osxBuild: {
                options: {
                    name: 'PhoneGap',
                    dir: './www',
                    out: './build',
                    version: '1.3.0',
                    platform: 'darwin',
                    arch: 'x64',
                    icon: './www/img/app-icons/icon.icns',
                    asar: false
                }
            },
            winBuild: {
                options: {
                    name: 'PhoneGap',
                    dir: './www',
                    out: './build',
                    version: '1.3.0',
                    platform: 'win32',
                    arch: 'ia32',
                    icon: './www/img/app-icons/icon.ico',
                    asar: false
                }
            }
        },
        'compress': {
            osxPackage: {
                options: {
                    archive: osxArchive,
                    mode: 'zip'
                },
                files: [
                    {
                        cwd: './build/PhoneGap-darwin-x64/',
                        expand: true,
                        src: ['PhoneGap.app/**/*']
                    }
                ]
            },
            winPackage: {
                options: {
                    archive: winArchive,
                    mode: 'zip'
                },
                files: [
                    {
                        cwd: './build/PhoneGap-win32-ia32/',
                        expand: true,
                        src: ['**/*']
                    }
                ]
            }
        }
    });

    // Load the grunt plugins.
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-electron');

    // Register the task to install dependencies.
    grunt.task.registerTask('install-dependencies', function() {
        var exec = require('child_process').exec,
        callback = this.async();

        exec('node src/js/download-node.js', function(e, stdout, stderr) {
            if (e) {
                console.log(stderr);
                console.log('Check BUNDLED_NODE_VERSION');
                process.exit(1);
            }
            else {
                console.log(stdout);
            }
        });

        exec('npm install --production', { cwd: './www' }, function(e, stdout, stderr) {
            console.log(stdout);
            callback();
        });
    });

    // OSX code signing
    grunt.task.registerTask('code-sign-osx', function() {
        if (process.platform == 'darwin') {
            var shell = require('shelljs');
            var signConfig = grunt.file.readJSON("sign-config.json")
            shell.exec("codesign --verbose --deep --force --sign " + "'"+signConfig.certName+"'" + " build/PhoneGap-darwin-x64/PhoneGap.app");
            shell.exec("codesign --verbose --verify build/PhoneGap-darwin-x64/PhoneGap.app");
            shell.exec("codesign -vv -d build/PhoneGap-darwin-x64/PhoneGap.app");
            shell.exec("codesign --verbose --force --sign " + "'"+signConfig.certName+"'" + " build/PhoneGap-darwin-x64/PhoneGap.app/Contents/MacOS/PhoneGap");
            shell.exec("codesign --verbose --verify build/PhoneGap-darwin-x64/PhoneGap.app/Contents/MacOS/PhoneGap");
        }
    });

    // Clean build directories
    grunt.task.registerTask('clean-build-dir', function() {
        var shell = require('shelljs');
        shell.rm('-rf', './build');
    });

    // Clean releases directories
    grunt.task.registerTask('clean-installers-dir', function() {
        var shell = require('shelljs');
        shell.rm('-rf', './installers');
    });

    // Clean node dependencies
    grunt.task.registerTask('clean-node-modules', function() {
        var shell = require('shelljs');
        shell.rm('-rf', './www/node_modules');
    });

    // start the local server for update checker
    grunt.task.registerTask('start-localhost', function() {
        var shell = require('shelljs');
        shell.exec('node ./update-server/server.js');
    });

    // create the OSX DMG installer
    grunt.task.registerTask('osx-installer', function() {
        var shell = require('shelljs');
        shell.exec('bash ./res/installers/osx/package-pgd.sh');
    });

    // copy package.json to www folder
    grunt.task.registerTask('copy-dev-config', function() {
        grunt.file.copy('./src/config/package.json', './www/package.json');
    });

    // disable the dev console before copying the package.json to www folder
    grunt.task.registerTask('copy-release-config', function() {
        var config = grunt.file.read('./src/config/package.json');
        var releaseConfig = config.replace('"devTools" : true', '"devTools" : false');
        grunt.file.write('./www/package.json', releaseConfig);
    });

    // copy the EULA into the installer folders
    grunt.task.registerTask('copy-eula', function() {
        grunt.file.copy('./src/license.txt', './res/installers/osx/license.txt');
        grunt.file.copy('./src/license.txt', './res/installers/win/license.txt');
    });

    // Open the built app
    grunt.task.registerTask('open', function() {
        var os = require('os'),
            fs = require('fs'),
            opener = require('opener'),
            macPath = 'build/PhoneGap-darwin-x64/PhoneGap.app',
            winPath = 'build/PhoneGap-win32-ia32/PhoneGap.exe';
            opener((os.platform() === 'darwin') ? macPath : winPath);
    });

    // default - runs the dev build
    grunt.registerTask(
        'default',
        [
            'clean-node-modules',
            'copy-dev-config',
            'install-dependencies',
            'copy-eula',
            'clean-build-dir',
            'electron',
            'code-sign-osx',
            'open'//,
            //'start-localhost'
        ]
    );

    // production build task
    grunt.registerTask(
        'release',
        [
            'clean-node-modules',
            'clean-installers-dir',
            'copy-release-config',
            'install-dependencies',
            'copy-eula',
            'clean-build-dir',
            'electron',
            'code-sign-osx',
            //'compress',
            'osx-installer',
            'open'
        ]
    );

    grunt.registerTask('debugMac',['clean-build-dir','electron:osxBuild','open']);
    grunt.registerTask('debugWin',['clean-build-dir','electron:winBuild','open']);
};
