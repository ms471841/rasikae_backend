module.exports = {
  apps: [
    {
      name: "rasikae-api",
      script: "./dist/main.js", // TypeScript compiled output
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
