# QR読み取りエリア地図 - 地域クリックで地図表示

## 概要

QR読み取りエリアのリストで地域名をクリックすると、その地域を地図の中心に表示する機能を追加する。
また、地域が多数（100件超）になった場合の表示方法も改善する。

---

## 現状の動作

- 地図のデフォルト中心: 最多読み込み地域（hotspot）
- リストには地域名と件数が表示される（最大100件、APIで制限）
- リストの地域名はクリック不可（テキストのみ）
- スクロール可能だが、多数の場合は見づらい

---

## 変更後の動作

| 操作 | 動作 |
|------|------|
| 初期表示 | 最多読み込み地域を中心にズームレベル11で表示 |
| 地域名クリック | クリックした地域を中心にズームレベル13で表示 |
| 地域が多い場合 | 初期表示10件 + 「もっと見る」ボタンで展開 |

---

## 多数地域の表示設計

### アプローチ比較

| 方式 | メリット | デメリット | 採用 |
|------|----------|------------|------|
| ページネーション | 馴染みがある | ページ切替が面倒 | × |
| 無限スクロール | シームレス | 実装複雑、位置を見失う | × |
| 「もっと見る」ボタン | シンプル、実装容易 | 全件表示まで複数クリック | △ |
| **初期10件 + 展開** | 重要な情報が見える、シンプル | - | ✓ |
| 都道府県でグループ化 | 整理される | 実装複雑、件数少ない時は冗長 | × |

### 採用方式: 初期10件 + 展開表示

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 渋谷区 神南                                           15件  │
│ 2. 新宿区 西新宿                                         12件  │
│ 3. 港区 六本木                                            8件  │
│ ...                                                            │
│ 10. 目黒区 中目黒                                         3件  │
├─────────────────────────────────────────────────────────────────┤
│         ▼ 残り 42件を表示                                      │
└─────────────────────────────────────────────────────────────────┘
```

**展開後:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 渋谷区 神南                                           15件  │
│ ...                                                            │
│ 52. 練馬区 石神井                                         1件  │
├─────────────────────────────────────────────────────────────────┤
│         ▲ 折りたたむ                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 実装詳細

```typescript
// location-section.tsx

const INITIAL_DISPLAY_COUNT = 10;
const [isExpanded, setIsExpanded] = useState(false);

const displayedLocations = isExpanded
  ? aggregatedLocations
  : aggregatedLocations.slice(0, INITIAL_DISPLAY_COUNT);

const remainingCount = aggregatedLocations.length - INITIAL_DISPLAY_COUNT;
const hasMore = remainingCount > 0;
```

```tsx
{/* リスト */}
<div className="max-h-80 overflow-y-auto">
  {displayedLocations.map((loc, index) => (
    // 地域アイテム
  ))}

  {hasMore && (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
    >
      {isExpanded ? (
        <>
          <ChevronUp className="w-4 h-4" />
          折りたたむ
        </>
      ) : (
        <>
          <ChevronDown className="w-4 h-4" />
          残り {remainingCount}件を表示
        </>
      )}
    </button>
  )}
</div>
```

---

## 技術仕様

### アプローチ: React Leaflet の `useMap` Hook を使用

地図の中心を動的に変更するため、`react-leaflet` の `useMap` Hook を使用する。

### 1. location-section.tsx の変更

**選択中の地域 state を追加:**

```typescript
const [selectedLocation, setSelectedLocation] = useState<{
  latitude: number;
  longitude: number;
  region: string;
  city: string;
  town: string | null;
} | null>(null);
```

**リストの地域名をクリック可能に:**

```tsx
<button
  onClick={() => handleLocationClick(loc)}
  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline truncate text-left"
>
  {displayName}
</button>
```

**クリックハンドラー:**

```typescript
const handleLocationClick = (loc: AggregatedLocation) => {
  // GPS座標を探す（元のlocationsから）
  const original = locations.find(
    l => l.region === loc.region && l.city === loc.city && l.town === loc.town
  );

  if (original?.latitude && original?.longitude) {
    setSelectedLocation({
      latitude: original.latitude,
      longitude: original.longitude,
      region: loc.region!,
      city: loc.city!,
      town: loc.town,
    });
  } else {
    // GPS座標がない場合は都道府県中心を使用
    const prefCenter = PREFECTURE_CENTERS[normalizePrefectureName(loc.region!)];
    if (prefCenter) {
      setSelectedLocation({
        latitude: prefCenter[0],
        longitude: prefCenter[1],
        region: loc.region!,
        city: loc.city!,
        town: loc.town,
      });
    }
  }
};
```

### 2. location-map.tsx の変更

**Props に `selectedLocation` を追加:**

```typescript
interface LocationMapProps {
  locations: LocationData[];
  clinicCenter?: { latitude: number; longitude: number } | null;
  hotspot?: HotspotData | null;
  selectedLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}
```

**地図の中心を動的に変更するコンポーネントを追加:**

```typescript
function MapController({
  selectedLocation
}: {
  selectedLocation: { latitude: number; longitude: number } | null
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.flyTo(
        [selectedLocation.latitude, selectedLocation.longitude],
        13, // ズームレベル13（区・町レベル）
        { duration: 0.5 } // アニメーション0.5秒
      );
    }
  }, [selectedLocation, map]);

  return null;
}
```

**MapContainer 内に追加:**

```tsx
<MapContainer ...>
  <TileLayer ... />
  <ZoomTracker onZoomChange={setCurrentZoom} />
  <MapController selectedLocation={selectedLocation} />
  <MapMarkers ... />
</MapContainer>
```

---

## UI/UX 設計

### リストの地域名表示

**変更前:**
```
1. 渋谷区 神南           15件
```

**変更後:**
```
1. 渋谷区 神南 ←クリック可能（青色リンク）  15件
```

### クリック時の動作

1. 地域名をクリック
2. 地図が滑らかにアニメーションしながら移動（`flyTo`）
3. ズームレベル13で該当地域を表示
4. 該当マーカーが中心に表示される

### 視覚的フィードバック

- クリック可能な地域名: `text-blue-600` + `hover:underline`
- カーソル: `cursor-pointer`
- 現在選択中の地域: 背景色でハイライト（オプション）

---

## 影響範囲

| ファイル | 変更内容 |
|----------|----------|
| `src/components/dashboard/location-section.tsx` | `selectedLocation` state追加、クリックハンドラー、リストUI変更 |
| `src/components/dashboard/location-map.tsx` | `selectedLocation` prop追加、`MapController` コンポーネント追加 |

---

## 考慮事項

### GPS座標がない地域のクリック

- 都道府県の中心座標にフォールバック
- ユーザーには特に通知しない（自然に動作）

### 同じ地域を連続クリック

- `useEffect` の依存配列に `selectedLocation` の座標を使用
- 同じ座標なら再アニメーションしない

### モバイル対応

- タップでも同様に動作
- タップ領域を十分に確保（`py-1` 程度のパディング）

---

## テスト項目

### 地域クリック機能
- [ ] 地域名クリックで地図が該当地域に移動する
- [ ] アニメーションが滑らかに動作する
- [ ] GPS座標がない地域でも都道府県中心に移動する
- [ ] 最多読み込み地域が初期表示で中心に表示される
- [ ] モバイルでタップが正常に動作する
- [ ] 連続クリックでも正常に動作する

### 多数地域の展開表示
- [ ] 地域が10件以下の場合、「もっと見る」ボタンが表示されない
- [ ] 地域が11件以上の場合、初期表示は10件のみ
- [ ] 「残り N件を表示」をクリックで全件表示される
- [ ] 「折りたたむ」をクリックで10件表示に戻る
- [ ] 展開状態でも地域クリックが正常に動作する
- [ ] 期間やQRコード変更時に展開状態がリセットされる
