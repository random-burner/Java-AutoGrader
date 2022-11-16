const grader = require('./grader.js');
const setup = require('./setup.js');

module.exports = {
    ...setup,
    downloadProjects: grader.downloadProjects,
    compileProjects: grader.compileProjects,
    testProjects: grader.testProjects
};
