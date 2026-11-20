# ゆめかわ星占い（公開リポジトリ）

公開URL: https://koki839.github.io/yumekawa-uranai/

ピンク×ラベンダーの「ゆめかわ」な12星座占いサイト。フレームワークなしの純粋な HTML / CSS / JS なので、そのまま静的ホスティングに置けます（サーバー代0円）。

## ファイル構成

```
.
├── index.html                  # すべての画面（3タブ）を含む1ページ
├── css/style.css               # デザイン（モバイルファースト）
├── js/app.js                   # 星座判定・タブ・結果描画・相性計算
├── data/horoscope_data.js      # 12星座の本文＋12×12相性データ＋血液型補正
└── assets/
    ├── banner_kawaii.webp      # ヘッダーバナー（1280×683／77KB・実際に読み込まれる）
    └── banner_kawaii.jpg       # 同画像のJPEGフォールバック（140KB）
```

未参照の 2.1MB マスター画像（`banner_kawaii.png`）は公開リポジトリには入れていません（ローカルの `tarot_global/jp/assets/` にのみ保管）。

- 外部依存は Google Fonts（Zen Maru Gothic / Noto Sans JP）のみ。落ちても端末フォントで表示されます。
- ヘッダー画像は `assets/` の1枚だけ（WebP→JPEGの順に読み込み）。読み込みは相対パスなので、サブディレクトリ配信でもそのまま動きます。

## ローカルで確認する

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

`index.html` をブラウザで直接開いても動きます（データはJSなので file:// でも読み込めます）。

## デプロイ（無料枠）

### Cloudflare Pages
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets
2. このフォルダの中身（`index.html` が最上位に来るように）をドラッグ＆ドロップ
3. そのまま公開。独自ドメインは後から Custom domain で割り当て

### GitHub Pages
1. リポジトリを作り、このフォルダの中身を `main` ブランチ直下に push
2. Settings → Pages → Source: Deploy from a branch → `main` / `root`
3. 数分後に `https://<user>.github.io/<repo>/` で公開

> ルート配信ではなく `/jp/` などのサブパスに置く場合も、相対パスなので修正不要です。

## 広告（AdSense）の入れ方

`index.html` に3か所、目印のコメントを置いています。

```html
<!-- AdSense Slot -->
<div class="ad-slot" aria-hidden="true"><span>AD</span></div>
```

AdSense の審査通過後、その `<div class="ad-slot">…</div>` を AdSense の `<ins class="adsbygoogle" …>` ブロックに置き換えるだけです。枠の高さは `.ad-slot` の `min-height` で調整できます（現在 96–110px）。

- 設置位置：①星座占いの結果の下 ②相性結果の下 ③ページ最下部（フッター前）
- 自動広告を使う場合は `<head>` に AdSense のスクリプトを1行追加し、`.ad-slot` は削除しても構いません。

## プレミアム鑑定（PayPal）

`#premium` セクションは **受付中（¥1,500）** で、PayPal の決済リンクに接続済みです。現在の設定は次のとおり。

| 項目 | 値 |
|---|---|
| 決済方式 | PayPal ウェブ決済標準（`cmd=_xclick`） |
| 受け取り | `dfkgj3147@gmail.com`（`business`） |
| 商品名 | `Yumekawa Hoshi Uranai - 1:1 Premium Reading (PDF)` |
| 金額／通貨 | `1500` / `JPY` |
| その他 | `no_shipping=1`（住所入力なし）・`lc=JP`（決済画面を日本語表示） |
| 動作 | `target="_blank" rel="noopener"` で新しいタブに PayPal の決済画面が開く |

決済リンクは `index.html` の `.btn-paypal`（`<a>`）の `href` にクエリ文字列として直接書いてあります。金額を変えるときは `amount=` を、受け取りアカウントを変えるときは `business=` を書き換えるだけです（ボタン画像や JS は不要）。

- 決済後の流れ「① 支払い → ② 生年月日・相談3つをメール → ③ 48時間以内に PDF 鑑定書」は `#premium .premium-flow` に記載。② のメールアドレスは `mailto:` で、件名・本文のひな形入りです。
- メールアドレスを変えるときは、`index.html` 内の `mailto:` と表示テキストの2か所（`dfkgj3147@gmail.com`）を合わせて直してください。
- 受け取り側の PayPal アカウントで「ウェブ決済」が有効になっている必要があります。未確認のメールアドレスを `business=` に入れると、PayPal は注文画面ではなく `INVALID_BUSINESS_ERROR` のエラーページを返します（有効なアカウントなら金額入りの決済画面が出ます）。
- 独自ドメインに移す場合も、URL はすべて相対パスなので変更不要です。

## データを直すとき

`data/horoscope_data.js` の `SIGNS` と `COMPAT` を編集します。

- `SIGNS[sign].personality` / `loveTrend` / `loveSwoon` / `loveBreakup` / `weekly.overall` / `weekly.single` / `weekly.couple` / `weekly.work` は**段落の配列**。1要素＝1段落として描画されます。
- `rates` は5段階（`overall` / `love` / `work` / `money` / `health`）。
- `lucky` は `color`（HEX）/ `colorName` / `number` / `item` / `advice`。
- `blood` は A / B / O / AB の1行コメント。
- `COMPAT[自分の星座][相手の星座]` は `{ s: スコア, t: タイトル, k: [キーワード], b: [段落...] }`。**12×12＝144通りすべて**個別に書いてあります。
- 血液型の補正は `BLOOD_PAIR`（`"A-O"` のように昇順でキーを作る）で `add` と `note` を定義。

本文の厚みを足すレイヤーとして `SIGN_EXTRA`（各星座の追加段落）と `COMPAT_EXTRA`（各カップルの「具体的な場面」段落）があり、読み込み時に本文へ差し込まれます。文言だけ直したいときはここを編集すると安全です。

## 動作仕様メモ

- 生年月日（年・月・日）を選ぶと星座を自動判定（境界日は 3/21 牡羊座 … 12/22 山羊座、1/1–1/19 は山羊座）。
- 星座ボタン12個から直接選ぶことも可能。日付を選び直すと上書きされます。
- 血液型は任意。結果に1行コメント、相性にはスコア補正（±）が入ります。
- 相性スコアは「あなたの星座から見た」向きのあるスコアです（同じ組み合わせでも左右で数値が少し違います）。
- 直前の選択は `localStorage` に保存され、再訪時に復元されます。
- `?sign=leo` のようなクエリ、または `#compat` / `#list` のハッシュで直接開けます（SNS共有・広告の着地点用）。
- 占いはエンターテインメントとして明記（フッター）。

## 公開前チェックリスト

- [x] `og:image` は絶対URLに置き換え済み（`https://koki839.github.io/yumekawa-uranai/assets/banner_kawaii.jpg`）
- [ ] AdSense の `ads.txt` をドメイン直下に置く
- [ ] Google Search Console にサイトマップ（1ページなら不要）とトップURLを登録
- [ ] 計測を入れる場合は GA4 か Cloudflare Analytics を `<head>` に追加
