/**
 * MCC Practicum Sign-Up Form - force sign-ups through Google Chat
 * ============================================================
 * Problem: student teachers keep emailing instead of using Google Chat.
 * This script bakes the Chat step into the form itself:
 *   1. Form description states the sign-up is incomplete without a Chat message
 *   2. Removes the "just email me the schedule" escape hatch
 *   3. Adds a REQUIRED pledge checkbox before submit
 *   4. Rewrites the confirmation message (highest-motivation moment)
 *
 * Run updatePracticumForm() once. Safe to re-run - it updates rather than duplicates.
 *
 * NOTE: kept ASCII-only on purpose (non-ASCII uses \u escapes) so the source
 * survives copy/paste into the Apps Script editor without mojibake.
 */

const FORM_ID = '14__VBGZmenHWXAydTvfZpF43itL0kcV7A5MakG8JXHg';
const CHAIR_EMAIL = 'kevin@mycultureconnect.org';
const PLEDGE_TITLE = 'Required: message us on Google Chat to complete your sign-up';
const CHAT_MESSAGE =
  '"Hi Kevin, I have submitted the sign-up form. Please send me the observation schedule."';
const WARN = String.fromCharCode(0x26A0, 0xFE0F);  // warning sign
const DASH = String.fromCharCode(0x2014);          // em dash

function updatePracticumForm() {
  const form = FormApp.openById(FORM_ID);

  // 1. Form description - Chat step is visible before they fill anything in
  form.setDescription(
    'Thank you for your interest in volunteering with us to complete your practicum hours ' +
    'for TEFL or TESOL certification. Please fill out the form below.\n\n' +
    WARN + ' IMPORTANT ' + DASH + ' your sign-up is not complete until you message us on Google Chat.\n' +
    'We coordinate all practicum placements on Google Chat, and the observation schedule ' +
    'is sent there only ' + DASH + ' not by email.\n\n' +
    'After you submit this form:\n' +
    '1. Open Google Chat (chat.google.com, or the Chat panel on the left side of Gmail).\n' +
    '2. Start a new chat with ' + CHAIR_EMAIL + '\n' +
    '3. Send this message: ' + CHAT_MESSAGE + '\n\n' +
    'Please use the same Google account you enter below. ' +
    'We cannot process sign-ups without this message.'
  );

  // 1b. The Chat Space question was a CHECKBOX, so people could tick both the
  //     "yes invite me" and "no thanks" options. Rebuild it as a radio button.
  //     GAS cannot change an item's type, so it has to be deleted and re-added.
  convertChatSpaceToRadio_(form);

  // 2. Kill the email escape hatch - match on the CHOICE TEXT, not the title
  //    (matching the title failed once; safer to look at what the options say)
  let hatchFixed = false;
  form.getItems().forEach(function (item, i) {
    const type = item.getType();
    const isMC = type === FormApp.ItemType.MULTIPLE_CHOICE;
    const isList = type === FormApp.ItemType.LIST;
    const isCheck = type === FormApp.ItemType.CHECKBOX;
    if (!isMC && !isList && !isCheck) {
      Logger.log(i + ' [' + type + '] ' + item.getTitle());
      return;
    }
    const q = isMC ? item.asMultipleChoiceItem()
            : isList ? item.asListItem()
            : item.asCheckboxItem();
    const choices = q.getChoices().map(function (c) { return c.getValue(); });
    Logger.log(i + ' [' + type + '] ' + item.getTitle() + ' :: ' + choices.join(' | '));

    // match the still-original wording OR the already-fixed question, so re-runs
    // keep working (the first fix removes the phrase we matched on)
    const hasHatch = choices.some(function (v) {
      return v.toLowerCase().indexOf('email me the observation schedule') !== -1;
    });
    const isChatSpaceQuestion =
      item.getTitle().replace(/\s+/g, ' ').indexOf('Google Chat Space') !== -1;
    if (!hasHatch && !isChatSpaceQuestion) return;

    q.setChoiceValues([
      'Yes, please send me an invite to join the Chat Space.',
      'No thanks ' + DASH + ' I will message Kevin directly on Google Chat.'
    ]);
    // the original title had the explanation glued onto it - move it to help text
    q.setTitle('Would you like to join our Google Chat Space for quick updates and support?');
    q.setHelpText(
      'This space is for observing teachers who need help with access issues or other ' +
      'small technical concerns. Either way, you still need to message ' + CHAIR_EMAIL +
      ' directly on Google Chat to receive your observation schedule.'
    );
    hatchFixed = true;
  });
  Logger.log('escape hatch fixed: ' + hatchFixed);

  // 3. Required pledge checkbox (updates in place if it already exists)
  let pledge = null;
  form.getItems(FormApp.ItemType.CHECKBOX).forEach(function (item) {
    if (item.getTitle() === PLEDGE_TITLE) pledge = item.asCheckboxItem();
  });
  if (!pledge) pledge = form.addCheckboxItem();
  pledge
    .setTitle(PLEDGE_TITLE)
    .setHelpText('On Google Chat, send this to ' + CHAIR_EMAIL + ': ' + CHAT_MESSAGE)
    .setChoiceValues([
      'I understand that my sign-up is not complete until I message ' + CHAIR_EMAIL +
      ' on Google Chat, and that the observation schedule is sent on Google Chat only.'
    ])
    .setRequired(true);

  // 4. Confirmation message shown right after submitting
  form.setConfirmationMessage(
    'Thanks! One more step ' + DASH + ' you are not signed up yet.\n\n' +
    'Open Google Chat (chat.google.com, or the Chat panel in Gmail), start a chat with ' +
    CHAIR_EMAIL + ', and send:\n\n' + CHAT_MESSAGE + '\n\n' +
    'Kevin will reply there with your observation schedule. ' +
    'We cannot process your sign-up without this message.'
  );

  Logger.log('Done. Form edit URL: ' + form.getEditUrl());
}

/**
 * Rebuild the "Google Chat Space" question as a single-choice (radio) question.
 * No-op if it is already one. Note: because the item is deleted and re-added,
 * responses collected for the old question stay in their old sheet column and
 * new answers land in a new column.
 */
function convertChatSpaceToRadio_(form) {
  let idx = -1;
  let target = null;
  form.getItems().forEach(function (item, i) {
    if (item.getTitle().replace(/\s+/g, ' ').indexOf('Google Chat Space') === -1) return;
    target = item;
    idx = i;
  });
  if (!target) {
    Logger.log('convert: Chat Space question not found');
    return;
  }
  if (target.getType() === FormApp.ItemType.MULTIPLE_CHOICE) {
    Logger.log('convert: already a radio question, nothing to do');
    return;
  }
  if (target.getType() !== FormApp.ItemType.CHECKBOX) {
    Logger.log('convert: unexpected type ' + target.getType() + ', leaving it alone');
    return;
  }

  const old = target.asCheckboxItem();
  const title = old.getTitle();
  const help = old.getHelpText();
  const required = old.isRequired();
  const choices = old.getChoices().map(function (c) { return c.getValue(); });

  form.deleteItem(idx);
  const radio = form.addMultipleChoiceItem()
    .setTitle(title)
    .setHelpText(help)
    .setChoiceValues(choices)
    .setRequired(required);
  form.moveItem(radio.getIndex(), idx);
  Logger.log('convert: rebuilt as radio at index ' + idx);
}
