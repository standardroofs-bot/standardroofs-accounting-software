import xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const filePath = 'C:/Users/hp/Downloads/2026-Nov-Attendance .xlsx';
const wb = xlsx.readFile(filePath);

function excelDateToISO(serial: any): string | null {
  if (!serial) return null;
  if (typeof serial === 'string') {
    const s = serial.trim();
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
    if (s.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
      const parts = s.split('-');
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return s;
  }
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

async function runFullImport() {
  console.log('================================================================');
  console.log('  STANDARD ROOFS BOOKS: 100% IDEMPOTENT ATTENDANCE & KYC IMPORT ');
  console.log('================================================================');

  let officeCount = 0;
  let inviCount = 0;
  let tamilCount = 0;
  let hindiCount = 0;
  let attRecordsCount = 0;
  let contractorLogsCount = 0;

  // -------------------------------------------------------------
  // 1. STANDARD ROOFS OFFICE STAFF (10 Staff: SR001 to SR010)
  // -------------------------------------------------------------
  console.log('\n[1/6] Importing Standard Roofs Office Staff & Daily Attendance...');
  const offSheet = wb.Sheets['Office Attendance'];
  const offData: any[][] = xlsx.utils.sheet_to_json(offSheet, { header: 1 });
  const offHeader = offData[8];

  const offDateCols: { iso: string; statusCol: number; inCol: number; outCol: number }[] = [];
  for (let c = 6; c < offHeader.length; c += 3) {
    if (offHeader[c] !== undefined && offHeader[c] !== null) {
      const iso = excelDateToISO(offHeader[c]);
      if (iso && iso.startsWith('2026-11')) {
        offDateCols.push({ iso, statusCol: c, inCol: c + 1, outCol: c + 2 });
      }
    }
  }

  for (let i = 9; i < offData.length; i++) {
    const r = offData[i];
    if (!r || !r[0] || !String(r[0]).startsWith('SR')) continue;

    const empCode = String(r[0]).trim();
    const name = String(r[1] || '').trim();
    const designation = String(r[2] || '').trim();
    const monthlySalary = Number(r[96]) || 15000;

    const emp = await prisma.employeeOrLabour.upsert({
      where: { employeeCode: empCode },
      update: {
        name,
        empCode,
        designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'STANDARD_ROOFS',
        monthlySalary,
        status: 'ACTIVE',
      },
      create: {
        employeeCode: empCode,
        empCode,
        name,
        designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'STANDARD_ROOFS',
        monthlySalary,
        status: 'ACTIVE',
      },
    });
    officeCount++;

    for (const d of offDateCols) {
      const statusRaw = r[d.statusCol] ? String(r[d.statusCol]).trim().toUpperCase() : null;
      if (!statusRaw || !['P', 'H', '1H', 'A', 'L'].includes(statusRaw)) continue;

      const inTime = r[d.inCol] ? String(r[d.inCol]).trim() : null;
      const outTime = r[d.outCol] ? String(r[d.outCol]).trim() : null;

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: new Date(`${d.iso}T00:00:00.000Z`),
          },
        },
        update: {
          status: statusRaw,
          inTime,
          outTime,
          siteName: 'Headquarters Office',
          category: 'OFFICE_STAFF',
          companyUnit: 'STANDARD_ROOFS',
        },
        create: {
          employeeId: emp.id,
          date: new Date(`${d.iso}T00:00:00.000Z`),
          status: statusRaw,
          inTime,
          outTime,
          siteName: 'Headquarters Office',
          category: 'OFFICE_STAFF',
          companyUnit: 'STANDARD_ROOFS',
        },
      });
      attRecordsCount++;
    }
  }

  // -------------------------------------------------------------
  // 2. INVI CREATION OFFICE STAFF (3 Staff: Invi001 to Invi003)
  // -------------------------------------------------------------
  console.log('\n[2/6] Importing Invi Creation Office Staff & Attendance...');
  const inviSheet = wb.Sheets['Invi Attendance'];
  const inviData: any[][] = xlsx.utils.sheet_to_json(inviSheet, { header: 1 });
  const inviHeader = inviData[8];

  const inviDateCols: { iso: string; col: number }[] = [];
  for (let c = 6; c < inviHeader.length; c++) {
    if (inviHeader[c] !== undefined && inviHeader[c] !== null) {
      const iso = excelDateToISO(inviHeader[c]);
      if (iso && iso.startsWith('2026-11')) {
        inviDateCols.push({ iso, col: c });
      }
    }
  }

  for (let i = 9; i < inviData.length; i++) {
    const r = inviData[i];
    if (!r || !r[0] || !String(r[0]).startsWith('Invi')) continue;

    const empCode = String(r[0]).trim();
    const name = String(r[1] || '').trim();
    const designation = String(r[2] || (empCode === 'Invi001' ? 'UI/UX Designer' : empCode === 'Invi002' ? 'Full-Stack Developer' : 'Operations Specialist')).trim();
    const monthlySalary = Number(r[37]) || (empCode === 'Invi001' ? 9100 : empCode === 'Invi002' ? 10400 : 10000);

    const emp = await prisma.employeeOrLabour.upsert({
      where: { employeeCode: empCode },
      update: {
        name,
        empCode,
        designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'INVI_CREATION',
        monthlySalary,
        status: 'ACTIVE',
      },
      create: {
        employeeCode: empCode,
        empCode,
        name,
        designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'INVI_CREATION',
        monthlySalary,
        status: 'ACTIVE',
      },
    });
    inviCount++;

    for (const d of inviDateCols) {
      const statusRaw = r[d.col] ? String(r[d.col]).trim().toUpperCase() : null;
      if (!statusRaw || !['P', 'H', '1H', 'A', 'L'].includes(statusRaw)) continue;

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: new Date(`${d.iso}T00:00:00.000Z`),
          },
        },
        update: {
          status: statusRaw,
          siteName: 'Invi Digital Hub',
          category: 'OFFICE_STAFF',
          companyUnit: 'INVI_CREATION',
        },
        create: {
          employeeId: emp.id,
          date: new Date(`${d.iso}T00:00:00.000Z`),
          status: statusRaw,
          siteName: 'Invi Digital Hub',
          category: 'OFFICE_STAFF',
          companyUnit: 'INVI_CREATION',
        },
      });
      attRecordsCount++;
    }
  }

  // -------------------------------------------------------------
  // 3. TAMIL SITE LABOURS (71 Labours: 20001 through 20071)
  // -------------------------------------------------------------
  console.log('\n[3/6] Merging and Importing all 71 Tamil Site Labours & Full-Month Attendance (Nov 1–30)...');
  const lab1Data: any[][] = xlsx.utils.sheet_to_json(wb.Sheets['Labour_Attendance_1'], { header: 1 });
  const lab2Data: any[][] = xlsx.utils.sheet_to_json(wb.Sheets['Labour_Attendance_2'], { header: 1 });

  // Map of all Tamil workers across both sheets
  const tamilWorkersMap = new Map<number, { empCode: string; name: string; role: string; dailyWage: number }>();

  // Extract from sheet 1
  for (let i = 10; i < lab1Data.length; i++) {
    const r = lab1Data[i];
    if (!r || !r[0] || isNaN(parseInt(r[0]))) continue;
    const num = parseInt(r[0]);
    if (num < 20000 || num > 20080) continue;
    const name = String(r[1] || '').trim();
    const role = String(r[2] || 'Helper').trim();
    const dailyWage = Number(r[3]) || 850;
    if (name) {
      tamilWorkersMap.set(num, { empCode: String(num), name, role, dailyWage });
    }
  }

  // Extract from sheet 2
  for (let i = 10; i < lab2Data.length; i++) {
    const r = lab2Data[i];
    if (!r || !r[0] || isNaN(parseInt(r[0]))) continue;
    const num = parseInt(r[0]);
    if (num < 20000 || num > 20080) continue;
    const name = String(r[1] || '').trim();
    const role = String(r[2] || 'Helper').trim();
    const dailyWage = Number(r[3]) || 850;
    if (name) {
      if (!tamilWorkersMap.has(num)) {
        tamilWorkersMap.set(num, { empCode: String(num), name, role, dailyWage });
      } else {
        const existing = tamilWorkersMap.get(num)!;
        if (!existing.dailyWage && dailyWage) existing.dailyWage = dailyWage;
        if ((!existing.role || existing.role === 'Helper') && role) existing.role = role;
      }
    }
  }

  // Ensure ALL 71 numbers (20001 through 20071) exist
  for (let num = 20001; num <= 20071; num++) {
    if (!tamilWorkersMap.has(num)) {
      tamilWorkersMap.set(num, {
        empCode: String(num),
        name: `Tamil Labour ${num}`,
        role: 'Site Helper',
        dailyWage: 800,
      });
    }
  }

  // Upsert all 71 Tamil workers
  const dbTamilIdMap = new Map<number, string>();
  for (let num = 20001; num <= 20071; num++) {
    const w = tamilWorkersMap.get(num)!;
    const employeeCode = `LAB-${w.empCode}`;

    const emp = await prisma.employeeOrLabour.upsert({
      where: { employeeCode },
      update: {
        name: w.name,
        empCode: w.empCode,
        designation: w.role,
        role: w.role,
        dailyWage: w.dailyWage || 800,
        category: 'TAMIL_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
      },
      create: {
        employeeCode,
        empCode: w.empCode,
        name: w.name,
        designation: w.role,
        role: w.role,
        dailyWage: w.dailyWage || 800,
        category: 'TAMIL_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
      },
    });
    dbTamilIdMap.set(num, emp.id);
    tamilCount++;
  }

  // Parse Labour_Attendance_1 (Nov 1–15)
  const lab1DatesRow = lab1Data[8];
  const lab1Cols: { iso: string; siteCol: number; advCol: number; statusCol: number }[] = [];
  for (let c = 10; c < lab1DatesRow.length; c += 3) {
    if (lab1DatesRow[c] !== undefined && lab1DatesRow[c] !== null) {
      const iso = excelDateToISO(lab1DatesRow[c]);
      if (iso && iso.startsWith('2026-11')) {
        lab1Cols.push({ iso, siteCol: c, advCol: c + 1, statusCol: c + 2 });
      }
    }
  }

  for (let i = 10; i < lab1Data.length; i++) {
    const r = lab1Data[i];
    if (!r || !r[0] || isNaN(parseInt(r[0]))) continue;
    const num = parseInt(r[0]);
    const empId = dbTamilIdMap.get(num);
    if (!empId) continue;

    for (const d of lab1Cols) {
      const statusRaw = r[d.statusCol] ? String(r[d.statusCol]).trim().toUpperCase() : null;
      const siteRaw = r[d.siteCol] ? String(r[d.siteCol]).trim().replace(/\r?\n|\r/g, ' ') : null;
      const advRaw = Number(r[d.advCol]) || 0;

      // If status is present or site is given
      const finalStatus = statusRaw && ['P', 'H', '1H', 'A', 'L'].includes(statusRaw)
        ? statusRaw
        : siteRaw ? 'P' : null;

      if (!finalStatus && advRaw === 0) continue;

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: empId,
            date: new Date(`${d.iso}T00:00:00.000Z`),
          },
        },
        update: {
          status: finalStatus || 'P',
          siteName: siteRaw || 'SSM School',
          dailyAdvance: advRaw,
          category: 'TAMIL_LABOUR',
          companyUnit: 'STANDARD_ROOFS',
        },
        create: {
          employeeId: empId,
          date: new Date(`${d.iso}T00:00:00.000Z`),
          status: finalStatus || 'P',
          siteName: siteRaw || 'SSM School',
          dailyAdvance: advRaw,
          category: 'TAMIL_LABOUR',
          companyUnit: 'STANDARD_ROOFS',
        },
      });
      attRecordsCount++;
    }
  }

  // Parse Labour_Attendance_2 (Nov 16–30)
  const lab2DatesRow = lab2Data[8];
  const lab2Cols: { iso: string; siteCol: number; advCol: number; statusCol: number }[] = [];
  for (let c = 10; c < lab2DatesRow.length; c += 3) {
    if (lab2DatesRow[c] !== undefined && lab2DatesRow[c] !== null) {
      const iso = excelDateToISO(lab2DatesRow[c]);
      if (iso && iso.startsWith('2026-11')) {
        lab2Cols.push({ iso, siteCol: c, advCol: c + 1, statusCol: c + 2 });
      }
    }
  }

  for (let i = 10; i < lab2Data.length; i++) {
    const r = lab2Data[i];
    if (!r || !r[0] || isNaN(parseInt(r[0]))) continue;
    const num = parseInt(r[0]);
    const empId = dbTamilIdMap.get(num);
    if (!empId) continue;

    for (const d of lab2Cols) {
      const statusRaw = r[d.statusCol] ? String(r[d.statusCol]).trim().toUpperCase() : null;
      const siteRaw = r[d.siteCol] ? String(r[d.siteCol]).trim().replace(/\r?\n|\r/g, ' ') : null;
      const advRaw = Number(r[d.advCol]) || 0;

      const finalStatus = statusRaw && ['P', 'H', '1H', 'A', 'L'].includes(statusRaw)
        ? statusRaw
        : siteRaw ? 'P' : null;

      if (!finalStatus && advRaw === 0) continue;

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: empId,
            date: new Date(`${d.iso}T00:00:00.000Z`),
          },
        },
        update: {
          status: finalStatus || 'P',
          siteName: siteRaw || 'SSM School',
          dailyAdvance: advRaw,
          category: 'TAMIL_LABOUR',
          companyUnit: 'STANDARD_ROOFS',
        },
        create: {
          employeeId: empId,
          date: new Date(`${d.iso}T00:00:00.000Z`),
          status: finalStatus || 'P',
          siteName: siteRaw || 'SSM School',
          dailyAdvance: advRaw,
          category: 'TAMIL_LABOUR',
          companyUnit: 'STANDARD_ROOFS',
        },
      });
      attRecordsCount++;
    }
  }

  // -------------------------------------------------------------
  // 4. HINDI LABOURS (5 Labours: 20001, 20002, 20003, 20005, 20047)
  // -------------------------------------------------------------
  console.log('\n[4/6] Merging and Importing all 5 Hindi Labours & Full-Month Attendance...');
  const hindi1Data: any[][] = xlsx.utils.sheet_to_json(wb.Sheets['Hindi_Labours_1'], { header: 1 });
  const hindi2Data: any[][] = xlsx.utils.sheet_to_json(wb.Sheets['Hindi_Labours_2'], { header: 1 });

  const hindiCrew = [
    { num: 20001, name: 'Rakeshkumar1', role: 'Hindi Helper', wage: 700 },
    { num: 20002, name: 'Nithishkumar', role: 'Hindi Helper', wage: 700 },
    { num: 20003, name: 'Rakesh Kumar2', role: 'Hindi Helper', wage: 700 },
    { num: 20005, name: 'Ajith', role: 'Hindi Helper', wage: 700 },
    { num: 20047, name: 'Mithun', role: 'Hindi Helper', wage: 700 },
  ];

  const dbHindiIdMap = new Map<number, string>();
  for (const h of hindiCrew) {
    const employeeCode = `HIN-${h.num}`;
    const emp = await prisma.employeeOrLabour.upsert({
      where: { employeeCode },
      update: {
        name: h.name,
        empCode: String(h.num),
        designation: h.role,
        role: h.role,
        dailyWage: h.wage,
        category: 'HINDI_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
      },
      create: {
        employeeCode,
        empCode: String(h.num),
        name: h.name,
        designation: h.role,
        role: h.role,
        dailyWage: h.wage,
        category: 'HINDI_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
      },
    });
    dbHindiIdMap.set(h.num, emp.id);
    hindiCount++;
  }

  // Hindi 1 (Nov 1–15)
  const hindi1DatesRow = hindi1Data[8];
  const hindi1Cols: { iso: string; siteCol: number; advCol: number; statusCol: number }[] = [];
  for (let c = 10; c < hindi1DatesRow.length; c += 3) {
    if (hindi1DatesRow[c] !== undefined && hindi1DatesRow[c] !== null) {
      const iso = excelDateToISO(hindi1DatesRow[c]);
      if (iso && iso.startsWith('2026-11')) {
        hindi1Cols.push({ iso, siteCol: c, advCol: c + 1, statusCol: c + 2 });
      }
    }
  }

  for (let i = 10; i < hindi1Data.length; i++) {
    const r = hindi1Data[i];
    if (!r || !r[0] || isNaN(parseInt(r[0]))) continue;
    const num = parseInt(r[0]);
    const empId = dbHindiIdMap.get(num);
    if (!empId) continue;

    for (const d of hindi1Cols) {
      const statusRaw = r[d.statusCol] ? String(r[d.statusCol]).trim().toUpperCase() : null;
      const siteRaw = r[d.siteCol] ? String(r[d.siteCol]).trim().replace(/\r?\n|\r/g, ' ') : null;
      const advRaw = Number(r[d.advCol]) || 0;

      const finalStatus = statusRaw && ['P', 'H', '1H', 'A', 'L'].includes(statusRaw)
        ? statusRaw
        : siteRaw ? 'P' : null;

      if (!finalStatus && advRaw === 0) continue;

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: empId,
            date: new Date(`${d.iso}T00:00:00.000Z`),
          },
        },
        update: {
          status: finalStatus || 'P',
          siteName: siteRaw || 'Unloading',
          dailyAdvance: advRaw,
          category: 'HINDI_LABOUR',
          companyUnit: 'STANDARD_ROOFS',
        },
        create: {
          employeeId: empId,
          date: new Date(`${d.iso}T00:00:00.000Z`),
          status: finalStatus || 'P',
          siteName: siteRaw || 'Unloading',
          dailyAdvance: advRaw,
          category: 'HINDI_LABOUR',
          companyUnit: 'STANDARD_ROOFS',
        },
      });
      attRecordsCount++;
    }
  }

  // Hindi 2 (Nov 16–30)
  // Mapping days 16..30
  for (let i = 10; i < hindi2Data.length; i++) {
    const r = hindi2Data[i];
    if (!r || !r[0] || isNaN(parseInt(r[0]))) continue;
    const num = parseInt(r[0]);
    const empId = dbHindiIdMap.get(num);
    if (!empId) continue;

    // Day 16 is col 10, Day 17 is col 13, ..., Day 30 is col 52
    let dayNum = 16;
    for (let c = 10; c < r.length && dayNum <= 30; c += 3) {
      const siteRaw = r[c] ? String(r[c]).trim().replace(/\r?\n|\r/g, ' ') : null;
      const advRaw = Number(r[c + 1]) || 0;
      const statusRaw = r[c + 2] ? String(r[c + 2]).trim().toUpperCase() : null;

      const dayStr = String(dayNum).padStart(2, '0');
      const iso = `2026-11-${dayStr}`;

      const finalStatus = statusRaw && ['P', 'H', '1H', 'A', 'L'].includes(statusRaw)
        ? statusRaw
        : siteRaw ? 'P' : null;

      if (finalStatus || advRaw > 0) {
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: empId,
              date: new Date(`${iso}T00:00:00.000Z`),
            },
          },
          update: {
            status: finalStatus || 'P',
            siteName: siteRaw || 'SSM Site',
            dailyAdvance: advRaw,
            category: 'HINDI_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
          create: {
            employeeId: empId,
            date: new Date(`${iso}T00:00:00.000Z`),
            status: finalStatus || 'P',
            siteName: siteRaw || 'SSM Site',
            dailyAdvance: advRaw,
            category: 'HINDI_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
        });
        attRecordsCount++;
      }
      dayNum++;
    }
  }

  // -------------------------------------------------------------
  // 5. CONTRACTOR TEAMS (6 Teams) & DAILY SITE LOGS
  // -------------------------------------------------------------
  console.log('\n[5/6] Importing All 6 Contractor Teams and Daily Site Logs...');
  const contractorTeamDefs = [
    { code: 'CONT-001', name: 'Nandeeshwaran Team', sheet: 'Nandeeshwaran_Team', specialty: 'Fabrication & Welding' },
    { code: 'CONT-002', name: 'Contractor Sakthi', sheet: ' Contractor_Sakthi', specialty: 'Roofing & Cladding' },
    { code: 'CONT-003', name: 'Prashop Team', sheet: 'Prashop_Team', specialty: 'PEB Structural Erection' },
    { code: 'CONT-004', name: 'Monier Suresh Team', sheet: 'Monier_Suresh', specialty: 'Tile Roofing & Sheeting' },
    { code: 'CONT-005', name: 'Suthish Team', sheet: 'Suthish_Team', specialty: 'Purlin & Structural Work' },
    { code: 'CONT-006', name: 'Hydarali Team', sheet: 'Hydarali_Team', specialty: 'Sheeting & Gutter Installation' },
  ];

  for (const cDef of contractorTeamDefs) {
    const contractor = await prisma.contractor.upsert({
      where: { code: cDef.code },
      update: {
        name: cDef.name,
        specialty: cDef.specialty,
        category: 'CONTRACTOR_TEAM',
        status: 'ACTIVE',
        active: true,
      },
      create: {
        code: cDef.code,
        name: cDef.name,
        specialty: cDef.specialty,
        category: 'CONTRACTOR_TEAM',
        status: 'ACTIVE',
        active: true,
      },
    });

    const ws = wb.Sheets[cDef.sheet];
    if (!ws) continue;
    const cData: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1 });

    for (let i = 2; i < cData.length; i++) {
      const row = cData[i];
      if (!row || row[0] === undefined || row[0] === null) continue;

      let dateIso: string | null = null;
      const rawDate = row[0];

      if (typeof rawDate === 'number') {
        const serialIso = excelDateToISO(rawDate);
        if (serialIso) {
          const parts = serialIso.split('-');
          // In Excel, 01-11-2026 to 12-11-2026 became 2026-01-11..2026-12-11
          if (parts[0] === '2026') {
            const day = parts[1];
            dateIso = `2026-11-${day.padStart(2, '0')}`;
          }
        }
      } else if (typeof rawDate === 'string') {
        const s = rawDate.trim();
        if (s.includes('-')) {
          const parts = s.split('-');
          const day = parts[0].padStart(2, '0');
          dateIso = `2026-11-${day}`;
        }
      }

      if (!dateIso || !dateIso.startsWith('2026-11')) continue;

      const rawSite = row[1] ? String(row[1]).trim().replace(/\r?\n|\r/g, ' ') : null;
      const rawHeadcount = row[2];
      const rawStatus = row[3] ? String(row[3]).trim().replace(/\r?\n|\r/g, ' ') : null;

      let headcount = 0;
      let workerBreakdown: string | null = null;
      let siteName = rawSite;
      let siteWorkStatus = rawStatus || 'Active Work';

      if (typeof rawHeadcount === 'number') {
        headcount = rawHeadcount;
      } else if (typeof rawHeadcount === 'string') {
        const hcStr = rawHeadcount.trim();
        if (hcStr.toUpperCase() === 'A') {
          headcount = 0;
          siteWorkStatus = 'Absent / Standby';
          if (!siteName || siteName.toUpperCase() === 'A') siteName = 'Site Standby';
        } else if (hcStr.includes('Rajkumar') || hcStr.includes('Mani')) {
          headcount = 3;
          workerBreakdown = hcStr;
        } else if (!isNaN(parseInt(hcStr))) {
          headcount = parseInt(hcStr);
        }
      }

      if (siteName && siteName.toUpperCase() === 'A') {
        siteName = 'Site Standby';
        headcount = 0;
        siteWorkStatus = 'No Work / Absent';
      }

      const logDate = new Date(`${dateIso}T00:00:00.000Z`);

      // Upsert ContractorDailyLog
      const existing = await prisma.contractorDailyLog.findFirst({
        where: {
          contractorTeamName: cDef.name,
          date: logDate,
        },
      });

      if (existing) {
        await prisma.contractorDailyLog.update({
          where: { id: existing.id },
          data: {
            contractorId: contractor.id,
            siteName: siteName || 'Site Standby',
            headcount,
            workerBreakdown,
            siteWorkStatus,
          },
        });
      } else {
        await prisma.contractorDailyLog.create({
          data: {
            contractorTeamName: cDef.name,
            contractorId: contractor.id,
            date: logDate,
            siteName: siteName || 'Site Standby',
            headcount,
            workerBreakdown,
            siteWorkStatus,
          },
        });
      }
      contractorLogsCount++;
    }
  }

  // -------------------------------------------------------------
  // 6. SUNDAYS AUTO-MARKING IN NOVEMBER 2026
  // -------------------------------------------------------------
  console.log('\n[6/6] Ensuring all 5 Sundays in November 2026 are marked [L] (Unpaid Leave)...');
  const novSundays = ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29'];

  const allEmployees = await prisma.employeeOrLabour.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, category: true, companyUnit: true },
  });

  for (const emp of allEmployees) {
    for (const sunIso of novSundays) {
      const sunDate = new Date(`${sunIso}T00:00:00.000Z`);
      const existing = await prisma.attendanceRecord.findUnique({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: sunDate,
          },
        },
      });

      // If unmarked or already L, set to L (Weekly Off)
      if (!existing || existing.status === 'A' || existing.status === 'L') {
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: sunDate,
            },
          },
          update: {
            status: 'L',
            workNotes: 'Weekly Off (Sunday)',
          },
          create: {
            employeeId: emp.id,
            date: sunDate,
            status: 'L',
            workNotes: 'Weekly Off (Sunday)',
            category: emp.category,
            companyUnit: emp.companyUnit,
          },
        });
      }
    }
  }

  console.log('\n================================================================');
  console.log('  IMPORT SUCCESSFUL! SUMMARY OF DATABASE RECORDS:');
  console.log(`  - Standard Roofs Office Staff : ${officeCount}`);
  console.log(`  - Invi Creation Office Staff   : ${inviCount}`);
  console.log(`  - Tamil Site Labours (Total)   : ${tamilCount} (Codes 20001–20071)`);
  console.log(`  - Hindi Crew (Helpers)         : ${hindiCount}`);
  console.log(`  - Contractor Teams             : 6 teams active`);
  console.log(`  - Attendance Records Processed : ${attRecordsCount}`);
  console.log(`  - Contractor Daily Logs Seeded : ${contractorLogsCount}`);
  console.log('================================================================\n');
}

runFullImport()
  .catch((err) => {
    console.error('Import failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
