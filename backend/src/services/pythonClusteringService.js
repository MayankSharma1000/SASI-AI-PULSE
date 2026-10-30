const { spawn } = require('child_process');
const path = require('path');

const pythonScript = path.resolve(
    __dirname,
    '../../python/clustering.py'
);

const pythonExecutable = process.env.PYTHON_EXECUTABLE ||
    path.resolve(__dirname, '../../python/.venv/bin/python');

const clusterMatches = (candidate, existingItems, threshold) => {
    return new Promise((resolve, reject) => {
        const child = spawn(pythonExecutable, [pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');

        child.stdout.on('data', chunk => {
            stdout += chunk;
        });

        child.stderr.on('data', chunk => {
            stderr += chunk;
        });

        child.on('error', error => {
            reject(new Error(`Could not start Python clustering: ${error.message}`));
        });

        child.on('close', code => {
            if (code !== 0) {
                reject(new Error(
                    `Python clustering failed (${code}): ${stderr || stdout}`
                ));
                return;
            }

            try {
                resolve(JSON.parse(stdout));
            } catch {
                reject(new Error(
                    `Python clustering returned invalid JSON: ${stdout}`
                ));
            }
        });

        child.stdin.on('error', error => {
            reject(error);
        });

        child.stdin.end(JSON.stringify({
            candidate,
            existingItems,
            threshold
        }));
    });
};

module.exports = { clusterMatches };
