const SPREADSHEET_ID = 13zc3n0MzQD5PeZcyOM2kkEJofGW0W2HdoiPopq3-Pus
const SHEET_NAME = 'RSVPs'
const ALLOWED_STATUSES = ['attending', 'maybe', 'declined']

function doPost(event) {
  const data = JSON.parse(event.postData.contents)
  const name = cleanText(data.name, 100)
  const message = cleanText(data.message, 1000)
  const attendingCount = Number(data.attendingCount)
  const status = String(data.status || '')

  if (!name) {
    throw new Error('Name is required.')
  }
  if (!Number.isInteger(attendingCount) || attendingCount < 1 || attendingCount > 20) {
    throw new Error('Guest count must be between 1 and 20.')
  }
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error('Invalid RSVP status.')
  }

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID)
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME)

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Name', 'Number attending', 'RSVP', 'Message'])
    }

    sheet.appendRow([
      new Date(),
      safeCellText(name),
      attendingCount,
      status,
      safeCellText(message),
    ])
  } finally {
    lock.releaseLock()
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON)
}

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function safeCellText(value) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}
