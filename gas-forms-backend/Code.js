function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var tabName = data.__tab;
    delete data.__tab;

    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Tab not found: ' + tabName }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = headers.map(function(h) { return data[h] !== undefined ? data[h] : ''; });
    sheet.appendRow(row);

    var body = headers.map(function(h, i) { return h + '：' + row[i]; }).join('\n');
    MailApp.sendEmail({
      to: 'kevin@mycultureconnect.org',
      subject: '【' + tabName + '】收到新的報名',
      body: body
    });

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function testMailAuth() {
  MailApp.sendEmail('luke@mycultureconnect.org', '測試', '測試 Apps Script 寄信權限');
}