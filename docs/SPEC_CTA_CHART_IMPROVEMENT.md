# CTAクリック推移グラフ 改善仕様書

## 現状の問題点

### 1. グラフ表示の問題
- **積み上げ棒グラフ**: 診断結果と医院ページのクリックが縦に積み上がっており、比較が困難
- **少数データの視認性**: 2〜3件程度のクリック数だと棒グラフの高さが低すぎて見づらい
- **データ比較**: 診断結果 vs 医院ページのクリック数を直感的に比較できない

### 2. 診断結果ページの電話番号
- **問題**: 電話ボタンがクリックしても発信されない
- **原因**: `<Button>`コンポーネントを`<a>`タグでラップしているが、ボタンのイベント処理が干渉
- **参考**: 医院紹介ページでは`<a>`タグ単体で実装されており正常動作

---

## 改善内容

### 1. CTAクリック推移グラフの改善

#### 1.1 グラフレイアウトの変更
**Before（積み上げ）:**
```
   [診断結果]
   [医院ページ]
   ──────────
      日付
```

**After（横並び）:**
```
   [診断] [医院]
   ─────────────
       日付
```

#### 1.2 少数データ対応
- **最小高さの保証**: データがある場合、最低12pxの高さを確保
- **Y軸スケールの最適化**: 最大値が小さい場合（5未満）は自動調整
- **視覚的な区別**: 0件でもプレースホルダーを表示

#### 1.3 追加の改善提案

| 項目 | 説明 | 優先度 |
|------|------|--------|
| ツールチップ強化 | ホバー時に詳細数値と前期比を表示 | 高 |
| 色のコントラスト | 緑/青の色を調整して視認性向上 | 中 |
| アニメーション | グラフ表示時のフェードイン効果 | 低 |
| レスポンシブ対応 | モバイルでの横スクロール改善 | 中 |

---

### 2. 電話ボタンの修正

#### 修正方針
`result-card.tsx`の電話ボタンを、`clinic-cta.tsx`と同じパターンに変更

**Before:**
```tsx
<a href={`tel:${phone}`}>
  <Button>電話で相談</Button>
</a>
```

**After:**
```tsx
<a href={`tel:${phone}`} className="ボタンスタイル">
  <Phone /> 電話で相談
</a>
```

---

## 技術仕様

### CTAチャートコンポーネント変更

```typescript
// 変更前: 積み上げ棒グラフ
<div className="flex flex-col-reverse">
  <div style={{ height: `${(fromResult / max) * 100}%` }} />
  <div style={{ height: `${(fromClinicPage / max) * 100}%` }} />
</div>

// 変更後: 横並び棒グラフ
<div className="flex gap-0.5 items-end">
  <div style={{ height: `${calcHeight(fromResult)}%` }} />
  <div style={{ height: `${calcHeight(fromClinicPage)}%` }} />
</div>
```

### 高さ計算の改善

```typescript
function calcBarHeight(value: number, max: number): number {
  if (value === 0) return 0;
  // 最小高さを保証（8%相当）
  const percentage = (value / max) * 100;
  return Math.max(percentage, 8);
}
```

### Y軸の最適化

```typescript
function calculateOptimalMax(data: number[]): number {
  const max = Math.max(...data);
  if (max === 0) return 5;
  if (max <= 3) return 5;      // 3以下は5を最大値に
  if (max <= 5) return 6;      // 5以下は6を最大値に
  if (max <= 10) return 12;    // 10以下は12を最大値に
  return Math.ceil(max * 1.2); // それ以上は1.2倍
}
```

---

## ファイル変更一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/components/dashboard/cta-chart.tsx` | グラフレイアウト変更、高さ計算改善 |
| `src/components/diagnosis/result-card.tsx` | 電話ボタンをaタグに変更 |

---

## 実装後の確認項目

- [ ] 横並び棒グラフが正しく表示される
- [ ] 少数データ（1〜5件）でも棒グラフが視認できる
- [ ] 0件のデータでもレイアウトが崩れない
- [ ] ツールチップが正しく表示される
- [ ] 電話ボタンをクリックすると発信される
- [ ] モバイル表示でも正常に動作する
