export const PLAN_SHEET_ID = '1pUqM0XL2nK-FjK-mAW8AlSTyIS36bt7i'
export const REPORT_SHEET_ID = '1LrrcdSHF0BJXlp0pf4i0TfnMPKmY0DaNRgyw334Wx9o'

export const PLAN_SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${PLAN_SHEET_ID}/edit?usp=sharing`

export const REPORT_SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${REPORT_SHEET_ID}/edit?usp=sharing`

export const FORM_SHORT_URL = 'https://forms.gle/L95o98CQEA9vaDuG9'

export const FORM_ID =
  '1FAIpQLSf81OforY-FET7gvlPjPPJxmtNNIwV9X2OYX10hgFV-gIqGdQ'

export const FORM_VIEW_URL =
  `https://docs.google.com/forms/d/e/${FORM_ID}/viewform`

export const FORM_EMBED_URL = `${FORM_VIEW_URL}?embedded=true`

export function sheetCsvUrl(id: string) {
  return `/gexport/spreadsheets/d/${id}/export?format=csv`
}
