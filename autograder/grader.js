const { exec } = require('child_process');
const fs = require('fs');
const yauzl = require('yauzl');
const { sleep, walkDirSync } = require('../util');

/**
 * Sanitize a given replit URL
 * @param {string} url - The URL to sanitize
 * @returns {string} Sanitized URL
 */
function sanitizeURL(url) {
    let regex = /https:\/\/(?:replit\.com|repl\.it)\/@\w+\/[^#?\s]+/g;
    let match = url.match(regex);
    return match[0];
}

/**
 * Get a list of valid projects
 * @param {string[]} inputProjects - List of inputted projects
 * @returns {string[]} List of valid projects
 */
function getValidProjects(inputProjects) {
    let success = [];
    let fail = [];

    for (const project of inputProjects) {
        if (sanitizeURL(project)) {
            success.push(project);
        } else {
            fail.push(project);
        }
    }

    console.log(`Rejected Projects: {${fail.join(', ')}}`);
    console.log(`Accepted Projects: {${success.join(', ')}}`);

    return success;
}

/**
 * Unzips the file at `zipPath` to `folderPath` and cleans up all non .java files
 * @param {string} zipPath - Path to zip file
 */
async function unzipAndClean(zipPath) {
    console.log(`Unzipping project to '${zipPath}'`);

    // Busy waiting for file to finish :p
    while (!fs.existsSync(zipPath)) {
        await sleep(1);
    }

    // TODO: unzip
    yauzl.open(zipPath);

    fs.rm(zipfile);

    // Walking through directory, getting rid of anything not .java
    let dir = fs.readdirSync(zipPath.slice(0, -4));
    for (const file of dir) {
        if (!file.endsWith('.java')) {
            // TODO: This would cause an issue if the program relies on reading files for example
            fs.rm(file);
            // TODO: Use index in the loop instead of getting it here, it *should* be more efficient
            dir.splice(dir.indexOf(file), 1);
        }
    }

    if (dir.length == 0) {
        // The directory is now empty, we can delete it
        fs.rm(zipPath.slice(0, -4));
    }

    console.log(`Finished unzipping project '${zipPath}'`);
}

/**
 * Download, Unzip & Clean a given project
 * @param {string[]} inputProjects - List of inputted projects
 * @param {string} downloadDir - Directory to download to 
 */
async function downloadProjects(inputProjects, downloadDir) {
    let projects = getValidProjects(inputProjects);
    let projectIndex = fs.readdirSync(downloadDir).length;

    for (const project of projects) {
        let formattedURL = sanitizeURL(project);
        if (!formattedURL) {
            console.log(`Could not get replit for project ${project}. Invalid URL.`);
            continue;
        }
        
        let req = await fetch(formattedURL + '.zip', {
            headers: {
                'cookie': `connect.sid=${process.env.CONNECT_SID}`
            }
        });

        if (req.status == 403) {
            console.log(`403 Error - ${process.env.CONNECT_SID ? 'Expired Cookie?' : 'No cookie provided, check .env file.'}`);
            continue;
        } else if (req.status == 200) {
            let splitURL = formattedURL.split('/');
            let username = splitURL[3];
            let projectName = splitURL[4];
            let downloadPath = `${downloadDir}/${idx}-${username}-${projectName}.zip`;

            fs.writeFileSync(downloadPath, Buffer.from(new Uint8Array(await req.blob())));

            projectIndex++;
        } else {
            console.log(`Unknown status: ${req.status}`);
        }
    }
}

/**
 * Loads the mixins found in mixins/mixins.json
 * @returns {string[]} List of mixins
 */
function loadMixins() {
    return JSON.parse(fs.readFileSync('./mixins/mixins.json', 'utf-8'));
}

/*
TODO: Implement these as a jsdoc type
Mixins: {
    importName: [
        {
            regex: RegEx,
            replace: string
        }
    ]
}
*/

/**
 * Inject mixins into a given java file
 * @param {string} filePath - Path of file to inject 
 * @param {Mixins} mixins - List of mixins to inject
 * @returns {boolean} Whether the mixins injected succesfully
 */
function injectMixins(filePath, mixins) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    let contents = fs.readFileSync(filePath, 'utf-8');

    let imports = [];
    for (const i in mixins) {
        importStr = `import ${i};`;
        if (!contents.includes(importStr)) {
            imports.push(mixins[i]);
        }
    }
    imports = imports.join('\n');

    // Looking for package at start of file b/c imports after
    let m = /\s*package\s+,+;\n/.exec(contents);
    if (m) {
        // One of these is supposed to be length - 1, I really don't care to figure it out rn, I'll do it later
        // TODO: fix above comment
        contents = contents.slice(0, m[0].length); + imports + contents.slice(m[0].length);
    } else {
        contents = imports + contents;
    }

    for (const mixinField of mixins) {
        contents = contents.replaceAll(mixinField.regex, mixinField.replace);
    }

    fs.writeFileSync(filePath, contents);
    return true;
}

/**
 * Gets the first instance of `public static void main(String[] args)`
 * @param {string} path - Path of the directory
 * @returns {string} Path of the file containing the main class
 */
function getMainFile(path) {
    // So many \s cause you can put new lines/spaces like in so many places .-.
    // I check if you put it in a line comment, if it's a multiline comment then you can go ahead and fuck the hell off
    let pattern = /^(?!.*\/\/).*public\s+static\s+void\s+main\s*\(((String\s*\[\s*]\s*[A-Za-z_]\w*)|(String\s+[A-Za-z_]\w*\s*\[\s*]))\).*$/g;
    
    let dir = walkDirSync(path)
    let otherFiles = [];
    for (const file of dir) {
        if (file.endsWith('Main.java')) {
            let data = fs.readFileSync(file, 'utf-8');
            if (data.includes(pattern)) {
                return file;
            }
        } else {
            otherFiles.push(file);
        }
    }
    
    // Check the untested files
    for (const file of otherFiles) {
        let data = fs.readFileSync(file, 'utf-8');
        if (data.includes(pattern)) {
            return file;
        }
    }

    // Failed to find any main file.
    return null;
}

/**
 * Get file name without extension
 * @param {string} path - Path to file
 * @returns {string} Name of file without extension
 */
function getFileName(path) {
    // https://stackoverflow.com/a/25221100
    let name = path.split('\\').pop().split('/').pop().split('.');
    name.pop(); // Remove the extension
    return name.join('.');
}

/**
 * Compile a single project (internal)
 * @param {string} projectPath - Path to project
 * @param {Mixins} mixins - Mixins to inject
 * @return {Object} Whether the compilation succeeded and the path
 */
async function compileProject(projectPath, mixins) {
    mainFile = getMainFile(projectPath);

    if (!mainFile) {
        return {
            success: false,
            path
        };
    }

    // Inject mixins
    let dir = walkDirSync(projectPath);
    for (const file of dir) {
        if (file.endsWith('.java')) {
            if (!injectMixins(file, mixins)) {
                return {
                    success: false,
                    path
                };
            }
        }
    }

    let proc = exec(`javac -cp ./mixins/* ${getFileName(main_file)}.java`);
    // Wait for the compilation to finish
    while (!proc.killed) {
        await sleep(25);
    }

    return {
        success: true,
        path
    };
}

/**
 * Generator for all the projects in a directory, literally only used to iterate over tests
 * @param {string} projectDir - Path of project(s) directory 
 * @returns {string[]} List of projects
 */
function getProjects(projectDir) {
    // TODO: What the fuck is this
}

/*
def _get_projects(project_dir: str) -> str:
    """
    Generator for all the projects in a directory, literally only used to iterate over tests
    :param project_dir: Path of project>s< directory
    :return: List of projects
    """

    for path in sorted(os.listdir(project_dir), key=lambda x: int(x.split("-")[0])):
        yield f"{project_dir}/{path}"
*/

/**
 * Compile all projects in the projects directory
 * @param {string} projectDir - Directory containing the projects
 */
async function compileProjects(projectDir) {
    let mixins = loadMixins();

    let promises = [];
    for (const project of getProjects(projectDir)) {
        promises.push(compileProject(project, mixins));
    }

    await Promise.all(promises);

    for (const res of promises) {
        if (!res.success) {
            console.log(`Unsuccessful compilation of '${res.path}'`);
            fs.rm(path, { force: true }); // Deletes entire folder 💀
        }
    }
}

/**
 * Tests a project with a given input and output
 * @param {number} i - Test Index, Needed because asCompleted doesn't return in order
 * @param {string} projectPath - Path to project
 * @param {string} stdInput - Input to supply
 * @param {string} stdOutput - Expected output
 * @param {number=3} tries_left - Remaining attempts before returning a failure
 * @returns {Object} success, status, i
 */
async function testProject(i, projectPath, stdInput, stdOutput, tries_left = 3) {
    let mainClass = getMainFile(projectPath);
    if (!mainClass) {
        return {
            success: false,
            status: -1,
            i
        }
    }

    let fileName = getFileName(mainClass);
    let separator = process.platform == 'win32' ? ';' : ':';
    let classPath = `${projectPath}${separator}${path.join(process.cwd(), './mixins/*')}`;

    proc = exec(`java -cp "${classPath}" ${fileName}`, {
        cwd: projectPath,
        timeout: 10
    });

    proc.stdin.push(stdInput);

    let stdout = '';
    proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
    });

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
    });

    // Wait for the process to complete.
    while (!proc.killed) {
        await sleep(25);
    }

    if (proc.signal == 'SIGTERM') {
        // This is a really bad way to check if it timed out, but it's literally the only way I found
        if (tries_left > 0) {
            return testProject(i, projectPath, stdInput, stdOutput, tries_left - 1);
        } else {
            return {
                success: false,
                status: 1,
                i
            };
        }
    }

    // Normalize output
    stdout = (stderr == '' ? stdout : stderr).strip().replace('\r\n', '\n');
    return {
        success: stdOutput == stdout,
        status: proc.exitCode,
        i
    };
}

/**
 * Load all tests for a given project
 * @param {string} testPath - Path to tests json
 * @returns {Object} [{"input": "", "output": ""}]
 */
function getTests(testPath) {
    if (!fs.existsSync(testPath)) {
        throw "Test path not valid"; // Should be checked before, we are just going to check again
    }

    return JSON.parse(fs.readFileSync(testPath));
}

/**
 * Test all projects in a directory
 * @param {string} projectPath - Project Directory 
 * @param {string} testPath - Test File Path
 * @returns {Object} dict - project_name: [(success, exit_code)]
 */
async function testProjects(projectPath, testPath) {
    let tests = getTests(testPath);

    // getFileName is also not meant to be used here (works tho) :p
    // Ugly ass list comprehension, basically just creates an
    // projectName: [(success, exitCode), ...]
    let toReturn = {};
    for (const project of getProjects(projectPath)) {
        let fileName = getFileName(toReturn);
        toReturn[fileName] = [];
        for (const i in tests) {
            let test = tests[i];
            toReturn[fileName].push(testProject(i, project, test.input, test.output));
        }
    }

    for (const t of toReturn) {
        await Promise.all(t);
    }

    return toReturn;
}

module.exports = {
    downloadProjects,
    compileProjects,
    testProjects,
    sanitizeURL
};
