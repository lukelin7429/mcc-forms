/**
 * 人師教育協會 My Culture Connect — 統一報名表收件 Web App
 * ============================================================
 * 多張表單共用一套後端，依 form_id 路由到對應 Sheet tab。
 *
 * 改 .gs 後要「管理部署 → 編輯 → 版本選新版本 → 部署」才會生效。
 * 新增表單只要在 FORMS 加一筆 + redeploy；不用換 SHEET_ID、不必重 OAuth。
 *
 * 部署設定：
 *   - 執行身份：Luke（owner）
 *   - 存取權：Anyone（必須，匿名 POST 才能寫入）
 */

const SHEET_ID = '13Y7E1s4Z2vuoNFH7IMc4bbnugQ1ezOinngpKKVMm5tk';
const MAIL_TO  = 'luke@mycultureconnect.org';   // 多人通知請用逗號分隔

/**
 * 表單路由表
 * ============================================================
 * key     = form_id（HTML payload 必帶；前端送出時加入）
 * sheet   = Google Sheet tab 名稱（在「人師報名表」這份 Sheet 內）
 * label   = 通知信主旨用的中文表單名
 * headers = Sheet 顯示用的中文表頭
 * fields  = 對應 JSON 鍵；headers[i] ↔ fields[i] 一一對應
 *
 * 規則：
 *   - headers[0] 永遠是「填表時間」、fields[0] = null（自動帶 new Date()）
 *   - 最後一欄永遠是「瀏覽器資訊」、key = 'user_agent'
 *   - headers / fields 必須等長
 */
const FORMS = {
  ny_chinese_school: {
    sheet: '紐約中文學校',
    label: '紐約中文學校',
    headers: [
      '填表時間', '中文姓名', '英文姓名', '西元出生年份', '就讀學校',
      '年級', '上課時段', '聯絡家長姓名',
      '孩子 Google 帳號', '家長 Google 帳號', '瀏覽器資訊',
    ],
    fields: [
      null, 'chinese_name', 'english_name', 'birth_year', 'school',
      'grade', 'class_times', 'parent_name',
      'student_google', 'parent_google', 'user_agent',
    ],
  },

  tutoring_1on1: {
    sheet: '一對一上課',
    label: '人師一對一上課',
    headers: [
      '填表時間', '學員身分', '中文姓名', '英文姓名', '西元出生年份',
      '就讀學校 / 工作領域', '年級 / 學歷', '英文程度自評',
      '偏好上課時段', '聯絡人姓名',
      '學員 Google 帳號', '家長 Google 帳號', '瀏覽器資訊',
    ],
    fields: [
      null, 'identity', 'chinese_name', 'english_name', 'birth_year',
      'school_or_work', 'grade_or_education', 'english_level',
      'preferred_times', 'contact_name',
      'student_google', 'parent_google', 'user_agent',
    ],
  },
};

/* ============================================================ */

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const formId = String(data.form_id || '').trim();
    const form   = FORMS[formId];

    if (!form) {
      return jsonOut_({
        ok: false,
        error: 'Unknown form_id: "' + formId + '". Known: ' +
               Object.keys(FORMS).join(', '),
      });
    }

    const sheet = getOrCreateSheet_(form);
    const row = form.fields.map(function (key, i) {
      if (i === 0) return new Date();                    // 填表時間
      return String(data[key] != null ? data[key] : '');
    });
    sheet.appendRow(row);

    sendNotification_(form, data);
    return jsonOut_({ ok: true });
  } catch (err) {
    return jsonOut_({ ok: false, error: err.toString() });
  }
}

function doGet() {
  return ContentService.createTextOutput(
    'MCC unified form endpoint OK. Forms: ' + Object.keys(FORMS).join(', ')
  );
}

function getOrCreateSheet_(form) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(form.sheet);
  if (!sheet) {
    sheet = ss.insertSheet(form.sheet);
  }
  // 始終同步表頭（HEADERS 改動時下次寫入自動更新）
  sheet.getRange(1, 1, 1, form.headers.length)
       .setValues([form.headers])
       .setFontWeight('bold');
  sheet.setFrozenRows(1);

  // 第 1 欄（填表時間）統一日期格式，看一眼就懂
  const maxRows = sheet.getMaxRows();
  if (maxRows >= 2) {
    sheet.getRange(2, 1, maxRows - 1, 1)
         .setNumberFormat('yyyy/MM/dd HH:mm:ss');
  }
  return sheet;
}

function sendNotification_(form, data) {
  try {
    const who = (data.chinese_name || '') +
                (data.english_name ? ' / ' + data.english_name : '');
    const subject = '[' + form.label + ' 報名] ' + who;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const targetSheet = ss.getSheetByName(form.sheet);
    const sheetUrl = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID +
                     '/edit' + (targetSheet ? '#gid=' + targetSheet.getSheetId() : '');

    const lines = [
      '新報名 New Registration',
      '====================================',
      '表單：' + form.label,
      '',
    ];
    form.fields.forEach(function (key, i) {
      if (i === 0 || !key || key === 'user_agent') return;
      lines.push(form.headers[i] + '：' + (data[key] || ''));
    });
    lines.push('');
    lines.push('填表時間：' + (new Date()).toString());
    lines.push('');
    lines.push('查看完整 Sheet：');
    lines.push(sheetUrl);

    MailApp.sendEmail(MAIL_TO, subject, lines.join('\n'));
  } catch (err) {
    console.error('Mail failed:', err);
  }
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
   測試函式 — 在編輯器點「執行」可手動驗證寫入 + Email 通知
   ============================================================ */

function _smokeTestNyCs() {
  doPost({ postData: { contents: JSON.stringify({
    form_id:        'ny_chinese_school',
    chinese_name:   '王小明',
    english_name:   'Andy Wang',
    birth_year:     '2014',
    school:         'PS 130',
    grade:          '三年級 Grade 3',
    class_times:    '禮拜六 上午 8:00–10:00, 禮拜天 晚上 7:30–9:00',
    parent_name:    '王大華',
    student_google: 'andy.wang@gmail.com',
    parent_google:  'dahua.wang@gmail.com',
    user_agent:     'smoke-test',
  }) } });
}

function _smokeTestTutoring() {
  doPost({ postData: { contents: JSON.stringify({
    form_id:            'tutoring_1on1',
    identity:           '學生 Student',
    chinese_name:       '李小華',
    english_name:       'Lisa Lee',
    birth_year:         '2010',
    school_or_work:     '彰化縣某國小',
    grade_or_education: '七年級 Grade 7',
    english_level:      '說得一點',
    preferred_times:    '週六上午 8:00–12:00、週一/三晚上 8:00–10:00',
    contact_name:       '李大明（父）',
    student_google:     'lisa.lee@gmail.com',
    parent_google:      'daming.lee@gmail.com',
    user_agent:         'smoke-test',
  }) } });
}
