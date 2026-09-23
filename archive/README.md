# archive — 這裡的程式**沒有**在線上跑

放這裡的 `.gs` 都不對應任何線上的 Apps Script 專案，純粹保留當參考。
改東西請不要改這裡。

## 線上實際在跑的是哪些

| 資料夾 | 對應的線上專案 | 用途 |
|---|---|---|
| `../gas-forms-backend/` | 綁在「人師報名表」試算表的 Apps Script | 六份 HTML 報名表 POST 的後端：寫入試算表 + 寄通知信給理事長 |
| `../gas-practicum-form/` | Apps Script 專案「MCC Practicum Form 自動化」 | 維護 Google Form「MCC Practicum Sign-Up Form」的題目與說明 |

兩個資料夾都由 clasp 納管（各自有 `.clasp.json`），改完在該資料夾跑：

```bash
npx @google/clasp@latest push
```

後端改完還要重新部署才會生效：Apps Script 編輯器 → 管理部署 → 編輯 → 版本選「新版本」→ 部署。

> ⚠️ 不要用複製貼上把程式碼貼進 Apps Script 編輯器——中文會變亂碼（實際發生過）。clasp 走 API 傳輸就不會。

## 這兩個檔案是什麼

- `未上線-多表單路由版.gs`（原 `apps-script.gs`）——一套更完整的多表單路由設計，有 FORMS 路由表與中文表頭對照，但從未部署。
- `舊版-僅寫入試算表.gs`（原 `apps-script/Code.gs`）——早期版本，只寫入試算表，沒有寄信功能。
