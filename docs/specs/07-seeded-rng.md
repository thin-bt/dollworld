# 07 Seeded RNGミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.5`
- RNGアルゴリズム版：`xoshiro128ss-v1`

## 1. 目的

JavaScript実行環境や実行順の偶然に依存せず、同じseedから同じ乱数列・選択・シャッフルを再現する。

## 2. seed

- 外部seedは0〜4294967295の整数。
- 小数、負数、範囲外、NaN、Infinityは拒否し、自動丸めしない。
- 内部演算はすべて符号なし32bitとして`>>> 0`で正規化する。
- `Math.random()`、現実時刻、OS乱数、crypto乱数を使用しない。

## 3. 状態初期化

4個のuint32状態`[s0,s1,s2,s3]`を、seedを初期stateとした次のSplitMix32-v1から順に4回取得する。

```ts
state = (state + 0x9e3779b9) >>> 0
z = state
z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0
z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0
value = (z ^ (z >>> 15)) >>> 0
```

4状態がすべて0の場合だけ`s0=0x9e3779b9`とする。

## 4. nextUint32

```ts
result = Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0
t = (s1 << 9) >>> 0
s2 = (s2 ^ s0) >>> 0
s3 = (s3 ^ s1) >>> 0
s1 = (s1 ^ s2) >>> 0
s0 = (s0 ^ s3) >>> 0
s2 = (s2 ^ t) >>> 0
s3 = rotl(s3, 11)
return result
```

`rotl(x,k) = ((x << k) | (x >>> (32-k))) >>> 0`。

## 5. API契約

- `nextUint32()`：0〜4294967295。
- `nextFloat()`：`nextUint32() / 4294967296`、範囲は0以上1未満。
- `nextInt(minInclusive,maxExclusive)`：整数境界、`min < max`。rejection samplingを使いmodulo biasを避ける。
- `chance(probability)`：0〜1。0は必ずfalse、1は必ずtrue。それ以外は`nextFloat() < probability`。
- `choose(items)`：空配列はエラー。
- `shuffle(items)`：入力を変更せず、コピーへFisher–Yatesを適用する。
- `sampleWithoutReplacement(items,count)`：0〜配列長。入力順・重複要素を勝手に正規化しない。

## 6. 派生seed

サブシステム間の乱数消費順による影響を減らすため、`deriveSeed(parentSeed,label)`を使用する。

- labelは空でない安定したASCII文字列。
- 初期値：`h = (parentSeed ^ 0x811c9dc5) >>> 0`。
- labelの各UTF-16 code unitについて、下位byte、上位byteの順にそれぞれ`h ^= byte; h = Math.imul(h,0x01000193) >>> 0`。
- 戻り値はuint32。
- 同じ用途は同じ固定labelを使用し、表示名や配列indexをlabelへ使わない。

基準label例：`initial-world`、`names/family`、`names/person`、`relationships/parent`、`relationships/marriage`、`relationships/master`、`abilities`。

## 7. golden sequence

seed 12345の初期状態：

```text
[3283241497, 613117429, 2940958500, 516375437]
```

先頭10個の`nextUint32()`：

```text
1093274547
203003357
3741353573
3803725158
4178738660
810247443
1347789520
4037788777
3729597786
3845877672
```

派生seed：

```text
deriveSeed(12345, "initial-world") = 1072236765
deriveSeed(12345, "names/family") = 3916266897
```

## 8. 状態と直列化

- RNG状態は4個のuint32とalgorithmVersionで表せる。
- 状態の保存・復元後も次の乱数列が完全一致する。
- Sprint 0の世界スナップショットへ全サブストリーム状態を保存するかはS00-007で実装するが、APIは状態export/importを可能にする。

## 9. 受入テスト

1. seed 12345の初期状態・golden sequence一致。
2. seed 0、1、4294967295を受理。
3. seed範囲外・非整数を拒否。
4. 同seed・同操作列で完全一致。
5. 異seedで先頭列が異なる。
6. nextFloatが0以上1未満。
7. nextIntの境界と偏り回避ロジック。
8. choose空配列エラー。
9. shuffleが入力配列を変更しない。
10. sampleWithoutReplacementの件数・重複なしindex選択。
11. 派生seedのgolden値一致。
12. 状態保存・復元後の列一致。
13. ソースコードに`Math.random`がない。

## 10. 対象外

暗号用途、分散ノード間の乱数同期、浮動小数点統計品質の正式認証、ゲームバランス調整。
