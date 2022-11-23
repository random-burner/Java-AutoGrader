const fs = require('fs');

/**
 * Cleans up the projects directory
 * @param {string} [projectsDir='./projects'] - Directory to clean up
 * @param {boolean} [deleteExisting=true] - Whether to delete existing files or not
 */
function cleanupFolder(projectsDir = './projects/', deleteExisting = true) {
    if (deleteExisting) {
        fs.rmSync(projectsDir, { recursive: true, force: true });
    }

    fs.mkdirSync(projectsDir, { recursive: true });
}

/**
 * Checks whether the .replit file exists
 * @returns {boolean} - Whether the .replit file exists
 */
function inReplit() {
    return fs.existsSync('./.replit');
}

module.exports = {
    cleanupFolder,
    inReplit
};
