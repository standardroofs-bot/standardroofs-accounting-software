const xlsx = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/hp/Downloads/2026-Nov-Attendance .xlsx';
const wb = xlsx.readFile(filePath);

console.log('Sheet Names:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== SHEET: ${name} (Rows: ${data.length}) ===`);
  for (let i = 0; i < Math.min(10, data.length); i++) {
    if (data[i] && data[i].length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 15)));
    }
  }
}
