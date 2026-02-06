/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本番ビルド最適化: standaloneモードでコンテナサイズ削減
  output: 'standalone',

  // X-Powered-By ヘッダーを無効化（セキュリティ + レスポンスサイズ削減）
  poweredByHeader: false,

  // 画像最適化設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // 画像フォーマットの最適化（WebP + AVIF対応）
    formats: ['image/avif', 'image/webp'],
  },

  // API Body Size Limit（画像アップロード用に10MBに設定）
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // ビルド時のCSSチャンク最適化
    optimizeCss: false,
  },

  // コンパイラ最適化
  compiler: {
    // 本番ビルドでconsole.logを除去（パフォーマンス + セキュリティ）
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
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
      // 静的アセットに長期キャッシュヘッダーを設定
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
