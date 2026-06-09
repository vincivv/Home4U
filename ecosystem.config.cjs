module.exports = {
  apps: [
    {
      name: 'home4u-frontend-5173',
      cwd: './application/frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: '--host 127.0.0.1 --port 5173 --strictPort',
      interpreter: 'node',
      env: { NODE_ENV: 'development' },
    },
    {
      name: 'home4u-backend-8000',
      cwd: './application/backend',
      script: 'start.cjs',
      interpreter: 'node',
      env: { PYTHONUNBUFFERED: '1' },
    },
  ],
};
