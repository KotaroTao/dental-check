/**
 * PM2 Ecosystem Configuration
 *
 * サーバーの /var/www/ecosystem.config.js にコピー
 *
 * 使用方法:
 *   pm2 start ecosystem.config.js          # 全アプリ起動
 *   pm2 start ecosystem.config.js --only dental-app      # 本番のみ起動
 *   pm2 start ecosystem.config.js --only dental-staging  # ステージングのみ起動
 *   pm2 reload ecosystem.config.js         # 全アプリ再読み込み
 *   pm2 delete ecosystem.config.js         # 全アプリ停止・削除
 */

module.exports = {
  apps: [
    // ===========================================
    // 本番環境
    // ===========================================
    {
      name: 'dental-app',
      cwd: '/var/www/dental-check',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // ログ設定
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/dental-app-error.log',
      out_file: '/var/log/pm2/dental-app-out.log',
      merge_logs: true,
      // 起動時の待機
      wait_ready: true,
      listen_timeout: 10000,
      // クラッシュ時の再起動制限
      max_restarts: 10,
      min_uptime: '10s'
    },

    // ===========================================
    // ステージング環境
    // ===========================================
    {
      name: 'dental-staging',
      cwd: '/var/www/dental-staging',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',  // ステージングはメモリ制限を低めに
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // ログ設定
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/dental-staging-error.log',
      out_file: '/var/log/pm2/dental-staging-out.log',
      merge_logs: true,
      // 起動時の待機
      wait_ready: true,
      listen_timeout: 10000,
      // クラッシュ時の再起動制限
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
