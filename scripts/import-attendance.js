const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = 'C:/Users/hp/Downloads/2026-Nov-Attendance .xlsx';
const wb = xlsx.readFile(filePath);

function excelDateToISO(serial) {
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

async function runImport() {
  console.log('====================================================');
  console.log('  SR-BOOKS ERP: ATTENDANCE & WORKFORCE SEEDING ENGINE ');
  console.log('====================================================');

  let officeCount = 0;
  let inviCount = 0;
  let tamilLabourCount = 0;
  let hindiLabourCount = 0;
  let attendanceCount = 0;
  let contractorLogCount = 0;

  // -------------------------------------------------------------
  // 1. STANDARD ROOFS OFFICE STAFF
  // -------------------------------------------------------------
  console.log('\n[1/5] Importing Standard Roofs Office Staff & Attendance...');
  const offSheet = wb.Sheets['Office Attendance'];
  const offData = xlsx.utils.sheet_to_json(offSheet, { header: 1 });
  const offHeader = offData[8];

  // Extract columns for dates 1 to 30
  const offDateCols = [];
  for (let c = 6; c < offHeader.length; c += 3) {
    if (offHeader[c] !== undefined && offHeader[c] !== null) {
      offDateCols.push({
        iso: excelDateToISO(offHeader[c]),
        statusCol: c,
        inCol: c + 1,
        outCol: c + 2,
      });
    }
  }

  for (let i = 9; i < offData.length; i++) {
    const r = offData[i];
    if (!r || !r[0] || !String(r[0]).startsWith('SR')) continue;

    const empCode = String(r[0]).trim();
    const name = String(r[1] || '').trim();
    const designation = String(r[2] || 'Office Staff').trim();
    const monthlySalary = Number(r[r.length - 4]) || 15000;

    const employee = await prisma.employeeOrLabour.upsert({
      where: { employeeCode: empCode },
      update: {
        name,
        empCode,
        designation,
        role: designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'STANDARD_ROOFS',
        monthlySalary,
        status: 'ACTIVE',
        active: true,
      },
      create: {
        employeeCode: empCode,
        empCode,
        name,
        designation,
        role: designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'STANDARD_ROOFS',
        monthlySalary,
        status: 'ACTIVE',
        active: true,
      },
    });
    officeCount++;

    // Seed attendance for November
    for (const d of offDateCols) {
      if (!d.iso) continue;
      const statusRaw = r[d.statusCol];
      if (!statusRaw) continue;

      let status = String(statusRaw).trim().toUpperCase();
      if (!['P', 'H', 'A', 'L'].includes(status)) {
        if (status === '1') status = 'P';
        else if (status === '0.5') status = 'H';
        else if (status === '0') status = 'A';
        else status = 'P';
      }

      const inTime = r[d.inCol] ? String(r[d.inCol]).trim() : null;
      const outTime = r[d.outCol] ? String(r[d.outCol]).trim() : null;
      const targetDate = new Date(`${d.iso}T00:00:00.000Z`);

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: targetDate,
          },
        },
        update: {
          status,
          inTime,
          outTime,
          category: 'OFFICE_STAFF',
          companyUnit: 'STANDARD_ROOFS',
          siteName: 'Headquarters Office (Erode)',
        },
        create: {
          employeeId: employee.id,
          date: targetDate,
          status,
          inTime,
          outTime,
          category: 'OFFICE_STAFF',
          companyUnit: 'STANDARD_ROOFS',
          siteName: 'Headquarters Office (Erode)',
        },
      });
      attendanceCount++;
    }
  }
  console.log(`[✓] Seeded ${officeCount} Standard Roofs Office Staff.`);

  // -------------------------------------------------------------
  // 2. INVI CREATION OFFICE STAFF
  // -------------------------------------------------------------
  console.log('\n[2/5] Importing Invi Creation Office Staff & Attendance...');
  const inviSheet = wb.Sheets['Invi Attendance'];
  const inviData = xlsx.utils.sheet_to_json(inviSheet, { header: 1 });
  const inviHeader = inviData[8];

  const inviDateCols = [];
  for (let c = 6; c < inviHeader.length; c++) {
    if (inviHeader[c] !== undefined && inviHeader[c] !== null) {
      inviDateCols.push({
        iso: excelDateToISO(inviHeader[c]),
        col: c,
      });
    }
  }

  for (let i = 9; i < inviData.length; i++) {
    const r = inviData[i];
    if (!r || !r[0] || !String(r[0]).startsWith('Invi')) continue;

    const empCode = String(r[0]).trim();
    const name = String(r[1] || '').trim();
    const designation = String(r[2] || (empCode === 'Invi001' ? 'UI/UX Designer' : empCode === 'Invi002' ? 'Full-Stack Developer' : 'Operations Specialist')).trim();
    const monthlySalary = Number(r[r.length - 4]) || 10000;

    const employee = await prisma.employeeOrLabour.upsert({
      where: { employeeCode: empCode },
      update: {
        name,
        empCode,
        designation,
        role: designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'INVI_CREATION',
        monthlySalary,
        status: 'ACTIVE',
        active: true,
      },
      create: {
        employeeCode: empCode,
        empCode,
        name,
        designation,
        role: designation,
        category: 'OFFICE_STAFF',
        companyUnit: 'INVI_CREATION',
        monthlySalary,
        status: 'ACTIVE',
        active: true,
      },
    });
    inviCount++;

    for (const d of inviDateCols) {
      if (!d.iso || d.iso > '2026-11-30') continue; // keep within November
      const statusRaw = r[d.col];
      if (!statusRaw) continue;

      let status = String(statusRaw).trim().toUpperCase();
      if (!['P', 'H', 'A', 'L'].includes(status)) status = 'P';
      const targetDate = new Date(`${d.iso}T00:00:00.000Z`);

      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: targetDate,
          },
        },
        update: {
          status,
          category: 'OFFICE_STAFF',
          companyUnit: 'INVI_CREATION',
          siteName: 'Invi Digital Hub (Erode)',
        },
        create: {
          employeeId: employee.id,
          date: targetDate,
          status,
          category: 'OFFICE_STAFF',
          companyUnit: 'INVI_CREATION',
          siteName: 'Invi Digital Hub (Erode)',
        },
      });
      attendanceCount++;
    }
  }
  console.log(`[✓] Seeded ${inviCount} Invi Staff.`);

  // -------------------------------------------------------------
  // 3. TAMIL SITE LABOURS (DEDUPLICATED ACROSS CYCLE 1 & CYCLE 2)
  // -------------------------------------------------------------
  console.log('\n[3/5] Importing Tamil Site Labours & November Site Attendance...');
  const lab1Sheet = wb.Sheets['Labour_Attendance_1'];
  const lab1Data = xlsx.utils.sheet_to_json(lab1Sheet, { header: 1 });
  const lab1DatesRow = lab1Data[8];

  const lab1DateCols = [];
  for (let c = 10; c < lab1DatesRow.length; c += 3) {
    if (lab1DatesRow[c] !== undefined && lab1DatesRow[c] !== null) {
      lab1DateCols.push({
        iso: excelDateToISO(lab1DatesRow[c]),
        siteCol: c,
        advCol: c + 1,
        statusCol: c + 2,
      });
    }
  }

  const lab2Sheet = wb.Sheets['Labour_Attendance_2'];
  const lab2Data = xlsx.utils.sheet_to_json(lab2Sheet, { header: 1 });
  const lab2DatesRow = lab2Data[8];

  const lab2DateCols = [];
  for (let c = 10; c < lab2DatesRow.length; c += 3) {
    if (lab2DatesRow[c] !== undefined && lab2DatesRow[c] !== null) {
      lab2DateCols.push({
        iso: excelDateToISO(lab2DatesRow[c]),
        siteCol: c,
        advCol: c + 1,
        statusCol: c + 2,
      });
    }
  }

  // Master deduplicated dictionary of Tamil labours
  const tamilLabourMap = new Map();

  // First pass: Register all labours from Labour_Attendance_2 (has full roster 20001 - 20071)
  for (let i = 10; i < lab2Data.length; i++) {
    const r = lab2Data[i];
    if (!r || !r[0] || isNaN(Number(r[0]))) continue;
    const empCode = String(r[0]).trim();
    const name = String(r[1] || `Labour ${empCode}`).trim();
    const designation = String(r[2] || 'Helper').trim();
    const dailyWage = Number(r[3]) || 800;

    tamilLabourMap.set(empCode, {
      empCode,
      name,
      designation,
      dailyWage,
      rows: { cycle2: r },
    });
  }

  // Second pass: Merge details from Labour_Attendance_1 (Cycle 1)
  for (let i = 10; i < lab1Data.length; i++) {
    const r = lab1Data[i];
    if (!r || !r[0] || isNaN(Number(r[0]))) continue;
    const empCode = String(r[0]).trim();
    const name = String(r[1] || `Labour ${empCode}`).trim();
    const designation = String(r[2] || 'Helper').trim();
    const dailyWage = Number(r[3]) || 850;

    if (tamilLabourMap.has(empCode)) {
      const existing = tamilLabourMap.get(empCode);
      if (name) existing.name = name;
      if (designation) existing.designation = designation;
      if (dailyWage) existing.dailyWage = dailyWage;
      existing.rows.cycle1 = r;
    } else {
      tamilLabourMap.set(empCode, {
        empCode,
        name,
        designation,
        dailyWage,
        rows: { cycle1: r },
      });
    }
  }

  for (const [code, info] of tamilLabourMap.entries()) {
    const employeeCode = `LAB-${info.empCode}`;
    const employee = await prisma.employeeOrLabour.upsert({
      where: { employeeCode },
      update: {
        name: info.name,
        empCode: info.empCode,
        designation: info.designation,
        role: info.designation,
        dailyWage: info.dailyWage,
        baseWage: info.dailyWage * 15,
        category: 'TAMIL_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
        active: true,
      },
      create: {
        employeeCode,
        empCode: info.empCode,
        name: info.name,
        designation: info.designation,
        role: info.designation,
        dailyWage: info.dailyWage,
        baseWage: info.dailyWage * 15,
        category: 'TAMIL_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
        active: true,
      },
    });
    tamilLabourCount++;

    // Seed Cycle 1 Attendance (Nov 1 - Nov 15)
    if (info.rows.cycle1) {
      const r = info.rows.cycle1;
      for (const d of lab1DateCols) {
        if (!d.iso) continue;
        const site = r[d.siteCol] ? String(r[d.siteCol]).trim() : null;
        const advance = Number(r[d.advCol]) || 0;
        const statusRaw = r[d.statusCol];
        let status = statusRaw ? String(statusRaw).trim().toUpperCase() : site ? 'P' : null;
        if (!status) continue;
        if (!['P', 'H', 'A'].includes(status)) status = 'P';

        const targetDate = new Date(`${d.iso}T00:00:00.000Z`);
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: targetDate,
            },
          },
          update: {
            status,
            siteName: site || 'SSM School',
            dailyAdvance: advance,
            category: 'TAMIL_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
          create: {
            employeeId: employee.id,
            date: targetDate,
            status,
            siteName: site || 'SSM School',
            dailyAdvance: advance,
            category: 'TAMIL_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
        });
        attendanceCount++;
      }
    }

    // Seed Cycle 2 Attendance (Nov 16 - Nov 30)
    if (info.rows.cycle2) {
      const r = info.rows.cycle2;
      for (const d of lab2DateCols) {
        if (!d.iso || d.iso > '2026-11-30') continue;
        const site = r[d.siteCol] ? String(r[d.siteCol]).trim() : null;
        const advance = Number(r[d.advCol]) || 0;
        const statusRaw = r[d.statusCol];
        let status = statusRaw ? String(statusRaw).trim().toUpperCase() : site ? 'P' : null;
        if (!status) continue;
        if (!['P', 'H', 'A'].includes(status)) status = 'P';

        const targetDate = new Date(`${d.iso}T00:00:00.000Z`);
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: targetDate,
            },
          },
          update: {
            status,
            siteName: site || 'SSM School',
            dailyAdvance: advance,
            category: 'TAMIL_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
          create: {
            employeeId: employee.id,
            date: targetDate,
            status,
            siteName: site || 'SSM School',
            dailyAdvance: advance,
            category: 'TAMIL_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(`[✓] Seeded ${tamilLabourCount} Tamil Site Labours.`);

  // -------------------------------------------------------------
  // 4. HINDI SITE LABOURS
  // -------------------------------------------------------------
  console.log('\n[4/5] Importing Hindi Crew & November Site Attendance...');
  const h1Sheet = wb.Sheets['Hindi_Labours_1'];
  const h1Data = xlsx.utils.sheet_to_json(h1Sheet, { header: 1 });
  const h1DatesRow = h1Data[8];

  const h1DateCols = [];
  for (let c = 10; c < h1DatesRow.length; c += 3) {
    if (h1DatesRow[c] !== undefined && h1DatesRow[c] !== null) {
      h1DateCols.push({
        iso: excelDateToISO(h1DatesRow[c]),
        siteCol: c,
        advCol: c + 1,
        statusCol: c + 2,
      });
    }
  }

  // Pre-seed Mithun 20047 from Tamil list as Hindi labour
  const hindiLabours = [
    { code: 'HIN-20001', rawCode: '20001', name: 'Rakeshkumar1', designation: 'Hindi Helper', dailyWage: 700 },
    { code: 'HIN-20002', rawCode: '20002', name: 'Nithishkumar', designation: 'Hindi Helper', dailyWage: 700 },
    { code: 'HIN-20003', rawCode: '20003', name: 'Rakesh Kumar2', designation: 'Hindi Helper', dailyWage: 700 },
    { code: 'HIN-20005', rawCode: '20005', name: 'Ajith', designation: 'Hindi Helper', dailyWage: 700 },
    { code: 'HIN-20047', rawCode: '20047', name: 'Mithun', designation: 'Hindi Helper', dailyWage: 700 },
  ];

  for (const h of hindiLabours) {
    const employee = await prisma.employeeOrLabour.upsert({
      where: { employeeCode: h.code },
      update: {
        name: h.name,
        empCode: h.rawCode,
        designation: h.designation,
        role: h.designation,
        dailyWage: h.dailyWage,
        baseWage: h.dailyWage * 15,
        category: 'HINDI_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
        active: true,
      },
      create: {
        employeeCode: h.code,
        empCode: h.rawCode,
        name: h.name,
        designation: h.designation,
        role: h.designation,
        dailyWage: h.dailyWage,
        baseWage: h.dailyWage * 15,
        category: 'HINDI_LABOUR',
        companyUnit: 'STANDARD_ROOFS',
        status: 'ACTIVE',
        active: true,
      },
    });
    hindiLabourCount++;

    // Find row in Hindi_Labours_1
    const matchingRow = h1Data.find(r => r && r[0] && String(r[0]).trim() === h.rawCode);
    if (matchingRow) {
      for (const d of h1DateCols) {
        if (!d.iso) continue;
        const site = matchingRow[d.siteCol] ? String(matchingRow[d.siteCol]).trim() : null;
        const advance = Number(matchingRow[d.advCol]) || 0;
        const statusRaw = matchingRow[d.statusCol];
        let status = statusRaw ? String(statusRaw).trim().toUpperCase() : site ? 'P' : null;
        if (!status) continue;
        if (!['P', 'H', 'A'].includes(status)) status = 'P';

        const targetDate = new Date(`${d.iso}T00:00:00.000Z`);
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: targetDate,
            },
          },
          update: {
            status,
            siteName: site || 'Unloading Yard',
            dailyAdvance: advance,
            category: 'HINDI_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
          create: {
            employeeId: employee.id,
            date: targetDate,
            status,
            siteName: site || 'Unloading Yard',
            dailyAdvance: advance,
            category: 'HINDI_LABOUR',
            companyUnit: 'STANDARD_ROOFS',
          },
        });
        attendanceCount++;
      }
    }
  }
  console.log(`[✓] Seeded ${hindiLabourCount} Hindi Crew members.`);

  // -------------------------------------------------------------
  // 5. CONTRACTOR TEAMS & DAILY SITE LOGS
  // -------------------------------------------------------------
  console.log('\n[5/5] Importing 6 Contractor Teams & November Site Work Logs...');
  const contractorTeams = [
    { key: 'Nandeeshwaran_Team', name: 'Nandeeshwaran Team', code: 'CON-NAND', specialty: 'Fabrication & Purlin Welding' },
    { key: ' Contractor_Sakthi', name: 'Contractor Sakthi', code: 'CON-SAKH', specialty: 'Industrial Roofing & Sheeting' },
    { key: 'Prashop_Team', name: 'Prashop Team', code: 'CON-PRAS', specialty: 'Steel PEB Erection' },
    { key: 'Monier_Suresh', name: 'Monier Suresh Team', code: 'CON-MONI', specialty: 'Hospital & Industrial Sheeting' },
    { key: 'Suthish_Team', name: 'Suthish Team', code: 'CON-SUTH', specialty: 'Roofing Installation' },
    { key: 'Hydarali_Team', name: 'Hydarali Team', code: 'CON-HYDA', specialty: 'Heavy Gutter & Flashing' },
  ];

  for (const team of contractorTeams) {
    const contractor = await prisma.contractor.upsert({
      where: { code: team.code },
      update: {
        name: team.name,
        specialty: team.specialty,
        category: 'CONTRACTOR_TEAM',
        status: 'ACTIVE',
        active: true,
      },
      create: {
        code: team.code,
        name: team.name,
        specialty: team.specialty,
        category: 'CONTRACTOR_TEAM',
        status: 'ACTIVE',
        active: true,
      },
    });

    const sheet = wb.Sheets[team.key];
    if (sheet) {
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      let dayCounter = 1;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[0] || r[0] === 'Date' || r[0] === 'DATE' || String(r[0]).includes('TEAM') || String(r[0]).includes('Team')) continue;

        let dateStr = null;
        if (typeof r[0] === 'number') {
          // In Excel, 46033.. were typed as 01-11-2026, 02-11-2026...
          const day = Math.min(30, dayCounter);
          dateStr = `2026-11-${String(day).padStart(2, '0')}`;
          dayCounter++;
        } else if (typeof r[0] === 'string' && r[0].includes('-')) {
          const parts = r[0].trim().split('-');
          const day = parts[0].padStart(2, '0');
          dateStr = `2026-11-${day}`;
          dayCounter = Number(day) + 1;
        } else {
          const day = Math.min(30, dayCounter);
          dateStr = `2026-11-${String(day).padStart(2, '0')}`;
          dayCounter++;
        }

        const site = r[1] && r[1] !== 'A' ? String(r[1]).trim() : 'Site Standby';
        let headcount = Number(r[2]);
        let breakdown = null;
        if (isNaN(headcount)) {
          breakdown = r[2] ? String(r[2]).trim() : null;
          headcount = breakdown ? 3 : 0;
        }
        if (r[1] === 'A' || r[2] === 'A') {
          headcount = 0;
        }

        const statusOfSite = r[3] ? String(r[3]).trim() : headcount > 0 ? 'Active Work' : 'No Work / Absent';
        const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

        await prisma.contractorDailyLog.create({
          data: {
            contractorTeamName: team.name,
            contractorId: contractor.id,
            date: targetDate,
            siteName: site,
            headcount,
            workerBreakdown: breakdown,
            siteWorkStatus: statusOfSite,
          },
        });
        contractorLogCount++;
      }
    }
  }
  console.log(`[✓] Seeded 6 Contractor Teams and ${contractorLogCount} Daily Site Work Logs.`);

  console.log('\n====================================================');
  console.log('   DATA IMPORT COMPLETED 100% SUCCESSFULLY!        ');
  console.log(`   - Office Staff:      ${officeCount + inviCount}`);
  console.log(`   - Tamil Labours:     ${tamilLabourCount}`);
  console.log(`   - Hindi Crew:        ${hindiLabourCount}`);
  console.log(`   - Total Attendance:  ${attendanceCount} records`);
  console.log(`   - Contractor Logs:   ${contractorLogCount} logs`);
  console.log('====================================================');
}

runImport()
  .catch((e) => {
    console.error('Fatal Import Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
