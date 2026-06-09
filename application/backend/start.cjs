const { spawn } = require('child_process');
const path = require('path');

const venv = path.join(__dirname, '.venv', 'bin', 'python3');
const python = require('fs').existsSync(venv) ? venv : 'python3';

const proc = spawn(python, [
  '-m', 'uvicorn', 'app.main:app',
  '--host', '127.0.0.1',
  '--port', '8000',
], {
  cwd: __dirname,
  stdio: 'inherit',
});

proc.on('close', (code) => process.exit(code));
