const xlsx = require('xlsx');

const filePath = 'C:/Users/hp/Downloads/2026-Nov-Attendance .xlsx';
const wb = xlsx.readFile(filePath);

console.log('=== 1. Office Attendance ===');
const officeSheet = wb.Sheets['Office Attendance'];
const officeRows = xlsx.utils.sheet_to_json(officeSheet, { header: 1 });
// Find header row with EmpId
const officeHeaderIdx = officeRows.findIndex(r => r && r[0] === 'EmpId');
console.log('Office Header Row Index:', officeHeaderIdx);
console.log('Office Header:', officeRows[officeHeaderIdx]);
for (let i = officeHeaderIdx + 1; i < officeRows.length; i++) {
  const row = officeRows[i];
  if (row && row[0] && String(row[0]).startsWith('SR')) {
    console.log(`Office Emp: ${row[0]} | Name: ${row[1]} | Desig: ${row[2]} | P: ${row[3]} | A: ${row[4]} | L: ${row[5]} | Salary: ${row[row.length - 4]} | Paid: ${row[row.length - 1]}`);
  }
}

console.log('\n=== 2. Invi Attendance ===');
const inviSheet = wb.Sheets['Invi Attendance'];
const inviRows = xlsx.utils.sheet_to_json(inviSheet, { header: 1 });
const inviHeaderIdx = inviRows.findIndex(r => r && r[0] === 'EmpId');
console.log('Invi Header Row Index:', inviHeaderIdx);
console.log('Invi Header:', inviRows[inviHeaderIdx]);
for (let i = inviHeaderIdx + 1; i < inviRows.length; i++) {
  const row = inviRows[i];
  if (row && row[0] && String(row[0]).startsWith('Invi')) {
    console.log(`Invi Emp: ${row[0]} | Name: ${row[1]} | Desig: ${row[2]} | P: ${row[3]} | A: ${row[4]} | L: ${row[5]}`);
  }
}

console.log('\n=== 3. Labour_Attendance_1 (Nov) ===');
const lab1Sheet = wb.Sheets['Labour_Attendance_1'];
const lab1Rows = xlsx.utils.sheet_to_json(lab1Sheet, { header: 1 });
const lab1HeaderIdx = lab1Rows.findIndex(r => r && r[0] === 'EmpId');
console.log('Labour 1 Header Row Index:', lab1HeaderIdx);
console.log('Labour 1 Header (first 15 cols):', lab1Rows[lab1HeaderIdx].slice(0, 15));
console.log('Labour 1 Subheader (row 9, first 15 cols):', lab1Rows[lab1HeaderIdx + 2].slice(0, 15));
let lab1Count = 0;
for (let i = lab1HeaderIdx + 3; i < lab1Rows.length; i++) {
  const row = lab1Rows[i];
  if (row && row[0] && !isNaN(Number(row[0]))) {
    lab1Count++;
    if (lab1Count <= 5) {
      console.log(`Lab1 Emp: ${row[0]} | Name: ${row[1]} | Desig: ${row[2]} | Wage: ${row[3]} | P: ${row[4]} | Advance: ${row[8]}`);
    }
  }
}
console.log('Total Lab1 count:', lab1Count);

console.log('\n=== 4. Labour_Attendance_2 (Oct) ===');
const lab2Sheet = wb.Sheets['Labour_Attendance_2'];
const lab2Rows = xlsx.utils.sheet_to_json(lab2Sheet, { header: 1 });
const lab2HeaderIdx = lab2Rows.findIndex(r => r && r[0] === 'EmpId');
let lab2Count = 0;
for (let i = lab2HeaderIdx + 3; i < lab2Rows.length; i++) {
  const row = lab2Rows[i];
  if (row && row[0] && !isNaN(Number(row[0]))) {
    lab2Count++;
  }
}
console.log('Total Lab2 count:', lab2Count);

console.log('\n=== 5. Hindi_Labours_1 (Nov) ===');
const hindi1Sheet = wb.Sheets['Hindi_Labours_1'];
const hindi1Rows = xlsx.utils.sheet_to_json(hindi1Sheet, { header: 1 });
const h1HeaderIdx = hindi1Rows.findIndex(r => r && r[0] === 'EmpId');
for (let i = h1HeaderIdx + 3; i < hindi1Rows.length; i++) {
  const row = hindi1Rows[i];
  if (row && row[0] && !isNaN(Number(row[0]))) {
    console.log(`Hindi1 Emp: ${row[0]} | Name: ${row[1]} | Desig: ${row[2]} | Wage: ${row[3]} | P: ${row[4]}`);
  }
}

console.log('\n=== 6. Contractors ===');
const contractorSheets = ['Nandeeshwaran_Team', ' Contractor_Sakthi', 'Prashop_Team', 'Monier_Suresh', 'Suthish_Team', 'Hydarali_Team'];
for (const cName of contractorSheets) {
  const cSheet = wb.Sheets[cName];
  if (cSheet) {
    const cRows = xlsx.utils.sheet_to_json(cSheet, { header: 1 });
    console.log(`Contractor: ${cName} -> total rows: ${cRows.length}`);
    const validRows = cRows.filter(r => r && r[0] && r[0] !== 'Date' && r[0] !== 'DATE' && !String(r[0]).includes('TEAM'));
    console.log(`  Valid log rows: ${validRows.length}, Sample:`, validRows.slice(0, 3));
  } else {
    console.log(`Contractor sheet NOT found: ${cName}`);
  }
}
