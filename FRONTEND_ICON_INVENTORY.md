# Frontend Icon / CSS Shape Inventory

整理日期：2026-06-03

這份文件整理專案中「前端 icon、特殊 icon、以及 CSS 畫出來的圖案」。範圍包含 `index.html`、`takeaway.html`、`indoor.html`、`css/style.css`、`js/*.js` 中直接引用的圖片與樣式。

## 1. 目前有被畫面引用的圖片型 icon

| 資產 | 尺寸 | 用途 | 引用位置 |
| --- | --- | --- | --- |
| `images/icon01.png` | 200 x 200 | 首頁「外帶」標題左側 icon | `css/style.css:131` |
| `images/icon02.png` | 200 x 200 | 首頁「內用」標題左側 icon | `css/style.css:135` |
| `images/icon03.png` | 200 x 200 | 首頁「我要點餐」大按鈕 icon | `css/style.css:155` |
| `images/icon01b.png` | 100 x 100 | 外帶頁分類標題 icon | `css/style.css:360` |
| `images/magnifier1.png` | 1536 x 1024 | 查詢 icon：現在叫號、外送取餐查詢 | `index.html:93`, `index.html:327` |
| `images/cart1.png` | 683 x 720 | 外帶頁購物車 icon | `takeaway.html:78` |
| `images/logo-removebg-preview.png` | 474 x 527 | 首頁左下員工打卡 logo 按鈕 | `index.html:141` |
| `images/call-bubble-removebg-preview.png` | 500 x 500 | 首頁「現在叫號」對話框圖案 | `css/style.css:8310` |
| `images/delivery-face-loading1.png` | 466 x 338 | 外送報到 loading 旋轉圖 | `index.html:476` |
| `images/qrcode.png` | 455 x 455 | 付款 QR code，不是一般 icon，但屬於介面圖案 | `takeaway.html:242`, `js/takeaway_page.js:498`, `js/takeaway_page.js:505` |

## 2. 特殊/文字型 icon

| 類型 | 內容 | 用途 | 引用位置 |
| --- | --- | --- | --- |
| 支付方式圓形 badge | `LINE`, `QR`, `CARD` | 外帶付款方式卡片 icon | `takeaway.html:196`, `takeaway.html:202`, `takeaway.html:208`, `css/style.css:9753` |
| 輪播箭頭 | `‹`, `›` | 首頁套餐輪播上一張/下一張 | `index.html:186`, `index.html:190`, `css/style.css:5516` |
| 鍵盤刪除鍵 | `⌫` | 候位/查詢數字鍵盤刪除 | `index.html:62` |
| Bootstrap 關閉按鈕 | `.btn-close` | Modal 右上角關閉 icon，由 Bootstrap CSS 產生 | 多個 modal header |

## 3. CSS 畫出來的圖案 / UI 符號

| CSS selector | 圖案/效果 | 說明 |
| --- | --- | --- |
| `.cartBadge` | 紅色數字徽章 | 購物車右上角數量圓角 badge，純 CSS 背景與圓角。 |
| `.catList .catBtn::after` | 分類按鈕外框高亮 | 用 pseudo-element 畫外圈 border，hover/active 顯示。 |
| `.deliveryCheckAnim`, `.deliveryCheckCircle`, `.deliveryCheckMark` | 成功打勾動畫 | 用圓框與兩條 border 畫 check mark，搭配 `deliveryCirclePop` / `deliveryCheckShow` 動畫。 |
| `.paymentMethodIcon` | 支付方式圓形 icon | 純 CSS 圓形底，文字作為 icon 內容。 |
| `.deliveryStatusTag` | 外送狀態標籤 | `已完成`、`準備中` 等狀態 pill。 |
| `.callNums span`, `.isNowPickup` | 叫號號碼 pill | 現在叫號清單的號碼框，當前號碼有橘色強調。 |
| `.deliveryNinePad .numBtn`, `.nineKey`, `.letterOption` | 虛擬鍵盤鍵帽 | 數字/英文字母鍵，屬於 CSS 組合出的介面圖案。 |
| `.kioskCanvas #openCallModal.callWrap::after` | 舊版對話框尾巴 | 曾用 CSS border + skew 畫對話框尾巴，但後面規則已設為 `content: none`，目前實際使用圖片版對話框。 |

## 4. SVG icon 檔案

這幾個 SVG 檔存在於 `images/`，但目前沒有被 HTML/CSS/JS 引用。內容是把 PNG 以 base64 包進 SVG，並非真正可調色的向量圖。

| 資產 | 尺寸 | 狀態 |
| --- | --- | --- |
| `images/icon01.svg` | 200 x 200 | 未引用，對應 `icon01.png` 類型 |
| `images/icon02.svg` | 200 x 200 | 未引用，對應 `icon02.png` 類型 |
| `images/icon03.svg` | 200 x 200 | 未引用，對應 `icon03.png` 類型 |
| `images/icon01b.svg` | 100 x 100 | 未引用，對應 `icon01b.png` 類型 |

## 5. 疑似缺檔或需確認的 icon/logo

以下檔案有被前端引用，但目前 `images/` 目錄中沒有找到，會造成畫面圖片載入失敗。

| 資產 | 引用位置 | 建議 |
| --- | --- | --- |
| `images/foodpanda.png` | `index.html:335` | 補檔，或改成目前實際存在的檔名。 |
| `images/ubereats.jpg` | `index.html:355` | 補檔，或改成目前實際存在的檔名。 |
| `images/call-bubble1.png` | `css/style.css:8194` | 這段後面已被 `call-bubble-removebg-preview.png` 覆蓋；可刪除舊規則或補檔。 |

## 6. 疑似未使用但像 icon 的備用檔

| 資產 | 尺寸 | 狀態 |
| --- | --- | --- |
| `images/magnifier.png` | 854 x 672 | 未引用；目前使用 `magnifier1.png`。 |
| `images/call-bubble.png` | 1254 x 1254 | 未引用；目前使用 `call-bubble-removebg-preview.png`。 |
| `images/沒用到/icon01a.png` | 512 x 512 | 位於 `沒用到`，未引用。 |
| `images/沒用到/icon01--.png` | 200 x 200 | 位於 `沒用到`，未引用。 |
| `images/沒用到/icon01-.png` | 200 x 200 | 位於 `沒用到`，未引用。 |

## 7. 非 icon，但被前端當視覺資產引用

| 資產 | 用途 | 引用位置 |
| --- | --- | --- |
| `images/banner.jpg` | 首頁廣告 banner | `index.html:181` |
| `images/indooor_menu1.jpg.webp`, `images/indooor_menu2.jpg.webp` | 內用菜單頁圖片 | `indoor.html:36`, `indoor.html:73` |
| `images/Signature_Bento.png`, `images/drumstick-removebg-preview.png`, `images/pork_trotter.avif-removebg-preview.png`, `images/lurou.png`, `images/image-removebg-preview.png`, `images/G_duck_egg-removebg-preview.png` | 外帶菜單商品圖 | `js/mockApi.js` |
| `images/promo-chicken.png`, `images/promo_new_bento.png`, `images/romo_lunch_set.png`, `images/promo_family_set.png` | 首頁套餐輪播商品圖 | `js/index_page.js:2656` - `js/index_page.js:2680` |
| `images/Marinated_Pork_Neck1.jpg` | 商品圖 fallback | `js/takeaway_page.js:82` |

## 8. 建議整理方向

1. 補齊或移除缺檔引用：`foodpanda.png`、`ubereats.jpg`、`call-bubble1.png`。
2. 決定 icon 主格式：目前同一批 icon 同時有 PNG / SVG，但 SVG 只是包 PNG，建議保留一種即可。
3. 查詢 icon `magnifier1.png` 尺寸偏大，可裁成接近實際顯示尺寸的透明 PNG/SVG，減少載入成本。
4. 把純 CSS 圖案集中註解，例如「badges / keyboard / success animation / speech bubble」，後續比較好維護。
5. 若要統一命名，可考慮建立 `images/icons/` 放 icon，`images/products/` 放商品照，`images/banners/` 放 banner。
