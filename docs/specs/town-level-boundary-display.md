# 町丁目レベル境界線表示 仕様書

## 1. 概要

### 1.1 目的
ダッシュボードの地図表示を現在の都道府県レベルから町丁目レベルに細分化し、より詳細な地域分析を可能にする。

### 1.2 現状
| 項目 | 現在の状態 |
|------|-----------|
| 表示レベル | 都道府県（47区分） |
| 保存データ | region（都道府県）, city（市区町村） |
| GeoJSONサイズ | 約10KB（簡略化バウンディングボックス） |
| 境界線表示 | 都道府県の境界線のみ |

### 1.3 目標
| 項目 | 目標状態 |
|------|---------|
| 表示レベル | 町丁目（約20万区分） |
| 保存データ | region, city, **town**（町丁目）を追加 |
| GeoJSONサイズ | 約50-100MB（動的ロード必須） |
| 境界線表示 | 町丁目の境界線 |

---

## 2. データ構造の変更

### 2.1 データベーススキーマ

```prisma
// schema.prisma
model DiagnosisSession {
  // 既存フィールド
  region    String?   // 都道府県
  city      String?   // 市区町村

  // 新規追加
  town      String?   // 町丁目（例: "神南一丁目"）

  // 緯度経度は引き続き保存しない
  latitude  Float?    // null
  longitude Float?    // null
}
```

### 2.2 マイグレーション

```sql
ALTER TABLE "DiagnosisSession" ADD COLUMN "town" TEXT;
CREATE INDEX "DiagnosisSession_town_idx" ON "DiagnosisSession"("town");
```

---

## 3. 逆ジオコーディングの更新

### 3.1 現在の実装
```typescript
// src/app/api/track/update-location/route.ts
const location = await reverseGeocode(lat, lng);
// 返却: { region, city, country }
```

### 3.2 変更後の実装
```typescript
const location = await reverseGeocode(lat, lng);
// 返却: { region, city, town, country }

// Nominatim APIレスポンスから町丁目を取得
// address.neighbourhood, address.suburb, address.quarter などを使用
```

### 3.3 Nominatim APIレスポンス例
```json
{
  "address": {
    "neighbourhood": "神南一丁目",
    "suburb": "神南",
    "city": "渋谷区",
    "state": "東京都",
    "country": "日本"
  }
}
```

---

## 4. GeoJSONデータ

### 4.1 データソース
| ソース | 概要 | ライセンス |
|--------|------|-----------|
| 国土数値情報（MLIT） | 町丁目界データ | CC BY 4.0 |
| e-Stat | 統計地理情報 | 政府統計利用規約 |

### 4.2 データ構造
```
/public/geojson/
├── prefectures/
│   ├── 01_hokkaido/
│   │   ├── 01100_sapporo.json      # 札幌市
│   │   ├── 01101_chuo-ku.json      # 中央区
│   │   └── ...
│   ├── 13_tokyo/
│   │   ├── 13101_chiyoda.json      # 千代田区
│   │   ├── 13102_chuo.json         # 中央区
│   │   └── ...
│   └── ...
└── index.json                       # メタデータ
```

### 4.3 ファイルサイズ目安
| 単位 | ファイル数 | 合計サイズ |
|------|-----------|-----------|
| 都道府県 | 47 | 約200KB |
| 市区町村 | 約1,900 | 約5-15MB |
| 町丁目 | 約200,000 | 約50-100MB |

### 4.4 動的ロード戦略
```typescript
// 表示エリアに応じて必要なファイルのみロード
async function loadTownGeoJSON(prefCode: string, cityCode: string) {
  const url = `/geojson/prefectures/${prefCode}/${cityCode}.json`;
  const response = await fetch(url);
  return response.json();
}
```

---

## 5. フロントエンド実装

### 5.1 コンポーネント構成
```
src/components/dashboard/
├── location-section.tsx      # 既存（ラッパー）
├── location-map.tsx          # 変更（町丁目対応）
└── town-geojson-loader.tsx   # 新規（動的ロード）
```

### 5.2 地図コンポーネントの変更

```typescript
// location-map.tsx
interface LocationData {
  region: string | null;
  city: string | null;
  town: string | null;  // 追加
  count: number;
}

// 町丁目レベルでの集計・表示
const townData = useMemo(() => {
  const data: Record<string, { count: number }> = {};
  for (const loc of locations) {
    if (!loc.town) continue;
    const key = `${loc.region}-${loc.city}-${loc.town}`;
    if (!data[key]) data[key] = { count: 0 };
    data[key].count += loc.count;
  }
  return data;
}, [locations]);
```

### 5.3 動的ロード実装

```typescript
// town-geojson-loader.tsx
export function useTownGeoJSON(regions: string[]) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const features: Feature[] = [];

      for (const region of regions) {
        const prefCode = getPrefCode(region);
        const cities = await getCitiesWithData(region);

        for (const city of cities) {
          const cityCode = getCityCode(city);
          const data = await loadTownGeoJSON(prefCode, cityCode);
          features.push(...data.features);
        }
      }

      setGeoData({ type: "FeatureCollection", features });
      setLoading(false);
    }

    loadData();
  }, [regions]);

  return { geoData, loading };
}
```

---

## 6. API変更

### 6.1 位置情報更新API
```typescript
// src/app/api/track/update-location/route.ts
await prisma.diagnosisSession.update({
  where: { id: sessionId },
  data: {
    latitude: null,
    longitude: null,
    region: location?.region || null,
    city: location?.city || null,
    town: location?.town || null,  // 追加
    country: location?.country || "JP",
  },
});
```

### 6.2 ダッシュボードAPI
```typescript
// src/app/api/dashboard/locations/route.ts
const locationData = await prisma.diagnosisSession.groupBy({
  by: ["region", "city", "town", "channelId"],  // townを追加
  where: { ... },
  _count: { id: true },
});
```

---

## 7. パフォーマンス最適化

### 7.1 キャッシュ戦略
| レイヤー | 方法 | TTL |
|---------|------|-----|
| ブラウザ | Service Worker | 7日 |
| CDN | Cache-Control | 30日 |
| サーバー | Redis | 1日 |

### 7.2 遅延ロード
- 初期表示: 都道府県レベルのみ
- ズームイン時: 市区町村レベルをロード
- さらにズーム: 町丁目レベルをロード

### 7.3 簡略化
```typescript
// GeoJSONの頂点数を削減
// 元データ: 約1000頂点/ポリゴン
// 簡略化後: 約50-100頂点/ポリゴン
```

---

## 8. プライバシー考慮事項

### 8.1 データ保存
| データ | 保存 | 理由 |
|--------|------|------|
| GPS座標 | ❌ 保存しない | 個人特定リスク |
| 町丁目名 | ✅ 保存する | 統計目的のみ |

### 8.2 表示ポリシー
- データが1件でもあれば町丁目レベルで表示する
- 件数に関わらず、取得できた位置情報はすべて地図上に反映

### 8.3 プライバシーポリシー更新
```markdown
位置情報は町丁目レベル（例: ○○区△△一丁目）まで取得し、
統計目的のみに利用されます。
GPS座標（緯度・経度）は保存されません。
```

---

## 9. 実装フェーズ

### Phase 1: データ準備（1-2週間）
- [ ] 町丁目GeoJSONデータの取得・加工
- [ ] ファイル分割・最適化
- [ ] CDN/ストレージへのデプロイ

### Phase 2: バックエンド（3-5日）
- [ ] DBスキーマ変更（townカラム追加）
- [ ] マイグレーション実行
- [ ] 逆ジオコーディング更新（town取得）
- [ ] ダッシュボードAPI更新

### Phase 3: フロントエンド（1週間）
- [ ] 動的GeoJSONローダー実装
- [ ] 地図コンポーネント更新
- [ ] ズームレベル連動表示
- [ ] パフォーマンス最適化

### Phase 4: テスト・リリース（3-5日）
- [ ] 各都道府県での動作確認
- [ ] パフォーマンステスト
- [ ] プライバシーポリシー更新
- [ ] 本番デプロイ

---

## 10. 技術的リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| GeoJSONサイズが大きすぎる | 読み込み遅延 | 動的ロード、簡略化 |
| 町丁目名のマッチング失敗 | 表示されない | フォールバック表示 |
| Nominatim APIレート制限 | 位置取得失敗 | キャッシュ、代替API |
| ブラウザメモリ不足 | クラッシュ | 表示数制限、仮想化 |

---

## 11. 代替案

### 11.1 外部サービス利用
- **Mapbox**: 町丁目レベルのベクタータイル提供
- **Google Maps**: 行政区画表示API
- **メリット**: 実装コスト削減
- **デメリット**: 月額費用、依存関係

### 11.2 段階的実装
1. まず市区町村レベルを実装
2. 需要があれば町丁目レベルに拡張

---

## 12. 承認

| 役割 | 名前 | 日付 | 署名 |
|------|------|------|------|
| 作成者 | | | |
| レビュアー | | | |
| 承認者 | | | |

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2025-12-29 | 初版作成 |
