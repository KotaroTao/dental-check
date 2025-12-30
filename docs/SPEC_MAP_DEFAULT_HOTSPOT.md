# QR読み取りエリア地図 - 最多読み込み地域をデフォルト表示

## 概要

QR読み取りエリアの地図で、デフォルト表示位置を「最も読み込み回数が多い地域」に変更する。

---

## 現状の動作

| 条件 | デフォルト中心位置 | ズームレベル |
|------|-------------------|--------------|
| マーカーあり | マーカー全体の中心 | 範囲に応じて自動調整 |
| マーカーなし + クリニック住所あり | クリニック住所の座標 | 11（市レベル） |
| マーカーなし + クリニック住所なし | 日本の中心 `[36.5, 138.0]` | 5（日本全体） |

---

## 変更後の動作

| 条件 | デフォルト中心位置 | ズームレベル |
|------|-------------------|--------------|
| マーカーあり | **最多読み込み地域の座標** | 11（市レベル） |
| マーカーなし + クリニック住所あり | クリニック住所の座標 | 11（市レベル） |
| マーカーなし + クリニック住所なし | 日本の中心 `[36.5, 138.0]` | 5（日本全体） |

---

## 技術仕様

### 1. API変更（`/api/dashboard/locations`）

**追加レスポンスフィールド:**

```typescript
interface LocationsResponse {
  // 既存
  locations: LocationData[];
  topRegions: { region: string; count: number }[];
  total: number;
  clinicCenter: { latitude: number; longitude: number } | null;
  period: { from: string; to: string };

  // 追加
  hotspot: {
    latitude: number;
    longitude: number;
    region: string;
    city: string;
    town: string | null;
    count: number;
  } | null;
}
```

**ロジック:**
1. `locations` 配列は既に `_count.id` の降順でソート済み
2. 最初の要素（最多読み込み地域）の座標を `hotspot` として返却
3. GPS座標がない場合は都道府県中心座標にフォールバック

### 2. フロントエンド変更（`location-map.tsx`）

**Props変更:**

```typescript
interface LocationMapProps {
  locations: LocationData[];
  clinicCenter?: { latitude: number; longitude: number } | null;
  // 追加
  hotspot?: {
    latitude: number;
    longitude: number;
    region: string;
    city: string;
    count: number;
  } | null;
}
```

**中心座標の決定ロジック:**

```typescript
const defaultCenter: [number, number] = useMemo(() => {
  // 1. 最多読み込み地域があればそこを中心に
  if (hotspot) {
    return [hotspot.latitude, hotspot.longitude];
  }
  // 2. クリニック住所があればそこを中心に
  if (clinicCenter) {
    return [clinicCenter.latitude, clinicCenter.longitude];
  }
  // 3. どちらもなければ日本の中心
  return [36.5, 138.0];
}, [hotspot, clinicCenter]);
```

**ズームレベルの決定ロジック:**

```typescript
const initialZoom = useMemo(() => {
  if (!bounds) {
    // マーカーがない場合
    if (hotspot || clinicCenter) return 11; // 市レベル
    return 5; // 日本全体
  }
  // マーカーがある場合は範囲に応じたズーム
  // ...既存のロジック
}, [bounds, hotspot, clinicCenter]);
```

### 3. location-section.tsx の変更

```typescript
// hotspot を state に追加
const [hotspot, setHotspot] = useState<{
  latitude: number;
  longitude: number;
  region: string;
  city: string;
  count: number;
} | null>(null);

// fetch 時に hotspot を取得
const data = await response.json();
setHotspot(data.hotspot || null);

// LocationMap に渡す
<LocationMap
  locations={validLocations}
  clinicCenter={clinicCenter}
  hotspot={hotspot}
/>
```

---

## 優先順位

1. **最多読み込み地域** - ユーザーが最も関心のある地域
2. **クリニック住所** - 初回利用時やデータがない場合のフォールバック
3. **日本の中心** - 最終フォールバック

---

## 考慮事項

### GPS座標がない場合

診断セッションにGPS座標がない場合（ユーザーが位置情報を許可しなかった等）:
- 都道府県の中心座標を使用（`PREFECTURE_CENTERS`）
- これは既存のマーカー表示ロジックと同じ

### 同一件数の地域が複数ある場合

- DBのソート順（降順）に従い、最初にヒットした地域を採用
- 追加のソート条件は不要（ユーザー体験に大きな影響なし）

### 期間フィルター適用時

- 選択期間内での最多読み込み地域を表示
- 期間を変更すると中心位置も動的に変わる

---

## 影響範囲

| ファイル | 変更内容 |
|----------|----------|
| `src/app/api/dashboard/locations/route.ts` | `hotspot` フィールド追加 |
| `src/components/dashboard/location-map.tsx` | `hotspot` prop 対応、中心座標ロジック変更 |
| `src/components/dashboard/location-section.tsx` | `hotspot` state 追加、API レスポンス処理 |

---

## テスト項目

- [ ] 読み込みデータがある場合、最多地域が中心に表示される
- [ ] 読み込みデータがない場合、クリニック住所が中心に表示される
- [ ] クリニック住所もない場合、日本全体が表示される
- [ ] 期間フィルターを変更すると、その期間の最多地域に中心が変わる
- [ ] GPS座標がない地域でも、都道府県中心で正しく表示される
