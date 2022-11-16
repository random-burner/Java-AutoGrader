const autograder = require('./autograder/');
const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const iterator = rl[Symbol.asyncIterator]();

let projectName = '';
let testPath = '';
let projectPath = '';

!(async () => {
    process.stdout.write('Do you want to download projects (y/n): ');
    let shouldDownloadProjects = (await iterator.next()).value.trim().toLowerCase();
    if (shouldDownloadProjects == 'y' || shouldDownloadProjects == 'yes') {
        process.stdout.write('Specify Project Name (name of test file): ');
        projectName = (await iterator.next()).value;

        testPath = `./tests/${projectName}.json`;
        projectPath = `./projects/${projectName}`;
    
        if (!fs.existsSync(testPath)) {
            process.stdout.write(`There are no tests that match name ${projectName}. Continue?`);
            let shouldContinue = (await iterator.next()).value;
            if (shouldContinue != 'yes' && shouldContinue != 'y' && shouldContinue != '') {
                process.exit(0);
            }
        }

        process.stdout.write('Do you want to delete old projects: ');
        let shouldDeleteExisting = (await iterator.next()).value.toLowerCase();
        shouldDeleteExisting = shouldDeleteExisting == 'yes' || shouldDeleteExisting == 'y';
    
        autograder.cleanupFolder({ deleteExisting: shouldDeleteExisting, projectsDir: projectPath });
    
        process.stdout.write('List Projects separated by spaces: ');
        let projects = (await iterator.next()).value.trim().split(' ');
        autograder.downloadProjects({ projects, downloadDir: projectPath });
        autograder.compileProjects({ projectsDir: projectPath });
    }

    process.stdout.write('Do you want to test projects (y/n): ');
    let shouldTestProjects = (await iterator.next()).value.trim().toLowerCase();
    if (shouldTestProjects == 'y' || shouldTestProjects == 'yes') {
        if (projectName == '') {
            process.stdout.write('Specify Project Name (name of test file): ');
            projectName = (await iterator.next()).value;
            testPath = `./tests/${projectName}.json`;
            projectPath = `./projects/${projectName}`;
        }

        if (!fs.existsSync(testPath)) {
            process.stdout.write(`There are no tests that match name ${projectName}.`);
            process.exit(0);
        }

        let res = autograder.testProjects({ projectPath, testPath });
        let outputStr = `Project \`${projectName}\` passed ${res.passedTests.reduce((a, b) => a + b, 0)}/${totalTests}`;
        for (const result of res.tests) {
            outputStr += result.success ? '\x1b[34m✓' : '\x1b[31mX';
        }
        console.log(outputStr);
    }
})();
