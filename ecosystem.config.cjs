module.exports = {
  apps: [
    {
      name: "sr-books-production",
      script: ".next/standalone/server.js",
      instances: "max", // Scale across all available CPU cores
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      exp_backoff_restart_delay: 200,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
  ],
};
