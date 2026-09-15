/**
 * PM2 process definition for the Hostinger KVM VPS.
 *
 * Deploy:
 *   npm ci && npm run build && npm run db:deploy
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'tribeca-api',
      script: 'dist/main.js',
      // Cluster mode uses every vCPU. Rate limits and queues live in Redis,
      // so multiple workers stay consistent with each other.
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      // Restart before Node's heap growth starves a small VPS.
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
