const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Walks a directory and all subdirectories and extracts all files.
 * @param {string} dir - The directory you want to walk
 * @returns {string[]} A list of the files
 */
const walkDirSync = function(dir) {
    let results = [];
    let files = fs.readdirSync(dir);
    for (const file of files) {
        let stat = fs.statSync(path.resolve(dir, file));
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDirSync(path.resolve(dir, file)));
        } else {
            results.push(path.resolve(dir, file));
        }
    }

    return results; 
};

module.exports = {
    sleep,
    walkDirSync
};
