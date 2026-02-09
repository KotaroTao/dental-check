/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本番ビルド最適化: standaloneモードでコンテナサイズ削減
  output: 'standalone',

  // A5: 画像最適化 - 許可するドメインを限定（不正利用防止）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qrqr-dental.com',
      },
      {
        protocol: 'https',
        hostname: '*.qrqr-dental.com',
      },
    ],
  },

  // API Body Size Limit（画像アップロード用に10MBに設定）
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // C6: HSTS - ブラウザに「常にHTTPSで接続して」と伝えるヘッダー
            // max-age=1年, サブドメインも含む
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            // C6: 不要なブラウザ機能を無効化（プライバシー保護）
            // camera/microphone等はこのアプリでは不要
            // geolocation=selfは診断の位置情報取得で必要
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), usb=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
