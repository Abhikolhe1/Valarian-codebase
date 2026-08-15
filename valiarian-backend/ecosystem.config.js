// Codifies the UAT PM2 process as actually verified on the server (via
// `pm2 jlist`) at the time this pipeline was built. Intentionally kept at
// instances: 1 / fork_mode — the backend runs two unconditional in-process
// timers (PendingOrderCleanupService, PremiumPreorderExpiryService) with no
// distributed lock. Running more than one instance would duplicate order
// cancellations, Razorpay refunds, and customer emails. Do not raise
// `instances` or switch to cluster mode without adding a lock/leader-election
// for those two services first.
module.exports = {
  apps: [
    {
      name: 'valiarian-backend-uat',
      script: './dist/index.js',
      cwd: '/var/www/valiarian-uat/Valarian-codebase/valiarian-backend',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
      },
    },
  ],
};
