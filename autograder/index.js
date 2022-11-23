const grader = require('./grader.js');
const setup = require('./setup.js');

require('dotenv').config();

module.exports = {
    ...setup,
    downloadProjects: grader.downloadProjects,
    compileProjects: grader.compileProjects,
    testProjects: grader.testProjects
};
