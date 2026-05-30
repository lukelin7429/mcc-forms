/**
 * MCC 報名表後端（取代 sheet.best，免費）
 *
 * 安裝：在「人師報名表」試算表裡開 擴充功能 > Apps Script，
 *       把這份全部貼進去，存檔，再 部署 > 新增部署作業 > 網頁應用程式。
 *   - 執行身分 (Execute as)：我 (Me)
 *   - 誰可以存取 (Who has access)：所有人 (Anyone)
 * 部署後會拿到一個 /exec 結尾的網址，貼回 HTML 表單。
 *
 * 前端 payload 規則：
 *   - 多帶一個 __tab 欄位指定要寫哪個分頁（例 "一對一"、"紐約中文學校"）。
 *   - 其餘 key 必須對齊分頁第一列的欄位名稱；script 會自動補上缺的欄位。
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var tabName = data.__tab || 'Sheet1';
    delete data.__tab;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

    var keys = Object.keys(data);
    var lastCol = sheet.getLastColumn();
    var headers = lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
      : [];

    if (headers.length === 0) {
      headers = keys;
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      keys.forEach(function (k) {
        if (headers.indexOf(k) === -1) {
          headers.push(k);
          sheet.getRange(1, headers.length).setValue(k);
        }
      });
    }

    var row = headers.map(function (h) {
      return data.hasOwnProperty(h) ? data[h] : '';
    });
    sheet.appendRow(row);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 部署後可在瀏覽器開 /exec 網址確認服務有上線
function doGet() {
  return json_({ ok: true, service: 'mcc-forms' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
