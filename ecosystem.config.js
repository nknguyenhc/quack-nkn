module.exports = [{
  name: "quack-nkn",
  script: "./index.ts",
  instances: 1,
  autorestart: true,
  watch: false,
  exp_backoff_restart_delay: 10000,
  wait_ready: true,
  listen_timeout: 60000,
}]
