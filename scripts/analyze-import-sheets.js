const xlsx = require('xlsx');

const filePath = 'C:/Users/hp/Downloads/2026-Nov-Attendance .xlsx';
const wb = xlsx.readFile(filePath);

function excelDateToISO(serial) {
  if (typeof serial === 'string') {
    // Check if it's already a date string like "2026-11-01" or "13-11-2026"
    if (serial.includes('-')) {
      const parts = serial.split('-');
      if (parts[0].length === 4) return serial; // YYYY-MM-DD
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return serial;
  }
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

console.log('--- Office Attendance Dates & Cols ---');
const offSheet = wb.Sheets['Office Attendance'];
const offData = xlsx.utils.sheet_to_json(offSheet, { header: 1 });
const offHeader = offData[8];
const offDates = [];
for (let c = 6; c < offHeader.length; c += 3) {
  if (offHeader[c] !== undefined && offHeader[c] !== null) {
    offDates.push({ col: c, raw: offHeader[c], iso: excelDateToISO(offHeader[c]), inCol: c + 1, outCol: c + 2 });
  }
}
console.log('Office Days Count:', offDates.length, 'First:', offDates[0], 'Last:', offDates[offDates.length - 1]);

console.log('\n--- Invi Attendance Dates & Cols ---');
const inviSheet = wb.Sheets['Invi Attendance'];
const inviData = xlsx.utils.sheet_to_json(inviSheet, { header: 1 });
const inviHeader = inviData[8];
const inviDates = [];
for (let c = 6; c < inviHeader.length; c++) {
  if (inviHeader[c] !== undefined && inviHeader[c] !== null) {
    inviDates.push({ col: c, raw: inviHeader[c], iso: excelDateToISO(inviHeader[c]) });
  }
}
console.log('Invi Days Count:', inviDates.length, 'First:', inviDates[0], 'Last:', inviDates[inviDates.length - 1]);

console.log('\n--- Labour_Attendance_1 Dates & Cols ---');
const lab1Sheet = wb.Sheets['Labour_Attendance_1'];
const lab1Data = xlsx.utils.sheet_to_json(lab1Sheet, { header: 1 });
const lab1DatesRow = lab1Data[8];
const lab1Dates = [];
for (let c = 10; c < lab1DatesRow.length; c += 3) {
  if (lab1DatesRow[c] !== undefined && lab1DatesRow[c] !== null) {
    lab1Dates.push({ col: c, raw: lab1DatesRow[c], iso: excelDateToISO(lab1DatesRow[c]), siteCol: c, advCol: c + 1, statusCol: c + 2 });
  }
}
console.log('Lab1 Days Count:', lab1Dates.length, 'Days:', lab1Dates.map(d => d.iso));

console.log('\n--- Labour_Attendance_2 Dates & Cols ---');
const lab2Sheet = wb.Sheets['Labour_Attendance_2'];
const lab2Data = xlsx.utils.sheet_to_json(lab2Sheet, { header: 1 });
const lab2DatesRow = lab2Data[8];
const lab2Dates = [];
for (let c = 10; c < lab2DatesRow.length; c += 3) {
  if (lab2DatesRow[c] !== undefined && lab2DatesRow[c] !== null) {
    lab2Dates.push({ col: c, raw: lab2DatesRow[c], iso: excelDateToISO(lab2DatesRow[c]), siteCol: c, advCol: c + 1, statusCol: c + 2 });
  }
}
console.log('Lab2 Days Count:', lab2Dates.length, 'Sample Days:', lab2Dates.slice(0, 5).map(d => d.iso));

console.log('\n--- Hindi_Labours_1 Dates & Cols ---');
const h1Sheet = wb.Sheets['Hindi_Labours_1'];
const h1Data = xlsx.utils.sheet_to_json(h1Sheet, { header: 1 });
const h1DatesRow = h1Data[8];
const h1Dates = [];
for (let c = 10; c < h1DatesRow.length; c += 3) {
  if (h1DatesRow[c] !== undefined && h1DatesRow[c] !== null) {
    h1Dates.push({ col: c, raw: h1DatesRow[c], iso: excelDateToISO(h1DatesRow[c]), siteCol: c, advCol: c + 1, statusCol: c + 2 });
  }
}
console.log('Hindi 1 Days Count:', h1Dates.length, 'Days:', h1Dates.map(d => d.iso));
