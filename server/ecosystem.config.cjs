module.exports = {
  apps: [
    {
      name: 'dailybuild-server',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1, // Single vCPU on Hostinger KVM 1
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: 'logs/server-err.log',
      out_file: 'logs/server-out.log',
      time: true,
    },
    {
      name: 'dailybuild-worker',
      script: 'dist/worker.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/worker-err.log',
      out_file: 'logs/worker-out.log',
      time: true,
    },
    {
      name: 'dailybuild-client',
      script: 'server.js',
      cwd: require('path').resolve(__dirname, '../client'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4444,
      },
      error_file: 'logs/client-err.log',
      out_file: 'logs/client-out.log',
      time: true,
    },
  ],
};
