module.exports = [{
  name: "quack-nkn",
  script: "./index.ts",
  instances: 1,
  autorestart: true,
  watch: false,
  exp_backoff_restart_delay: 10000,
  cron_restart: '0 0 * * *',
  wait_ready: true,
  listen_timeout: 60000,
}]
