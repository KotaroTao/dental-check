# 診断実施エリア表示機能 仕様書

## 概要

診断が実施された地域をIPアドレスから推定し、ダッシュボードで市区町村別に表示する機能。

## 方針

- **位置取得方法:** IPアドレスからの地域推定（GPS不使用）
- **精度:** 都道府県・市区町村レベル
- **ユーザー許可:** 不要（ブラウザ許可ダイアログなし）
- **表示形式:** 市区町村別リスト + 簡易マップ

---

## データベース設計

### DiagnosisSession テーブルへの追加フィールド

```prisma
model DiagnosisSession {
  // 既存フィールド...

  // 位置情報（IPベース）
  ipAddress     String?  @map("ip_address")
  country       String?  // 国コード (JP)
  region        String?  // 都道府県 (兵庫県)
  city          String?  // 市区町村 (西宮市)
  latitude      Float?   // 緯度（市区町村中心点）
  longitude     Float?   // 経度（市区町村中心点）
}
```

### AccessLog テーブルへの追加フィールド

```prisma
model AccessLog {
  // 既存フィールド...

  ipAddress     String?  @map("ip_address")
  country       String?
  region        String?
  city          String?
}
```

---

## IP地域推定サービス

### 選択肢

| サービス | 無料枠 | 精度 | 推奨 |
|---------|-------|------|------|
| ip-api.com | 45req/分 | 高 | ◎ 開発・小規模向け |
| ipinfo.io | 50,000/月 | 高 | ○ 本番向け |
| MaxMind GeoLite2 | 無制限(ローカルDB) | 中 | ○ 大規模向け |

### 初期実装: ip-api.com（無料）

```typescript
// lib/geolocation.ts
interface GeoLocation {
  country: string;      // "Japan"
  countryCode: string;  // "JP"
  region: string;       // "Hyogo"
  regionName: string;   // "兵庫県"
  city: string;         // "Nishinomiya"
  lat: number;          // 34.7333
  lon: number;          // 135.3417
}

async function getLocationFromIP(ip: string): Promise<GeoLocation | null> {
  const response = await fetch(`http://ip-api.com/json/${ip}?lang=ja`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 'success') return null;
  return data;
}
```

---

## API設計

### 1. 診断完了時の位置記録（既存API修正）

**エンドポイント:** `POST /api/track/complete`

**処理追加:**
```typescript
// リクエストからIPアドレスを取得
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]
        || request.headers.get('x-real-ip')
        || 'unknown';

// IP地域推定
const location = await getLocationFromIP(ip);

// DiagnosisSession作成時に位置情報を含める
await prisma.diagnosisSession.create({
  data: {
    // 既存フィールド...
    ipAddress: ip,
    country: location?.countryCode,
    region: location?.regionName,
    city: location?.city,
    latitude: location?.lat,
    longitude: location?.lon,
  }
});
```

### 2. エリア統計API（新規）

**エンドポイント:** `GET /api/dashboard/locations`

**クエリパラメータ:**
- `period`: today | week | month | custom
- `startDate`: カスタム期間開始日
- `endDate`: カスタム期間終了日
- `channelId`: 経路フィルター（オプション）

**レスポンス:**
```json
{
  "locations": [
    {
      "region": "兵庫県",
      "city": "西宮市",
      "count": 23,
      "latitude": 34.7333,
      "longitude": 135.3417
    },
    {
      "region": "兵庫県",
      "city": "神戸市",
      "count": 18,
      "latitude": 34.6901,
      "longitude": 135.1956
    }
  ],
  "total": 85,
  "topRegions": [
    { "region": "兵庫県", "count": 45 },
    { "region": "大阪府", "count": 28 }
  ]
}
```

---

## フロントエンド設計

### ダッシュボードへの追加セクション

**配置:** 統計サマリーの下、診断完了履歴の上

```
┌─ ダッシュボード ─────────────────────────────┐
│                                              │
│ [経路セクション]                              │
│                                              │
│ [統計サマリー]                                │
│                                              │
│ [診断実施エリア] ← 新規追加                   │
│ ┌────────────────┬─────────────────────────┐ │
│ │                │ 診断実施エリア TOP10     │ │
│ │   [簡易地図]    │                         │ │
│ │    ● ●        │ 1. 西宮市    23件 ████  │ │
│ │      ●        │ 2. 神戸市    18件 ███   │ │
│ │               │ 3. 大阪市    12件 ██    │ │
│ │               │ 4. 尼崎市     8件 █     │ │
│ │               │ 5. 芦屋市     6件 █     │ │
│ └────────────────┴─────────────────────────┘ │
│                                              │
│ [診断完了履歴]                                │
│                                              │
└──────────────────────────────────────────────┘
```

### 地図コンポーネント

**ライブラリ:** Leaflet + React-Leaflet（無料・軽量）

```typescript
// components/dashboard/location-map.tsx
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';

interface LocationMapProps {
  locations: Array<{
    city: string;
    count: number;
    latitude: number;
    longitude: number;
  }>;
}

export function LocationMap({ locations }: LocationMapProps) {
  // 日本の中心付近を初期表示
  const center = [35.6762, 139.6503]; // 東京

  return (
    <MapContainer center={center} zoom={6} className="h-64 rounded-lg">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {locations.map((loc) => (
        <CircleMarker
          key={loc.city}
          center={[loc.latitude, loc.longitude]}
          radius={Math.min(20, 5 + loc.count / 2)}
          fillColor="#3b82f6"
          fillOpacity={0.6}
        >
          <Tooltip>{loc.city}: {loc.count}件</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
```

---

## 実装手順

### Phase 1: バックエンド（1日）
1. [ ] Prismaスキーマ更新（位置情報フィールド追加）
2. [ ] マイグレーション実行
3. [ ] `lib/geolocation.ts` 作成（IP地域推定）
4. [ ] `/api/track/complete` 修正（位置情報記録）
5. [ ] `/api/track/access` 修正（位置情報記録）
6. [ ] `/api/dashboard/locations` 新規作成

### Phase 2: フロントエンド（1日）
1. [ ] react-leaflet インストール
2. [ ] `LocationMap` コンポーネント作成
3. [ ] `LocationList` コンポーネント作成
4. [ ] ダッシュボードページに統合
5. [ ] 期間フィルター連動

### Phase 3: テスト・調整（0.5日）
1. [ ] ローカルテスト（IP取得確認）
2. [ ] 本番デプロイ
3. [ ] 実データでの動作確認

---

## プライバシーポリシー更新

以下の文言をプライバシーポリシーに追記：

```
【位置情報について】
サービス改善および統計分析のため、IPアドレスから推定される
おおよその地域情報（都道府県・市区町村レベル）を収集することがあります。
GPSによる詳細な位置情報は収集しません。
収集した地域情報は統計目的でのみ使用し、個人を特定する目的では使用しません。
```

---

## 注意事項

1. **IP地域推定の限界**
   - モバイル回線は精度が低い場合がある
   - VPN使用時は正確な位置が取れない
   - 企業ネットワークは本社所在地になることがある

2. **APIレート制限**
   - ip-api.com: 45リクエスト/分
   - 高トラフィック時は有料サービスまたはローカルDBへの移行を検討

3. **開発環境での動作**
   - localhost では正確なIPが取れない
   - テスト時は固定IPでモック可能

---

## 将来の拡張案

- 都道府県別ヒートマップ表示
- 時間帯別の地域分布
- 経路別の地域比較
- CSVエクスポート機能
