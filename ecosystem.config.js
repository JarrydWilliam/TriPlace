/**
 * ecosystem.config.js — PM2 configuration for 24/7 TriPlace server monitoring.
 *
 * PM2 is the production-grade process manager. Use this for real deployment.
 *
 * Setup:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.js
 *   pm2 save              (auto-restart on machine reboot)
 *   pm2 startup           (install startup hook)
 *
 * Useful commands:
 *   pm2 status            (see all running processes)
 *   pm2 logs triplace     (live server logs)
 *   pm2 restart triplace  (manual restart)
 *   pm2 monit             (real-time CPU/memory dashboard)
 */

module.exports = {
  apps: [
    {
      name: "triplace",
      script: "node_modules/.bin/tsx",
      args: "server/index.ts",
      cwd: "./",
      watch: false,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },

      // ── Restart policy ───────────────────────────────────────────────────
      autorestart: true,
      max_restarts: 50,
      min_uptime: "10s",        // Must be up 10s to count as a clean start
      restart_delay: 3000,      // 3s between restarts

      // ── Health monitoring ────────────────────────────────────────────────
      // PM2 will restart if memory exceeds 512MB
      max_memory_restart: "512M",

      // ── Logs ────────────────────────────────────────────────────────────
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,

      // ── Cluster mode (optional, scales to multiple cores) ───────────────
      instances: 1,          // Set to "max" to use all CPU cores
      exec_mode: "fork",     // Change to "cluster" for multi-instance
    }
  ]
};
