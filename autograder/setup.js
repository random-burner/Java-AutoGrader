const fs = require('fs');

/**
 * Cleans up the projects directory
 * @param {Object} obj - An object.
 * @param {boolean} obj.deleteExisting - Whether to delete existing files or not
 * @param {string} [obj.projectsDir='./projects'] - Directory to clean up
 */
function cleanupFolder({ deleteExisting, projectsDir = './projects/' }) {
    fs.mkdirSync(projectsDir, { recursive: true });

    if (deleteExisting) {
        fs.readdirSync(projectsDir).forEach(file => {
            if (file.name == 'tests') {
                return;
            }

            fs.rmSync(file, { recursive: true, force: true });
        })
    }
}

function inReplit() {
    return fs.existsSync('./.replit');
}

module.exports = {
    cleanupFolder,
    inReplit
}
