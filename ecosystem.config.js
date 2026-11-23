/**
 * Standard Roofs Books (SR-Books) - PM2 Process Management & Cluster Configuration
 * Designed for Multi-Core Zero-Downtime Reloads on Windows/Linux host environments
 */

module.exports = {
  apps: [
    {
      name: "sr-books-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: process.env.PM2_INSTANCES || 2, // Cluster mode across 2 cores or 'max'
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1024M", // Automatically restart if memory exceeds 1GB
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      error_file: "./logs/pm2-err.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      combine_logs: true,
      autorestart: true,
      exp_backoff_restart_delay: 200,
    },
  ],
};
