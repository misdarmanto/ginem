module.exports = {
  apps: [
    {
      // Backend API
      name: 'ginem-api',
      cwd: './packages/api',
      script: './build/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.env'],
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 5000,
    },
    {
      // Frontend Dashboard - Using serve package
      name: 'ginem-dashboard',
      cwd: './packages/dashboard',
      script: 'serve',
      args: '-s dist -l 5173',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/dashboard-error.log',
      out_file: './logs/dashboard-out.log',
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.env'],
    },
  ],

  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/ginem-dev.git',
      path: '/var/www/ginem-dev',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production"',
    },
    staging: {
      user: 'deploy',
      host: 'staging-server.com',
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/ginem-dev.git',
      path: '/var/www/ginem-dev-staging',
      'post-deploy': 'npm install && npm run build && pm2 restart ecosystem.config.js --env staging',
      'pre-deploy-local': 'echo "Deploying to staging"',
    },
  },
};
