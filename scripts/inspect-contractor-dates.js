const xlsx = require('xlsx');

const filePath = 'C:/Users/hp/Downloads/2026-Nov-Attendance .xlsx';
const wb = xlsx.readFile(filePath);

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  if (s.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
    const p = s.split('-');
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  return s;
}

const contractorSheets = ['Nandeeshwaran_Team', ' Contractor_Sakthi', 'Prashop_Team', 'Monier_Suresh', 'Suthish_Team', 'Hydarali_Team'];
for (const cName of contractorSheets) {
  const sheet = wb.Sheets[cName];
  if (!sheet) continue;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== Contractor: ${cName} ===`);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r && r[0] && r[0] !== 'Date' && r[0] !== 'DATE' && !String(r[0]).includes('TEAM') && !String(r[0]).includes('Team')) {
      const parsedD = parseDate(r[0]);
      console.log(`Row ${i}: RawDate="${r[0]}" -> ParsedDate="${parsedD}" | Site="${r[1]}" | Headcount="${r[2]}" | Status="${r[3]}"`);
    }
  }
}
