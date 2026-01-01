/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本番ビルド最適化: standaloneモードでコンテナサイズ削減
  output: 'standalone',

  // 画像最適化設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
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
        ],
      },
    ];
  },
};

export default nextConfig;
