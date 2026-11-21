import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OFFICIAL_12_HOLIDAYS = [
  { date: "2026-10-19", name: "Saraswathi Pooja", holidayType: "HALF_PAID", year: 2026, description: "Half-Day Paid Leave (0.5 day payable)" },
  { date: "2026-10-20", name: "Saraswathi Pooja", holidayType: "UP", year: 2026, description: "Non-Paid Leave (0.0 day payable)" },
  { date: "2026-11-09", name: "Deepavali", holidayType: "PL", year: 2026, description: "Deepavali Day 1 (1.0 day payable)" },
  { date: "2026-11-10", name: "Deepavali", holidayType: "PL", year: 2026, description: "Deepavali Day 2 (1.0 day payable)" },
  { date: "2027-01-01", name: "New Year", holidayType: "PL", year: 2027, description: "New Year's Day (1.0 day payable)" },
  { date: "2027-01-02", name: "New Year Holiday", holidayType: "UP", year: 2027, description: "New Year Additional Holiday (0.0 day payable)" },
  { date: "2027-01-15", name: "Thai Pongal / Makar Sankranti", holidayType: "PL", year: 2027, description: "Thai Pongal (1.0 day payable)" },
  { date: "2027-01-16", name: "Mattu Pongal", holidayType: "UP", year: 2027, description: "Mattu Pongal (0.0 day payable)" },
  { date: "2027-10-09", name: "Saraswathi Pooja / Ayudha Pooja", holidayType: "HALF_PAID", year: 2027, description: "Half-Day Paid Leave (0.5 day payable)" },
  { date: "2027-10-29", name: "Deepavali", holidayType: "PL", year: 2027, description: "Deepavali Day 1 (1.0 day payable)" },
  { date: "2027-10-30", name: "Deepavali", holidayType: "PL", year: 2027, description: "Deepavali Day 2 (1.0 day payable)" },
  { date: "2028-01-01", name: "New Year", holidayType: "PL", year: 2028, description: "New Year's Day (1.0 day payable)" },
];

async function seedOfficialHolidays() {
  console.log("Starting seeding of official 12 company holidays...");

  // 1. Clear out any previous ad-hoc holidays
  await prisma.companyHoliday.deleteMany({});
  console.log("Cleared existing company holidays.");

  // 2. Insert the 12 official holidays
  for (const h of OFFICIAL_12_HOLIDAYS) {
    const targetDate = new Date(`${h.date}T00:00:00.000Z`);
    await prisma.companyHoliday.create({
      data: {
        date: targetDate,
        name: h.name,
        year: h.year,
        holidayType: h.holidayType,
        description: h.description,
        isPublic: true,
      },
    });
    console.log(`[+] Seeded Holiday: ${h.date} - ${h.name} (${h.holidayType})`);
  }

  // 3. Apply to Office Staff attendance calendars (preserving existing records)
  const officeEmployees = await prisma.employeeOrLabour.findMany({
    where: { category: "OFFICE_STAFF", status: "ACTIVE" },
  });

  console.log(`Applying holidays to ${officeEmployees.length} active Office Staff...`);

  for (const h of OFFICIAL_12_HOLIDAYS) {
    const targetDate = new Date(`${h.date}T00:00:00.000Z`);
    const status = h.holidayType === "UP" ? "UP" : "PL";
    const permissionHours = h.holidayType === "HALF_PAID" ? 0.5 : 1.0;

    for (const emp of officeEmployees) {
      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_date: {
            employeeId: emp.id,
            date: targetDate,
          },
        },
        update: {
          status,
          permissionHours,
          workNotes: `Company Holiday: ${h.name} (${h.holidayType})`,
          category: emp.category,
          companyUnit: emp.companyUnit,
        },
        create: {
          employeeId: emp.id,
          date: targetDate,
          status,
          permissionHours,
          workNotes: `Company Holiday: ${h.name} (${h.holidayType})`,
          category: emp.category,
          companyUnit: emp.companyUnit,
        },
      });
    }
  }

  console.log("Successfully seeded 12 company holidays and synced Office Staff calendars!");
}

seedOfficialHolidays()
  .catch((e) => {
    console.error("Error seeding official holidays:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
