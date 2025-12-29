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

// Nominatim APIレスポンスから町丁目を取得（フォールバック付き）
const town = address.neighbourhood  // 最優先: 町丁目名
  || address.quarter                // 代替1: 地区名
  || address.suburb                 // 代替2: 郊外地区名
  || null;                          // 取得できない場合はnull
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
├── towns/
│   ├── 01_hokkaido.json    # 北海道の全町丁目
│   ├── 13_tokyo.json       # 東京都の全町丁目
│   ├── 27_osaka.json       # 大阪府の全町丁目
│   └── ...                 # 47都道府県分
└── index.json              # メタデータ（都道府県コード対応表）
```

**GeoJSON Feature構造**:
```json
{
  "type": "Feature",
  "properties": {
    "pref": "東京都",
    "city": "渋谷区",
    "town": "神南一丁目",
    "town_code": "13113001001"
  },
  "geometry": { "type": "Polygon", "coordinates": [...] }
}
```

### 4.3 ファイルサイズ目安
| 単位 | ファイル数 | 合計サイズ |
|------|-----------|-----------|
| 都道府県 | 47 | 約200KB |
| 市区町村 | 約1,900 | 約5-15MB |
| 町丁目 | 約200,000 | 約50-100MB |

### 4.4 動的ロード戦略
```typescript
// 都道府県単位でGeoJSONをロード（エラーハンドリング付き）
async function loadTownGeoJSON(prefCode: string): Promise<FeatureCollection | null> {
  try {
    const url = `/geojson/towns/${prefCode}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`GeoJSON not found: ${prefCode}`);
      return null;  // ファイルが存在しない場合はnullを返す
    }

    return response.json();
  } catch (error) {
    console.error(`Failed to load GeoJSON: ${prefCode}`, error);
    return null;  // ネットワークエラー時もnullを返す
  }
}
```

### 4.5 GeoJSONデータ取得・加工手順

**1. データダウンロード**
```bash
# 国土数値情報 町丁目界データ
# https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-v3_1.html
wget https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2024/N03-20240101_GML.zip
```

**2. 変換・分割スクリプト**
```bash
# Shapefile → GeoJSON変換（ogr2ogr使用）
ogr2ogr -f GeoJSON tokyo.json N03-20240101.shp -where "N03_001='東京都'"

# 頂点数削減（mapshaper使用）
mapshaper tokyo.json -simplify 10% -o tokyo_simplified.json
```

**3. 都道府県コード対応表** (`index.json`)
```json
{
  "prefectures": {
    "北海道": "01_hokkaido",
    "東京都": "13_tokyo",
    "大阪府": "27_osaka"
  }
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
        const data = await loadTownGeoJSON(prefCode);

        if (data) {
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

### 5.4 町丁目名マッチング仕様

DBに保存された町丁目名とGeoJSONの`properties.town`をマッチングする際のルール:

| ルール | 例 | 説明 |
|--------|-----|------|
| 完全一致 | `神南一丁目` = `神南一丁目` | 最優先 |
| 数字正規化 | `神南1丁目` → `神南一丁目` | 算用数字→漢数字変換 |
| 丁目省略対応 | `神南一` → `神南一丁目` | 「丁目」を補完 |

```typescript
// 町丁目名の正規化
function normalizeTownName(name: string): string {
  return name
    .replace(/1/g, '一').replace(/2/g, '二').replace(/3/g, '三')
    .replace(/4/g, '四').replace(/5/g, '五').replace(/6/g, '六')
    .replace(/7/g, '七').replace(/8/g, '八').replace(/9/g, '九')
    .replace(/([一二三四五六七八九])$/, '$1丁目');
}

// マッチング処理
function findMatchingFeature(town: string, features: Feature[]): Feature | null {
  const normalized = normalizeTownName(town);
  return features.find(f =>
    normalizeTownName(f.properties.town) === normalized
  ) || null;
}
```

### 5.5 UI表示仕様

#### ツールチップ
ホバー時に表示する情報:
| 項目 | 例 |
|------|-----|
| 町丁目名 | 神南一丁目 |
| 診断件数 | 12件 |
| 全体比率 | 3.2% |

```typescript
const tooltip = `${town.name}\n${town.count}件 (${town.percentage}%)`;
```

#### 境界線スタイル
| 状態 | 線の太さ | 色 |
|------|---------|-----|
| データあり | 2px | #3B82F6 (青) |
| データなし | 1px | #9CA3AF (グレー) |
| ホバー時 | 3px | #1D4ED8 (濃い青) |

```typescript
const getStyle = (feature: Feature, hasData: boolean, isHovered: boolean) => ({
  stroke: true,
  color: hasData ? (isHovered ? '#1D4ED8' : '#3B82F6') : '#9CA3AF',
  weight: isHovered ? 3 : (hasData ? 2 : 1),
  fill: false,  // 塗りつぶしなし
});
```

#### モバイル対応
- タッチ操作: タップで町丁目選択、ツールチップ表示
- 最小タップ領域: 44x44px
- ピンチズーム: 対応

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
| ブラウザ | HTTP Cache (Cache-Control) | 7日 |
| Next.js | メモリキャッシュ (React state) | セッション中 |
| CDN | Cache-Control: immutable | 30日 |

**HTTPヘッダー設定** (nginx):
```nginx
location /geojson/ {
  add_header Cache-Control "public, max-age=604800, immutable";
}
```

### 7.2 表示ロジック

**初期表示**:
- データがある都道府県の境界線を表示（既存機能）
- 件数をツールチップで表示

**都道府県クリック時**:
1. クリックされた都道府県のGeoJSONをロード
2. データがある町丁目のみ境界線を表示
3. 地図を該当エリアにズーム

**フォールバック**:
- GeoJSONロード失敗時: 都道府県レベル表示を維持
- 町丁目マッチング失敗時: 市区町村名で表示

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
| 1.1 | 2025-12-29 | 仕様改善: GeoJSON構造簡略化、フォールバック追加、UI仕様追加 |
