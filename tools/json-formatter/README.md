# JSON Formatter

貼上 JSON 純文字，一鍵自動縮排格式化。

## ✨ 功能

- **貼上即格式化**：勾選「貼上時自動格式化」後，貼上內容會自動解析並以 2 空格縮排。
- **手動格式化**：按「格式化」按鈕可將目前文字框內容重新縮排。
- **複製結果**：一鍵複製已格式化的 JSON；若內容無效則複製原始內容並顯示錯誤。
- **錯誤提示**：無效 JSON 時在下方顯示解析錯誤訊息。
- **深色模式**：支援 playground 共用主題。
- **PWA**：可安裝為獨立 App，離線可用。

## 🛠️ 檔案

- `index.html` — 頁面與介面
- `styles.css` — 樣式
- `formatter.js` — 解析、格式化與貼上／按鈕邏輯
- `manifest.json` — PWA 設定（名稱、圖示、主題色）
- `sw.js` — Service Worker（快取與離線）
- `icon-512.png` — 安裝用圖示（可替換為自訂 512×512 PNG）

## 使用方式

1. 開啟 `index.html`（或從 playground 進入此工具）。
2. 在文字框貼上或輸入 JSON（例如 `{"name":"test","count":1}`）。
3. 貼上後會自動格式化，或按「格式化」手動縮排。
4. 需要時按「複製結果」複製到剪貼簿。

---

Part of the [Playground](https://im1person.github.io/playground/) collection.
