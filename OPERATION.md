# くるくる診断DX 運用マニュアル

## プロジェクト概要

歯科医院向けのQRコードベース診断ツール。患者がQRコードをスキャンして診断を受け、結果に基づいて来院を促進する。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **データベース**: PostgreSQL (Prisma ORM)
- **認証**: JWT (jose)
- **決済**: PAY.JP
- **サーバー**: VPS (Ubuntu) + Nginx + PM2

## VPSサーバー情報

- **ドメイン**: https://qrqr-dental.com
- **アプリケーションパス**: `/var/www/dental-check`
- **PM2プロセス名**: `dental-app`
- **Node.jsバージョン**: 18.x以上推奨

## 管理者アカウント

- **メール**: mail@function-t.com
- **パスワード**: MUNP1687
- **管理者パネル**: https://qrqr-dental.com/admin

## デプロイ手順

### 1. ローカルでビルド確認
```bash
npm run build
```

### 2. コミット & プッシュ
```bash
git add -A
git commit -m "変更内容"
git push origin <branch-name>
```

### 3. VPSでデプロイ
```bash
cd /var/www/dental-check
git fetch origin <branch-name>
git reset --hard origin/<branch-name>
npm run build
pm2 restart dental-app
```

### 簡易デプロイコマンド（1行）
```bash
cd /var/www/dental-check && git fetch origin <branch-name> && git reset --hard origin/<branch-name> && npm run build && pm2 restart dental-app
```

## ロールバック手順

### コミット履歴確認
```bash
cd /var/www/dental-check
git log --oneline -10
```

### 特定コミットに戻す
```bash
git reset --hard <commit-hash>
npm run build
pm2 restart dental-app
```

## Prismaデータベース操作

### スキーマ変更後
```bash
npx prisma db push
```

### Prisma Studio（DB閲覧）
```bash
npx prisma studio
```

## PM2コマンド

```bash
pm2 status              # プロセス状態確認
pm2 logs dental-app     # ログ確認
pm2 restart dental-app  # 再起動
pm2 stop dental-app     # 停止
pm2 start dental-app    # 開始
```

## Nginx設定

### 設定ファイル
```
/etc/nginx/sites-available/dental-check
```

### 現在の重要設定
```nginx
server {
    server_name qrqr-dental.com;
    client_max_body_size 15M;  # ファイルアップロード上限

    # アップロードされた画像を直接提供
    location /uploads {
        alias /var/www/dental-check/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        ...
    }
}
```

### 設定変更後
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 主要ディレクトリ構造

```
src/
├── app/
│   ├── admin/           # 管理者パネル
│   │   ├── clinics/     # 医院管理
│   │   ├── diagnoses/   # 診断タイプ管理
│   │   └── page.tsx     # 管理者ダッシュボード
│   ├── api/
│   │   ├── admin/       # 管理者API
│   │   ├── auth/        # 認証API
│   │   ├── clinic/      # 医院API
│   │   └── upload/      # 画像アップロードAPI
│   ├── dashboard/       # 医院ダッシュボード
│   ├── c/[code]/        # QRコードアクセス（患者向け）
│   └── login/           # ログインページ
├── components/
│   ├── admin/           # 管理者用コンポーネント
│   └── ui/              # 共通UIコンポーネント
└── lib/
    ├── auth.ts          # 医院認証
    ├── admin-auth.ts    # 管理者認証
    ├── prisma.ts        # Prismaクライアント
    └── plans.ts         # プラン定義
```

## 画像アップロード

- **保存先**: `public/uploads/{folder}/`
- **フォルダ種類**: `clinic`, `channels`, `diagnoses`
- **対応形式**: JPEG, PNG, WebP, GIF, HEIC/HEIF
- **サイズ上限**: 10MB（Nginx側で15MB）

## 認証システム

### 医院認証
- Cookie名: `auth_token`
- JWT有効期限: 7日間
- TokenPayload: `{ clinicId, email, isAdmin? }`

### 管理者認証
- Cookie名: `admin_token`
- 管理者は通常ログインページからも任意の医院にアクセス可能

## 環境変数（.env）

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
PAYJP_SECRET_KEY="..."
PAYJP_PUBLIC_KEY="..."
NEXT_PUBLIC_BASE_URL="https://qrqr-dental.com"
```

## トラブルシューティング

### 画像アップロードエラー
1. Nginx `client_max_body_size` 確認（15M以上推奨）
2. `/var/www/dental-check/public/uploads/` の権限確認
3. PM2ログでエラー確認: `pm2 logs dental-app`

### 画像が表示されない
1. Nginxの`location /uploads`設定確認
2. `sudo nginx -t && sudo systemctl reload nginx`実行

### ビルドエラー
1. TypeScript型エラー: 型注釈を追加
2. 未使用変数: 削除または`_`プレフィックス
3. React Hooks依存配列: eslint-disable-next-line追加

### クライアントサイドエラー
- `use(params)` → `useParams()` に変更（Next.js 14）
- サーバーコンポーネントとクライアントコンポーネントの分離確認

## 最近の主要変更（2026/01/14）

1. **管理者パネルから医院ダッシュボードにログイン機能**
   - `/api/admin/clinics/[id]/login` API追加
   - 医院一覧ページにログインボタン追加

2. **通常ログインページから管理者が任意の医院にアクセス**
   - `/api/auth/admin-clinics` API追加
   - ログインページに医院選択UI追加

3. **画像アップロード修正**
   - MIMEタイプが空の場合も拡張子でチェック
   - Nginx設定で`/uploads`を直接提供

## データベースバックアップ

### 手動バックアップ
```bash
pg_dump -U postgres dental_check > /var/backups/dental-check/manual_backup.sql
```

### バックアップ保存先
```
/var/backups/dental-check/
```

## 連絡先

- **開発担当**: Claude Code
- **GitHub**: https://github.com/KotaroTao/dental-check
