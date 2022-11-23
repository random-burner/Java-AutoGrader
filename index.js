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
                return;
            }
        }

        process.stdout.write('Do you want to delete old projects: ');
        let shouldDeleteExisting = (await iterator.next()).value.toLowerCase();
        shouldDeleteExisting = shouldDeleteExisting == 'yes' || shouldDeleteExisting == 'y';
    
        autograder.cleanupFolder({ deleteExisting: shouldDeleteExisting, projectsDir: projectPath });
    
        process.stdout.write('List Replit links separated by spaces: ');
        let projects = (await iterator.next()).value.trim().split(' ');
        autograder.downloadProjects(projects, projectPath);
        autograder.compileProjects(projectPath);
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
            return;
        }

        /*
        This returns an object that looks like this:
{
    'index-username-projectName': {
        tests: [
            {
                success: true,
                statusCode: 0,
                output: '',
                expectedOutput: ''
            }
        ],
        passedTests: [],
        failedTests: []
    }
}
        */
        let testedProjects = autograder.testProjects({ projectPath, testPath });
        for (const projectID in testedProjects) {
            let project = testedProjects[projectID];
            let outputStr = `Project \`${projectName}\` passed ${project.passedTests.lengths}/${project.tests.length}`;
            for (const result of testedProjects.tests) {
                outputStr += result.success ? '\x1b[34m✓' : '\x1b[31mX';
            }
            console.log(outputStr);

            for (const test of project.tests) {
                if (test.success) {
                    continue;
                }

                console.log(`------ TEST CASE ${i} ------`);
                switch (code) {
                    case 0:
                        // TODO: Log reason test failed
                        break;
                    case -1:
                        console.log('Could not find main class');
                        break;
                    case -2:
                        console.log('Timed out');
                        break;
                    default:
                        console.log(test.output);
                        break;
                }
            }
        }
    }
})();
