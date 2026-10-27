# ひらがなカルタ

読み札の言葉に合う取り札を探してタップする、子ども向けのひらがなカルタ遊びです。

公開URL（予定）: https://altogrow-ir.github.io/hiragana-karuta/

## 遊び方

- モードを選んで「スタート」を押します
  - かんたん：取り札 6まい
  - ふつう：取り札 12まい
- 上の読み札（例「あめの あ！」＋絵文字と単語のヒント）を見て、並んだ取り札（絵文字＋ひらがなの単語）の中から合う1枚をタップします
- 「🔊 よんで」ボタンで、Web Speech API（`speechSynthesis`、`ja-JP`）による読み上げもできます。読み上げが使えない環境では、テキスト表示だけでそのまま遊べます
- 正解したらその札が取れて次の問題へ。間違えてもペナルティはなく、「ちがうよ、もういっかい」と表示されます
- 全部取ったらクリア表示とかかった時間が出ます
- 札は全40種類あり、ラウンドごとに選ばれる札・並び順・出題順はランダムです

## 記録

- クリア回数（モード別）とベストタイム（モード別）を `localStorage` のキー `hiragana-karuta-save-v1` に保存し、スタート画面とクリア画面に表示します
- サーバーは使わず、ブラウザ（端末内）だけで完結します

## 構成

- Vite + React 19 + TypeScript（ESM、npm）
- ルート：`index.html` / `vite.config.ts`（base は `"/hiragana-karuta/"`）/ `tsconfig.json` / `package.json`
- 実装の中心：`src/App.tsx`（＋ `src/main.tsx`、`src/App.css`、`src/index.css`）
- 外部画像素材は使わず、絵文字＋CSSで表現しています

## 開発・ビルド

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # tsc -b && vite build（dist/ に出力）
npm run preview  # ビルド結果の確認
```

## 公開

- ローカルでビルドした成果物をリポジトリの `docs/` フォルダに入れ、GitHub Pages の公開元を `main` ブランチの `/docs` に指定します
