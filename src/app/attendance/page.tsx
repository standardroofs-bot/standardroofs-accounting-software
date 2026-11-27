"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Clock,
  Users2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building,
  Briefcase,
  ShieldCheck,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles,
  HardHat,
  Truck,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Check,
  X,
  FileText,
  DollarSign,
  UserCheck,
  Building2,
  ExternalLink,
  Award,
  Palmtree,
  CalendarOff,
  History,
  Timer,
  Info,
  Settings,
  Send,
  CheckCircle2 as CheckCircleIcon,
  XCircle,
  Edit3,
  Trash2,
  KeyRound,
} from "lucide-react";
import ModuleHeaderWithAnalytics from "@/components/common/ModuleHeaderWithAnalytics";
import ExcelImportModal from "@/components/common/ExcelImportModal";
import EmployeeMultiYearDossierModal from "@/components/attendance/EmployeeMultiYearDossierModal";
import AttendanceSettingsModal from "@/components/attendance/AttendanceSettingsModal";
import UniversalAttendanceExportModal from "@/components/attendance/UniversalAttendanceExportModal";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { formatINR } from "@/lib/decimal";
import { ViewportPortal } from "@/components/ui/ViewportPortal";

interface AttendanceRecordItem {
  id: string;
  employeeId: string;
  date: string;
  status: "P" | "1H" | "H" | "PL" | "UP" | "A" | "L";
  inTime?: string | null;
  outTime?: string | null;
  siteName?: string | null;
  dailyAdvance?: number;
  permissionNote?: string | null;
  permissionHours?: number | null;
  permissionSlot?: "MORNING" | "EVENING" | null;
  permissionTime?: string | null;
  otHours?: number;
  otTimeRange?: string | null;
  otReason?: string | null;
  workNotes?: string | null;
  remarks?: string | null;
}

interface EmployeeItem {
  id: string;
  employeeCode: string;
  empCode?: string | null;
  name: string;
  fatherName?: string | null;
  phone?: string | null;
  designation?: string | null;
  role?: string | null;
  category: "OFFICE_STAFF" | "TAMIL_LABOUR" | "HINDI_LABOUR" | "CONTRACTOR_TEAM";
  companyUnit: "STANDARD_ROOFS" | "INVI_CREATION";
  dailyWage?: number | null;
  monthlySalary?: number | null;
  dateOfJoining?: string | null;
  attendances: AttendanceRecordItem[];
}

interface ContractorLogItem {
  id: string;
  contractorTeamName: string;
  contractorId?: string | null;
  date: string;
  siteName?: string | null;
  headcount: number;
  workerBreakdown?: string | null;
  siteWorkStatus?: string | null;
  remarks?: string | null;
}

interface HolidayItem {
  id: string;
  date: string;
  name: string;
  year: number;
  holidayType?: string;
  description?: string | null;
}

const COMMON_SITES = [
  "SSM School",
  "Kalloviyam Gokul",
  "Ananthi Thindal",
  "Saravanan Chennai",
  "Saravanan Perambalur",
  "Ravichandran Chennai",
  "Vishnu Nalliyampalayam",
  "Venkatesh Salem",
  "Arunprasad Uthukuli",
  "Gobichettipalayam",
  "Lotus Hospital board Work",
  "Vel Murugan_Site",
  "Pradeep Perambalur",
  "Amarnath site",
  "Office",
  "Yard Unloading",
  "Office Maintenance",
  "SIPCOT Heavy PEB Shed",
];

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030];
const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"office" | "tamil" | "hindi" | "contractor">("office");
  const [viewMode, setViewMode] = useState<"monthly" | "daily">("monthly");
  const [showTodayRollCall, setShowTodayRollCall] = useState<boolean>(false);

  // Multi-Year & Multi-Month persistent navigation (live today auto-init + midnight refresh)
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return Number(today.slice(0, 4)) || 2026;
  });
  const [selectedMonthNum, setSelectedMonthNum] = useState<string>(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return today.slice(5, 7) || "11";
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-CA");
  });

  useEffect(() => {
    let lastToday = new Date().toLocaleDateString("en-CA");
    const timer = setInterval(() => {
      const nowToday = new Date().toLocaleDateString("en-CA");
      if (nowToday !== lastToday) {
        setSelectedDate((prev) => (prev === lastToday ? nowToday : prev));
        lastToday = nowToday;
      }
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const selectedMonth = `${selectedYear}-${selectedMonthNum}`;

  // Data state
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [contractorLogs, setContractorLogs] = useState<ContractorLogItem[]>([]);
  const [contractorsFromDb, setContractorsFromDb] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [kpis, setKpis] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Canonical 6 Contractor Teams + DB Contractors
  const defaultContractorTeams = [
    { id: "Nandeeshwaran Team", name: "Nandeeshwaran Team", code: "CONT-001", role: "Fabrication & Erection" },
    { id: "Contractor Sakthi", name: "Contractor Sakthi", code: "CONT-002", role: "Sheeting & Purlin Crew" },
    { id: "Prashop Team", name: "Prashop Team", code: "CONT-003", role: "Welding & Site Installation" },
    { id: "Monier Suresh Team", name: "Monier Suresh Team", code: "CONT-004", role: "Heavy PEB Specialists" },
    { id: "Suthish Team", name: "Suthish Team", code: "CONT-005", role: "Truss & Fabrication Work" },
    { id: "Hydarali Team", name: "Hydarali Team", code: "CONT-006", role: "High-Roof Site Installation" },
  ];

  const contractorTeamList = useMemo(() => {
    const list = [...defaultContractorTeams];
    const names = new Set(defaultContractorTeams.map((c) => c.name.toLowerCase()));
    contractorsFromDb.forEach((c) => {
      if (!names.has((c.name || "").toLowerCase())) {
        list.push({
          id: c.name,
          name: c.name,
          code: c.code || "CONT",
          role: c.specialty || "Contractor Team",
        });
        names.add(c.name.toLowerCase());
      }
    });
    return list;
  }, [contractorsFromDb]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [companyUnitFilter, setCompanyUnitFilter] = useState<"ALL" | "STANDARD_ROOFS" | "INVI_CREATION">("ALL");

  // Modals & Popovers
  const [showImportModal, setShowImportModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"personnel" | "holidays" | "rules">("personnel");
  const [selectedContractorCell, setSelectedContractorCell] = useState<{
    teamName: string;
    date: string;
    dayNum: number;
    headcount: number;
    siteName: string;
    siteWorkStatus: string;
    workerBreakdown?: string | null;
    remarks?: string | null;
    status: "P" | "H" | "A";
    otHours?: number;
    otTimeRange?: string | null;
    otReason?: string | null;
  } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: "", name: "", holidayType: "PL", markStaff: true });
  
  // Lifetime Multi-Year Dossier Modal
  const [selectedDossierEmployee, setSelectedDossierEmployee] = useState<EmployeeItem | null>(null);
  const [isContractorDossier, setIsContractorDossier] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<any>(null);
  const [dossierActiveYear, setDossierActiveYear] = useState<string>("2026");

  // Cell Edit Popover Modal (for Monthly Matrix)
  const [cellEditStatus, setCellEditStatus] = useState<"P" | "1H" | "H" | "PL" | "UP" | "A" | "L">("P");
  const [cellEditTarget, setCellEditTarget] = useState<{
    employee: EmployeeItem;
    date: string;
    dayNum: number;
    currentStatus: "P" | "1H" | "H" | "PL" | "UP" | "A" | "L" | null;
    currentSite?: string | null;
    currentNote?: string | null;
  } | null>(null);
  const [permissionInput, setPermissionInput] = useState("");
  const [siteInput, setSiteInput] = useState("");
  const [otHoursInput, setOtHoursInput] = useState<number>(0);
  const [otTimeRangeInput, setOtTimeRangeInput] = useState<string>("");
  const [otReasonInput, setOtReasonInput] = useState<string>("");
  const [inTimeInput, setInTimeInput] = useState<string>("09:00");
  const [outTimeInput, setOutTimeInput] = useState<string>("19:30");
  const [permMinutesInput, setPermMinutesInput] = useState<number>(0);
  const [permStatusInput, setPermStatusInput] = useState<string>("");
  const [otStatusInput, setOtStatusInput] = useState<string>("");
  const [cellModalTab, setCellModalTab] = useState<"ot" | "permission">("ot");
  const [otValidationError, setOtValidationError] = useState<string>("");
  const [permSlotInput, setPermSlotInput] = useState<"MORNING" | "EVENING">("MORNING");
  const [permTimeInput, setPermTimeInput] = useState<string>("");

  // Leave Requests state for HR drawer
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [showLeaveDrawer, setShowLeaveDrawer] = useState<boolean>(false);
  const [leaveDrawerTab, setLeaveDrawerTab] = useState<"approvals" | "apply" | "ess">("approvals");
  const [applyLeaveEmpId, setApplyLeaveEmpId] = useState<string>("");
  const [applyLeaveCategory, setApplyLeaveCategory] = useState<"PLANNED" | "UNPLANNED" | "SICK">("PLANNED");
  const [applyLeaveDayType, setApplyLeaveDayType] = useState<"FULL_DAY" | "HALF_DAY">("FULL_DAY");
  const [applyLeaveStartDate, setApplyLeaveStartDate] = useState<string>(selectedDate);
  const [applyLeaveEndDate, setApplyLeaveEndDate] = useState<string>(selectedDate);
  const [applyLeaveReason, setApplyLeaveReason] = useState<string>("");
  const [applyLeaveSubmitting, setApplyLeaveSubmitting] = useState<boolean>(false);
  const [showUniversalExportModal, setShowUniversalExportModal] = useState<boolean>(false);

  // Leave Edit modal state
  const [editingLeave, setEditingLeave] = useState<any | null>(null);
  const [editLeaveCategory, setEditLeaveCategory] = useState<"PLANNED" | "UNPLANNED" | "SICK" | "EMERGENCY">("PLANNED");
  const [editLeaveDayType, setEditLeaveDayType] = useState<"FULL_DAY" | "HALF_DAY">("FULL_DAY");
  const [editLeaveStartDate, setEditLeaveStartDate] = useState<string>("");
  const [editLeaveEndDate, setEditLeaveEndDate] = useState<string>("");
  const [editLeaveReason, setEditLeaveReason] = useState<string>("");
  const [editLeaveSubmitting, setEditLeaveSubmitting] = useState<boolean>(false);

  // Quick 1H permission prompt in Daily View
  const [permPromptTarget, setPermPromptTarget] = useState<{
    employeeId: string;
    siteName?: string;
  } | null>(null);

  // Optimistic draft attendance updates
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, Partial<AttendanceRecordItem>>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeCompany, setActiveCompany] = useState<{ id: string; code: string; name: string } | null>(null);

  // Contractor Form state
  const [contractorForm, setContractorForm] = useState({
    id: "",
    contractorTeamName: "Nandeeshwaran Team",
    date: selectedDate,
    siteName: "Ravichandran Chennai",
    headcount: 4,
    workerBreakdown: "",
    siteWorkStatus: "Fabrication Work",
    remarks: "",
  });

  // Save Contractor Daily Log (Single Cell or Daily Roll-Call)
  const handleSaveContractorDaily = async (
    teamName: string,
    date: string,
    headcount: number,
    siteName: string,
    siteWorkStatus: string,
    workerBreakdown?: string,
    remarks?: string,
    otHours?: number,
    otTimeRange?: string,
    otReason?: string
  ) => {
    try {
      const res = await fetch("/api/attendance/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorTeamName: teamName,
          date,
          headcount: Number(headcount),
          siteName: siteName || "Site Standby",
          siteWorkStatus: siteWorkStatus || (Number(headcount) > 0 ? "Active Work" : "No Work / Absent"),
          workerBreakdown: workerBreakdown || null,
          remarks: remarks || null,
          otHours: otHours ? Number(otHours) : undefined,
          otTimeRange: otTimeRange || undefined,
          otReason: otReason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.log) {
        showToast(`Logged ${teamName} (${headcount} labours) on ${date}`);
        setContractorLogs((prev) => {
          const filtered = prev.filter(
            (c) => !(c.contractorTeamName === teamName && c.date.split("T")[0] === date)
          );
          return [data.log, ...filtered];
        });
        setSelectedContractorCell(null);
      } else {
        alert(data.error || "Failed to save contractor log.");
      }
    } catch (err) {
      console.error("Failed to save contractor log:", err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch Attendance & Roster with Warm Session Cache & Exponential Retry
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setFetchError(null);

      // Check warm session cache for instantaneous rendering
      const cacheKey = `sr_att_cache_${selectedMonth}_${selectedDate}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached && employees.length === 0) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.employees) && parsed.employees.length > 0) {
            setEmployees(parsed.employees);
            if (parsed.activeCompany) setActiveCompany(parsed.activeCompany);
            if (parsed.contractorLogs) setContractorLogs(parsed.contractorLogs);
            if (parsed.contractors) setContractorsFromDb(parsed.contractors);
            if (parsed.holidays) setHolidays(parsed.holidays);
            if (parsed.leaveRequests) setLeaveRequests(parsed.leaveRequests);
            if (parsed.kpis) setKpis(parsed.kpis);
          }
        }
      } catch (ce) {}

      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success) {
        try {
          const res = await fetch(`/api/attendance?date=${selectedDate}&month=${selectedMonth}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              if (data.activeCompany) {
                setActiveCompany(data.activeCompany);
                if (data.activeCompany.id === "invi-creation") {
                  setActiveTab("office");
                }
              }
              setEmployees(data.employees || []);
              setContractorLogs(data.contractorLogs || []);
              setContractorsFromDb(data.contractors || []);
              setHolidays(data.holidays || []);
              setLeaveRequests(data.leaveRequests || []);
              setKpis(data.kpis || {});
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
              } catch (se) {}
              success = true;
              break;
            }
          }
        } catch (netErr) {
          // retry on next tick
        }
        attempts++;
        if (!success && attempts < 3) {
          await new Promise((r) => setTimeout(r, 350 * attempts));
        }
      }

      if (!success && employees.length === 0) {
        setFetchError("Unable to connect to Attendance Server. Please click Retry below.");
      }
    } catch (err: any) {
      console.error("Error fetching attendance:", err);
      setFetchError(err.message || "Attendance network timeout.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (requestId: string) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve-leave", requestId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Leave approved and automatically marked as 'A' (Absent) on Attendance Grid!");
        fetchAttendance();
      } else {
        alert(data.error || "Failed to approve leave.");
      }
    } catch (err) {
      console.error(err);
      alert("Error approving leave.");
    }
  };

  const handleRejectLeave = async (requestId: string) => {
    const reason = prompt("Enter reason for rejection (optional):", "Leave rejected by HR");
    if (reason === null) return;
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject-leave", requestId, rejectionNote: reason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Leave request rejected.");
        fetchAttendance();
      } else {
        alert(data.error || "Failed to reject leave.");
      }
    } catch (err) {
      console.error(err);
      alert("Error rejecting leave.");
    }
  };

  const handleCreateLeave = async (autoApprove: boolean = false) => {
    if (!applyLeaveEmpId) {
      alert("Please select an employee.");
      return;
    }
    if (!applyLeaveStartDate || !applyLeaveEndDate) {
      alert("Please select start and end dates.");
      return;
    }

    setApplyLeaveSubmitting(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: applyLeaveEmpId,
          leaveCategory: applyLeaveCategory,
          dayType: applyLeaveDayType,
          startDate: applyLeaveStartDate,
          endDate: applyLeaveEndDate,
          reason: applyLeaveReason.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to submit leave request.");
        setApplyLeaveSubmitting(false);
        return;
      }

      showToast("Leave request submitted! Awaiting HR approval.");
      fetchAttendance();

      // Reset form
      setApplyLeaveReason("");
      setLeaveDrawerTab("approvals");
    } catch (err: any) {
      console.error("Error creating leave:", err);
      alert("Error submitting leave request.");
    } finally {
      setApplyLeaveSubmitting(false);
    }
  };

  const handleOpenEditLeave = (req: any) => {
    setEditingLeave(req);
    setEditLeaveCategory(req.leaveCategory || "PLANNED");
    setEditLeaveDayType(req.dayType || "FULL_DAY");
    setEditLeaveStartDate(req.startDate ? req.startDate.split("T")[0] : selectedDate);
    setEditLeaveEndDate(req.endDate ? req.endDate.split("T")[0] : selectedDate);
    setEditLeaveReason(req.reason || "");
  };

  const handleSaveEditLeave = async () => {
    if (!editingLeave) return;
    setEditLeaveSubmitting(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingLeave.id,
          leaveCategory: editLeaveCategory,
          dayType: editLeaveDayType,
          startDate: editLeaveStartDate,
          endDate: editLeaveEndDate,
          reason: editLeaveReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Leave request updated and attendance re-synced!");
        setEditingLeave(null);
        fetchAttendance();
      } else {
        alert(data.error || "Failed to update leave request.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating leave request.");
    } finally {
      setEditLeaveSubmitting(false);
    }
  };

  const handleDeleteLeave = async (id: string, empName: string) => {
    if (
      !confirm(
        `Move leave request for ${empName} to the Recycle Bin?\n\nIf this leave was approved, the attendance grid records will be automatically reverted.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/leave-requests?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Moved leave for ${empName} to Recycle Bin. Attendance reverted.`);
        fetchAttendance();
      } else {
        alert(data.error || "Failed to delete leave request.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting leave request.");
    }
  };

  const handleChangeStaffPassword = async (email: string, name: string) => {
    const newPass = prompt(`Set new password for ${name} (${email}):\n(Minimum 6 characters)`);
    if (!newPass) return;
    if (newPass.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    try {
      const res = await fetch("/api/users/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Updated password for ${name}!`);
      } else {
        alert(data.error || "Failed to update password.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating password.");
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedDate]);

  // Sync selectedDate when month or year changes
  const handleYearMonthChange = (newYear: number, newMonthNum: string) => {
    setSelectedYear(newYear);
    setSelectedMonthNum(newMonthNum);
    const dayPart = selectedDate.split("-")[2] || "01";
    const maxDays = new Date(newYear, parseInt(newMonthNum, 10), 0).getDate();
    const safeDay = Math.min(parseInt(dayPart, 10), maxDays).toString().padStart(2, "0");
    setSelectedDate(`${newYear}-${newMonthNum}-${safeDay}`);
  };

  const todayISO = useMemo(() => {
    const now = new Date();
    const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    return new Date(istMs).toISOString().slice(0, 10);
  }, []);

  // Pre-calculated Month Grid Days
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(selectedYear, parseInt(selectedMonthNum, 10), 0).getDate();
    const days = [];
    const paidHolidayDates = new Set(
      holidays
        .filter((h) => (h.holidayType || "PL").toUpperCase() !== "UP")
        .map((h) => h.date.split("T")[0])
    );
    const unpaidShutdownDates = new Set(
      holidays
        .filter((h) => (h.holidayType || "").toUpperCase() === "UP")
        .map((h) => h.date.split("T")[0])
    );

    // Also detect any non-Sunday date where >= 50% of active office staff are marked UP
    const officeStaffList = employees.filter((e) => e.category === "OFFICE_STAFF");
    if (officeStaffList.length > 0) {
      const upCounts = new Map<string, number>();
      officeStaffList.forEach((emp) => {
        const list = Array.isArray(emp.attendances) ? emp.attendances : [];
        list.forEach((a) => {
          if ((a?.status || "").toUpperCase() === "UP" && a?.date) {
            const iso = typeof a.date === "string" ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0];
            upCounts.set(iso, (upCounts.get(iso) || 0) + 1);
          }
        });
      });
      const threshold = Math.max(2, Math.ceil(officeStaffList.length * 0.5));
      upCounts.forEach((cnt, iso) => {
        if (cnt >= threshold) unpaidShutdownDates.add(iso);
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const dayStr = String(day).padStart(2, "0");
      const fullDate = `${selectedYear}-${selectedMonthNum}-${dayStr}`;
      const dateObj = new Date(Date.UTC(selectedYear, parseInt(selectedMonthNum, 10) - 1, day));
      const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
      const isSunday = dayOfWeek === 0;
      const isPaidHoliday = paidHolidayDates.has(fullDate);
      const isUnpaidShutdown = unpaidShutdownDates.has(fullDate);
      const isHoliday = isPaidHoliday || isUnpaidShutdown;

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.push({
        dayNum: day,
        fullDate,
        dayName: dayNames[dayOfWeek],
        isSunday,
        isHoliday,
        isPaidHoliday,
        isUnpaidShutdown,
        isWorkingDay: !isSunday && !isUnpaidShutdown,
      });
    }
    return days;
  }, [selectedYear, selectedMonthNum, holidays, employees]);

  const totalSundaysInMonth = useMemo(() => {
    return daysInMonth.filter((d) => d.isSunday).length;
  }, [daysInMonth]);

  const totalHolidaysInMonth = useMemo(() => {
    return daysInMonth.filter((d) => d.isPaidHoliday && !d.isSunday).length;
  }, [daysInMonth]);

  const totalUnpaidShutdownInMonth = useMemo(() => {
    return daysInMonth.filter((d) => d.isUnpaidShutdown && !d.isSunday).length;
  }, [daysInMonth]);

  // Exact Office Working Days Denominator: never subtract Paid Holidays (PL)
  const totalWorkingDaysInMonth = useMemo(() => {
    return Math.max(0, daysInMonth.length - totalSundaysInMonth - totalUnpaidShutdownInMonth);
  }, [daysInMonth, totalSundaysInMonth, totalUnpaidShutdownInMonth]);

  const handlePrevMonth = () => {
    let m = parseInt(selectedMonthNum, 10) - 1;
    let y = selectedYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    handleYearMonthChange(y, String(m).padStart(2, "0"));
  };

  const handleNextMonth = () => {
    let m = parseInt(selectedMonthNum, 10) + 1;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    handleYearMonthChange(y, String(m).padStart(2, "0"));
  };

  // Filtered employees for current tab
  const tabEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (activeTab === "office" && emp.category !== "OFFICE_STAFF") return false;
      if (activeTab === "tamil" && emp.category !== "TAMIL_LABOUR") return false;
      if (activeTab === "hindi" && emp.category !== "HINDI_LABOUR") return false;

      if (activeTab === "office" && companyUnitFilter !== "ALL" && emp.companyUnit !== companyUnitFilter) {
        return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.name.toLowerCase().includes(q);
        const matchesCode = emp.employeeCode.toLowerCase().includes(q);
        const matchesEmpCode = emp.empCode?.toLowerCase().includes(q);
        const matchesRole = (emp.designation || emp.role || "").toLowerCase().includes(q);
        return matchesName || matchesCode || matchesEmpCode || matchesRole;
      }
      return true;
    });
  }, [employees, activeTab, companyUnitFilter, searchQuery]);

  // Mark status helper with Optimistic UI
  const handleMarkStatus = async (
    employeeId: string,
    status: "P" | "1H" | "H" | "PL" | "UP" | "A" | "L",
    siteName?: string,
    dateOverride?: string,
    permissionNote?: string,
    permissionSlot?: "MORNING" | "EVENING",
    permissionTime?: string,
    otHours?: number,
    otTimeRange?: string,
    otReason?: string,
    extraTiming?: {
      inTime?: string;
      outTime?: string;
      permissionMinutes?: number;
      permissionStatus?: string;
      otApprovalStatus?: string;
    }
  ) => {
    const markDate = dateOverride || selectedDate;
    const draftKey = `${employeeId}_${markDate}`;
    const finalNote = permissionNote !== undefined ? permissionNote : (status === "1H" ? "1-Hour Permission" : undefined);

    // Optimistic local state update
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: {
        ...prev[draftKey],
        status,
        siteName,
        permissionNote: finalNote,
        permissionSlot: status === "1H" ? (permissionSlot || "MORNING") : undefined,
        permissionTime: status === "1H" ? permissionTime : undefined,
        otHours: otHours !== undefined ? otHours : prev[draftKey]?.otHours,
        otTimeRange: otTimeRange !== undefined ? otTimeRange : prev[draftKey]?.otTimeRange,
        otReason: otReason !== undefined ? otReason : prev[draftKey]?.otReason,
        workNotes: finalNote,
        permissionHours: status === "1H" ? 1.0 : undefined,
      },
    }));

    // Update parent employees array in memory immediately
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== employeeId) return emp;
        const exists = emp.attendances.some((a) => a.date.split("T")[0] === markDate);
        let nextAttendances;
        if (exists) {
          nextAttendances = emp.attendances.map((a) =>
            a.date.split("T")[0] === markDate
              ? {
                  ...a,
                  status,
                  siteName: siteName || a.siteName,
                  permissionNote: finalNote !== undefined ? finalNote : a.permissionNote,
                  permissionSlot: status === "1H" ? (permissionSlot || a.permissionSlot || "MORNING") : a.permissionSlot,
                  permissionTime: status === "1H" ? (permissionTime || a.permissionTime) : a.permissionTime,
                  otHours: otHours !== undefined ? otHours : a.otHours,
                  otTimeRange: otTimeRange !== undefined ? otTimeRange : a.otTimeRange,
                  otReason: otReason !== undefined ? otReason : a.otReason,
                  inTime: extraTiming?.inTime !== undefined ? extraTiming.inTime : (a as any).inTime,
                  outTime: extraTiming?.outTime !== undefined ? extraTiming.outTime : (a as any).outTime,
                  permissionMinutes:
                    extraTiming?.permissionMinutes !== undefined
                      ? extraTiming.permissionMinutes
                      : (a as any).permissionMinutes,
                  permissionStatus:
                    extraTiming?.permissionStatus !== undefined
                      ? extraTiming.permissionStatus
                      : (a as any).permissionStatus,
                  otApprovalStatus:
                    extraTiming?.otApprovalStatus !== undefined
                      ? extraTiming.otApprovalStatus
                      : (a as any).otApprovalStatus,
                  workNotes: finalNote !== undefined ? finalNote : a.workNotes,
                }
              : a
          );
        } else {
          nextAttendances = [
            ...emp.attendances,
            {
              id: `draft_${Date.now()}`,
              employeeId: emp.id,
              date: markDate,
              status,
              siteName: siteName || (emp.category === "OFFICE_STAFF" ? "Headquarters Office" : "SSM School"),
              dailyAdvance: 0,
              permissionNote: finalNote || null,
              permissionSlot: status === "1H" ? (permissionSlot || "MORNING") : null,
              permissionTime: status === "1H" ? (permissionTime || null) : null,
              otHours: otHours || 0,
              otTimeRange: otTimeRange || null,
              otReason: otReason || null,
              inTime: extraTiming?.inTime || null,
              outTime: extraTiming?.outTime || null,
              permissionMinutes: extraTiming?.permissionMinutes || 0,
              permissionStatus: extraTiming?.permissionStatus || null,
              otApprovalStatus: extraTiming?.otApprovalStatus || null,
              permissionHours: status === "1H" ? 1.0 : null,
              workNotes: finalNote || null,
            },
          ];
        }
        return { ...emp, attendances: nextAttendances };
      })
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: markDate,
            status,
            siteName: siteName || undefined,
            permissionNote: finalNote || undefined,
            permissionSlot: status === "1H" ? (permissionSlot || "MORNING") : undefined,
            permissionTime: status === "1H" ? permissionTime : undefined,
            otHours: otHours ? Number(otHours) : undefined,
            otTimeRange: otTimeRange || undefined,
            otReason: otReason || undefined,
            workNotes: finalNote || undefined,
            permissionHours:
              extraTiming?.permissionMinutes && extraTiming.permissionMinutes > 0
                ? Math.round((extraTiming.permissionMinutes / 60) * 100) / 100
                : status === "1H"
                ? 1.0
                : undefined,
            permissionMinutes: extraTiming?.permissionMinutes,
            permissionStatus: extraTiming?.permissionStatus,
            otApprovalStatus: extraTiming?.otApprovalStatus,
            inTime: extraTiming?.inTime || (activeTab === "office" ? "09:00" : undefined),
            outTime: extraTiming?.outTime || (activeTab === "office" ? "19:30" : undefined),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Marked [${status}] for ${employees.find((e) => e.id === employeeId)?.name || "Worker"} (${markDate})`
        );
      }
    } catch (err) {
      console.error("Failed to mark attendance:", err);
    }
  };

  // Change site location
  const handleSiteChange = (employeeId: string, siteName: string) => {
    const draftKey = `${employeeId}_${selectedDate}`;
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: { ...prev[draftKey], siteName },
    }));

    handleMarkStatus(
      employeeId,
      (attendanceDrafts[draftKey]?.status as any) || "P",
      siteName
    );
  };

  // Change daily advance
  const handleAdvanceChange = async (employeeId: string, dailyAdvance: number) => {
    const draftKey = `${employeeId}_${selectedDate}`;
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: { ...prev[draftKey], dailyAdvance },
    }));

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status: attendanceDrafts[draftKey]?.status || "P",
            dailyAdvance,
          },
        }),
      });
      showToast(`Saved advance ₹${dailyAdvance}`);
    } catch (err) {
      console.error("Failed to save advance:", err);
    }
  };

  // Change In / Out Times for Office
  const handleTimeChange = async (employeeId: string, field: "inTime" | "outTime", val: string) => {
    const draftKey = `${employeeId}_${selectedDate}`;
    setAttendanceDrafts((prev) => ({
      ...prev,
      [draftKey]: { ...prev[draftKey], [field]: val },
    }));

    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          record: {
            employeeId,
            date: selectedDate,
            status: attendanceDrafts[draftKey]?.status || "P",
            [field]: val,
          },
        }),
      });
    } catch (err) {
      console.error("Failed to save biometric time:", err);
    }
  };

  // 1-Click "Mark All Present"
  const handleMarkAllPresent = async () => {
    const categoryKey =
      activeTab === "office" ? "OFFICE_STAFF" : activeTab === "hindi" ? "HINDI_LABOUR" : "TAMIL_LABOUR";
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-all-present",
          date: selectedDate,
          category: categoryKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Marked ${data.count} staff as [P] Present on ${selectedDate}`);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click "Auto-Fill Sundays as Weekly Off (L)"
  const handleAutoFillSundays = async () => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-sunday-leave",
          month: selectedMonth,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Auto-flagged ${data.sundaysCount} Sundays as Weekly Off [L] (${data.markedRecordsCount} records)`);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 1-Click "Copy Yesterday's Sites"
  const handleCopyYesterdaySites = async () => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy-yesterday-sites",
          date: selectedDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Copied site deployments from yesterday (${data.copiedCount} workers)`);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Multi-Year Lifetime Dossier
  const handleOpenDossier = async (emp: EmployeeItem, isContractor = false) => {
    setSelectedDossierEmployee(emp);
    setIsContractorDossier(isContractor);
    setDossierLoading(true);
    try {
      const res = await fetch(`/api/attendance/history?employeeId=${emp.id}`);
      const data = await res.json();
      if (data.success) {
        setDossierData(data);
        if (data.yearsList && data.yearsList.length > 0) {
          setDossierActiveYear(data.yearsList[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDossierLoading(false);
    }
  };

  // Export Individual Attendance Card
  const handleExportIndividualDossierExcel = () => {
    if (!dossierData || !selectedDossierEmployee) return;
    const yearData = dossierData.yearlyData[dossierActiveYear];
    if (!yearData) return;

    const exportRows = yearData.months.map((m: any) => ({
      Year: dossierActiveYear,
      Month: m.monthName,
      "Present (P)": m.present,
      "Half-Day (H)": m.halfDay,
      "1-Hr Permission (1H)": m.permission,
      "Absent (A)": m.absent,
      "Leaves / Sundays (L)": m.leave,
      "Net Payable Days": m.payableDays,
      "Site Advances (₹)": m.advances,
      "Sites Deployed": m.sites.join(", ") || "Office / Base",
    }));

    exportToExcel(
      exportRows,
      `${selectedDossierEmployee.employeeCode}_${selectedDossierEmployee.name}_Attendance_${dossierActiveYear}`,
      "Dossier"
    );
  };

  // Declare Holiday in Modal
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name) return;

    try {
      const res = await fetch("/api/attendance/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          date: holidayForm.date,
          name: holidayForm.name,
          holidayType: holidayForm.holidayType || "PL",
          markAllStaff: holidayForm.markStaff,
          markOfficeStaff: holidayForm.markStaff,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `Declared ${holidayForm.holidayType === "UP" ? "Company Unpaid Off Day" : "Holiday"} "${holidayForm.name}" on ${holidayForm.date} (Updated ${data.staffMarkedCount || 0} staff)`
        );
        setShowHolidayModal(false);
        setHolidayForm({ date: "", name: "", holidayType: "PL", markStaff: true });
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Contractor Log
  const handleSaveContractorLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "contractor-log",
          record: contractorForm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Saved work log for ${contractorForm.contractorTeamName}`);
        setShowContractorModal(false);
        fetchAttendance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export Monthly Muster to Excel
  const handleExportMusterExcel = () => {
    const rows = tabEmployees.map((emp) => {
      const base: Record<string, any> = {
        "Emp Code": emp.employeeCode,
        Name: emp.name,
        Role: emp.designation || emp.role || "Worker",
        Unit: emp.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs",
      };

      let p = 0;
      let h = 0;
      let p1h = 0;
      let a = 0;
      let l = 0;

      daysInMonth.forEach((d) => {
        const att = emp.attendances.find((x) => x.date.split("T")[0] === d.fullDate);
        const status = att ? att.status : d.isSunday ? "L" : "—";
        base[`Day ${d.dayNum} (${d.dayName})`] = status;

        if (status === "P") p++;
        else if (status === "H") h++;
        else if (status === "1H") p1h++;
        else if (status === "A") a++;
        else if (status === "L") l++;
      });

      base["Present (P)"] = p;
      base["Half-Day (H)"] = h;
      base["1-Hr Perm (1H)"] = p1h;
      base["Absent (A)"] = a;
      base["Leaves/Sun (L)"] = l;
      base["Net Payable Days"] = p + p1h + h * 0.5;

      return base;
    });

    exportToExcel(rows, `Attendance_${activeTab.toUpperCase()}_${selectedMonth}`, "MonthlyMuster");
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-7 py-3 space-y-5 select-none font-sans pb-20 text-slate-800 dark:text-slate-100">
      
      {/* 1. TOP MODULE HEADER WITH ANALYTICS & UNIVERSAL TOOLBAR */}
      <ModuleHeaderWithAnalytics
        title="Attendance & Workforce Command Center"
        subtitle="6-day work week engine, auto-Sunday leave, 1-hr permissions, daily deployment, and multi-year records"
        storageKey="sr_attendance_show_analytics"
        totalCount={employees.length + contractorTeamList.length}
        activeCount={
          employees.filter((e) =>
            e.attendances.some(
              (a) =>
                a.date.split("T")[0] === selectedDate &&
                (a.status === "P" || a.status === "H" || a.status === "1H")
            )
          ).length
        }
        archivedCount={employees.filter((e) => e.category === "OFFICE_STAFF").length}
        onImportExcel={() => setShowImportModal(true)}
        onExportExcel={() => setShowUniversalExportModal(true)}
        onPrintPDF={() => setShowUniversalExportModal(true)}
        extraControls={
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Link
              href={`/payroll?month=${selectedMonth}&tab=${activeTab}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer shrink-0"
              title="Open Standard Payroll for this month"
            >
              <span>View &amp; Run Payroll →</span>
            </Link>
            <button
              type="button"
              onClick={() => setShowLeaveDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shrink-0 shadow-xs"
              title="Leaves & Approvals (PL, UP, Half-Day & ESS Logins)"
            >
              <Calendar size={14} className="text-indigo-600" />
              <span>Leaves & Approvals</span>
              {leaveRequests.filter((r) => r.status === "PENDING").length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[10px] ml-1 animate-pulse">
                  {leaveRequests.filter((r) => r.status === "PENDING").length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsInitialTab("holidays");
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-200 dark:border-amber-800 transition cursor-pointer shrink-0"
              title="Company holidays and leave calendar"
            >
              <Palmtree size={14} className="text-amber-600" />
              <span>Holidays ({holidays.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsInitialTab("personnel");
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer shrink-0"
              title="Attendance rules, company holidays and directory editor"
            >
              <Settings size={14} className="text-slate-600 dark:text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        }
      />

      {/* Floating Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-teal-700 to-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-500/30 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles size={14} className="text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. TOP REAL-TIME ATTENDANCE KPI CARDS (TENANT ISOLATED) */}
      <div className={`grid gap-3 ${activeCompany?.id === "invi-creation" ? "grid-cols-1 max-w-sm" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"}`}>
        {/* KPI 1: Office Staff Presence */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <Building size={13} className="text-emerald-600 shrink-0" /> Office Presence
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0 inline-flex items-center">
                {selectedDate}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.presentOfficeToday || 0}
                <span className="text-xs font-semibold text-slate-400"> / {employees.filter((e) => e.category === "OFFICE_STAFF").length}</span>
              </div>
              <span className="text-xs font-bold text-emerald-600">
                {employees.filter((e) => e.category === "OFFICE_STAFF").length > 0
                  ? Math.round(((kpis.presentOfficeToday || 0) / employees.filter((e) => e.category === "OFFICE_STAFF").length) * 100)
                  : 0}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {activeCompany?.name || "Standard Roofs"} • Off: {kpis.leaveOfficeToday || 0}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full"
              style={{
                width: `${
                  employees.filter((e) => e.category === "OFFICE_STAFF").length > 0
                    ? Math.round(((kpis.presentOfficeToday || 0) / employees.filter((e) => e.category === "OFFICE_STAFF").length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {activeCompany?.id !== "invi-creation" && (
        <>
        {/* KPI 2: Active Tamil Site Labours */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <HardHat size={13} className="text-blue-600 shrink-0" /> Tamil Site Labours
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0 inline-flex items-center">
                On Duty
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                {kpis.activeTamilSiteLabours || 0}
                <span className="text-xs font-semibold text-slate-400"> / {employees.filter((e) => e.category === "TAMIL_LABOUR").length}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {Object.keys(kpis.siteBreakdown || {}).length} Sites
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {Object.keys(kpis.siteBreakdown || {}).slice(0, 3).join(", ") || "SSM School, Kalloviyam..."}
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full"
              style={{
                width: `${
                  employees.filter((e) => e.category === "TAMIL_LABOUR").length > 0
                    ? Math.min(100, Math.round(((kpis.activeTamilSiteLabours || 0) / employees.filter((e) => e.category === "TAMIL_LABOUR").length) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* KPI 3: Hindi Migrant Crew */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <Truck size={13} className="text-purple-600 shrink-0" /> Hindi Helpers & Crew
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap shrink-0 inline-flex items-center">
                {employees.filter((e) => e.category === "HINDI_LABOUR").length} Crew
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
                {kpis.activeHindiToday || 0}
                <span className="text-xs font-semibold text-slate-400"> Working</span>
              </div>
              <span className="text-xs font-bold text-purple-600">
                {employees.filter((e) => e.category === "HINDI_LABOUR").length > 0
                  ? Math.round(((kpis.activeHindiToday || 0) / employees.filter((e) => e.category === "HINDI_LABOUR").length) * 100)
                  : 0}% Utilization
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              Rakeshkumar1, Nithish, Rakesh2, Ajith, Mithun
            </p>
          </div>
          <div className="w-full bg-purple-100 dark:bg-purple-950 h-1 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-full"
              style={{
                width: `${
                  employees.filter((e) => e.category === "HINDI_LABOUR").length > 0
                    ? Math.min(100, Math.round(((kpis.activeHindiToday || 0) / employees.filter((e) => e.category === "HINDI_LABOUR").length) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* KPI 4: Contractor Teams Headcount */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                <Users2 size={13} className="text-amber-600 shrink-0" /> Contractor Teams
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap shrink-0 inline-flex items-center">
                {contractorsFromDb.length} Teams
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {kpis.contractorHeadcountToday || 0}
                <span className="text-xs font-semibold text-slate-400"> Labours</span>
              </div>
              <span className="text-xs font-bold text-amber-600">Active Sites</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {contractorsFromDb.slice(0, 6).map((c: any) => c.name).join(", ") || "No contractors"}
            </p>
          </div>
          <div className="w-full bg-amber-100 dark:bg-amber-950 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-amber-500 h-full w-[70%]" />
          </div>
        </div>
        </>
        )}
      </div>

      {/* 3. DEDICATED SUBTAB NAVIGATION & CONTROL STRIP */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 shadow-2xs space-y-3">
        {/* Row 1: Segmented Workforce Tabs + Multi-Year/Month Switcher + Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Tabs with consistent 38px height */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl h-[38px] shrink-0">
            <button
              onClick={() => setActiveTab("office")}
              className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "office"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Building size={14} />
              <span>Office Staff ({employees.filter((e) => e.category === "OFFICE_STAFF").length})</span>
            </button>

            {activeCompany?.id !== "invi-creation" && (
            <>
            <button
              onClick={() => setActiveTab("tamil")}
              className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "tamil"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <HardHat size={14} />
              <span>Tamil Labours ({employees.filter((e) => e.category === "TAMIL_LABOUR").length})</span>
            </button>

            <button
              onClick={() => setActiveTab("hindi")}
              className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "hindi"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Truck size={14} />
              <span>Hindi Crew ({employees.filter((e) => e.category === "HINDI_LABOUR").length})</span>
            </button>

            <button
              onClick={() => setActiveTab("contractor")}
              className={`flex items-center gap-1.5 px-3 h-full rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === "contractor"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Users2 size={14} />
              <span>Contractors ({contractorsFromDb.length})</span>
            </button>
            </>
            )}
          </div>

          {/* Right Toolbar Controls with consistent 38px height */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-Year & Month Switcher (2025-2030) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl h-[38px] border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-full flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center gap-1 px-1.5">
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearMonthChange(Number(e.target.value), selectedMonthNum)}
                  className="bg-transparent text-xs font-black text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-800">
                      {y}
                    </option>
                  ))}
                </select>

                <span className="text-slate-400 text-xs">/</span>

                <select
                  value={selectedMonthNum}
                  onChange={(e) => handleYearMonthChange(selectedYear, e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-800">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-full flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Toggle Today Roll-Call */}
            <button
              type="button"
              onClick={() => setShowTodayRollCall(!showTodayRollCall)}
              className={`flex items-center gap-1.5 px-3 h-[38px] rounded-xl font-bold text-xs transition cursor-pointer ${
                showTodayRollCall
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              }`}
              title="Quick mark today's presence"
            >
              <Clock size={13} />
              <span>{showTodayRollCall ? "Hide Roll-Call" : "+ Mark Today"}</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl h-[38px] text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode("monthly")}
                className={`flex items-center gap-1 px-2.5 h-full rounded-lg transition cursor-pointer ${
                  viewMode === "monthly" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                }`}
              >
                <CalendarDays size={13} />
                <span>Month Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className={`flex items-center gap-1 px-2.5 h-full rounded-lg transition cursor-pointer ${
                  viewMode === "daily" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                }`}
              >
                <Clock size={13} />
                <span>Daily Sheet</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Summary Strip & Sub-Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
              Days: <strong>{daysInMonth.length}</strong>
            </span>
            {activeTab === "office" ? (
              <>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[11px]">
                  Sundays (Off L): <strong>{totalSundaysInMonth}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800">
                  Paid Holidays (PL): <strong>{totalHolidaysInMonth}</strong>
                </span>
                {totalUnpaidShutdownInMonth > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] border border-slate-200 dark:border-slate-700">
                    Unpaid Off (UP): <strong>{totalUnpaidShutdownInMonth}</strong>
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold text-[11px] border border-blue-200 dark:border-blue-800">
                  Working Days: <strong>{totalWorkingDaysInMonth}</strong>
                </span>
              </>
            ) : (
              <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold text-[11px] border border-amber-200 dark:border-amber-800">
                Rule: Strict "Work = Paid, No Work = No Pay" (No Auto-Sunday L)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "office" && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg h-[34px]">
                <button
                  type="button"
                  onClick={() => setCompanyUnitFilter("ALL")}
                  className={`px-2.5 h-full rounded-md font-bold text-[11px] transition cursor-pointer ${
                    companyUnitFilter === "ALL" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  All (13)
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyUnitFilter("STANDARD_ROOFS")}
                  className={`px-2.5 h-full rounded-md font-bold text-[11px] transition cursor-pointer ${
                    companyUnitFilter === "STANDARD_ROOFS" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Standard Roofs (10)
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyUnitFilter("INVI_CREATION")}
                  className={`px-2.5 h-full rounded-md font-bold text-[11px] transition cursor-pointer ${
                    companyUnitFilter === "INVI_CREATION" ? "bg-white dark:bg-slate-900 text-blue-600 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Invi Creation (3)
                </button>
              </div>
            )}

            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search name, ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 h-[34px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleExportMusterExcel}
              className="flex items-center gap-1 px-3 h-[34px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold rounded-xl border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Export (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKFORCE CONTENT: UNIFIED DAILY SHEET & MONTHLY MATRIX ACROSS ALL 4 CATEGORIES */}
      {viewMode === "daily" ? (
        /* ================= DAILY QUICK-MARK TABLE (TABS 1, 2, 3) ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="text-blue-600" size={16} />
                  Daily Attendance & Deployment Sheet • {selectedDate}
                </h3>
                {new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay() === 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-black">
                    Weekly Off (Sunday)
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    Working Day
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                1-Click status pills: [P] Present • [H] Half-Day • [1H] 1-Hr Permission • [A] Absent • [L] Leave/Sunday
              </p>
            </div>

            <div className="text-xs text-slate-500 font-semibold tabular-nums">
              Showing <strong>{tabEmployees.length}</strong> personnel
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-3">ID & Personnel (Click for Dossier)</th>
                  <th className="py-3 px-3">Role / Designation</th>
                  {activeTab === "office" && <th className="py-3 px-3">Company Unit</th>}
                  {activeTab !== "office" && <th className="py-3 px-3">Site Location</th>}
                  {activeTab !== "office" && <th className="py-3 px-3 text-right">Daily Advance (₹)</th>}
                  {activeTab === "office" && <th className="py-3 px-3 text-center">In Time</th>}
                  {activeTab === "office" && <th className="py-3 px-3 text-center">Out Time</th>}
                  <th className="py-3 px-3 text-center min-w-[240px]">Status Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && employees.length === 0 ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={`skel_att_${idx}`} className="h-11 animate-pulse">
                      <td className="py-2.5 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-28 mb-1" />
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-md w-14" />
                      </td>
                      {daysInMonth.map((d) => (
                        <td key={`skeld_${d.dayNum}`} className="py-2 px-0.5 text-center">
                          <div className="h-6 w-7 bg-slate-100 dark:bg-slate-800 rounded-md mx-auto" />
                        </td>
                      ))}
                      <td colSpan={8} className="py-2 px-2">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-full" />
                      </td>
                    </tr>
                  ))
                ) : activeTab === "contractor" ? (
                  contractorTeamList.map((team) => {
                    const log = contractorLogs.find(
                      (c) => c.contractorTeamName === team.name && c.date.split("T")[0] === selectedDate
                    );
                    const headcount = log?.headcount ?? 4;
                    const siteName = log?.siteName || "Ravichandran Chennai";
                    const workStatus = log?.siteWorkStatus || "Fabrication Work";
                    const breakdown = log?.workerBreakdown || "";
                    const isPresent = log && log.headcount > 0;
                    const isAbsent = log && (log.headcount === 0 || log.siteWorkStatus?.includes("Absent") || log.siteWorkStatus?.includes("No Work"));

                    return (
                      <tr key={team.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div
                            onClick={() =>
                              handleOpenDossier(
                                {
                                  id: team.name,
                                  name: team.name,
                                  employeeCode: team.code,
                                  category: "CONTRACTOR_TEAM",
                                  companyUnit: "STANDARD_ROOFS",
                                  attendances: [],
                                },
                                true
                              )
                            }
                            className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                          >
                            <span>{team.name}</span>
                            <History size={12} className="text-slate-400 shrink-0" />
                          </div>
                          <span className="text-[10.5px] font-mono text-slate-400 block">{team.code}</span>
                        </td>

                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                          {team.role}
                        </td>

                        {/* Site Location Dropdown */}
                        <td className="py-3 px-3">
                          <select
                            value={siteName}
                            onChange={(e) =>
                              handleSaveContractorDaily(
                                team.name,
                                selectedDate,
                                headcount,
                                e.target.value,
                                workStatus,
                                breakdown
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-hidden"
                          >
                            {COMMON_SITES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Labours Working (Headcount) */}
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={headcount}
                            onChange={(e) =>
                              handleSaveContractorDaily(
                                team.name,
                                selectedDate,
                                Number(e.target.value),
                                siteName,
                                Number(e.target.value) === 0 ? "No Work / Standby" : workStatus,
                                breakdown
                              )
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-center"
                          />
                        </td>

                        {/* Work Status */}
                        <td className="py-3 px-3">
                          <select
                            value={workStatus}
                            onChange={(e) =>
                              handleSaveContractorDaily(
                                team.name,
                                selectedDate,
                                headcount,
                                siteName,
                                e.target.value,
                                breakdown
                              )
                            }
                            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-medium focus:outline-hidden"
                          >
                            <option value="Fabrication Work">Fabrication Work</option>
                            <option value="Purlin Work Welding">Purlin Work Welding</option>
                            <option value="Roof Sheeting">Roof Sheeting</option>
                            <option value="High-Roof Truss Erection">High-Roof Truss Erection</option>
                            <option value="Rain season / Standby">Rain season / Standby</option>
                            <option value="Site Standby / No Work">Site Standby / No Work</option>
                          </select>
                        </td>

                        {/* Worker Breakdown */}
                        <td className="py-3 px-3 font-mono text-xs">
                          <input
                            type="text"
                            placeholder="e.g. Rajkumar-F, Mani-H"
                            value={breakdown}
                            onChange={(e) =>
                              handleSaveContractorDaily(
                                team.name,
                                selectedDate,
                                headcount,
                                siteName,
                                workStatus,
                                e.target.value
                              )
                            }
                            className="w-44 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono"
                          />
                        </td>

                        {/* Status Action Pills */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveContractorDaily(
                                  team.name,
                                  selectedDate,
                                  headcount > 0 ? headcount : 4,
                                  siteName,
                                  "Active Work",
                                  breakdown
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg font-black text-xs transition cursor-pointer ${
                                isPresent
                                  ? "bg-emerald-600 text-white shadow-2xs"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500"
                              }`}
                            >
                              P (Active)
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveContractorDaily(
                                  team.name,
                                  selectedDate,
                                  headcount > 0 ? headcount : 2,
                                  siteName,
                                  "Half-Day Work",
                                  breakdown
                                )
                              }
                              className="px-2 py-1 rounded-lg font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 transition cursor-pointer"
                            >
                              H
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveContractorDaily(
                                  team.name,
                                  selectedDate,
                                  0,
                                  "Site Standby",
                                  "No Work / Absent",
                                  breakdown
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg font-black text-xs transition cursor-pointer ${
                                isAbsent
                                  ? "bg-rose-600 text-white shadow-2xs"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500"
                              }`}
                            >
                              A (No Work)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  tabEmployees.map((emp) => {
                  const key = `${emp.id}_${selectedDate}`;
                  const att = emp.attendances.find((a) => a.date.split("T")[0] === selectedDate);
                  const draft = attendanceDrafts[key] || {};
                  
                  // Clean Unmarked State Check:
                  // If explicit record exists in draft or DB, use it.
                  // Otherwise, if Sunday -> auto "L". If non-Sunday -> null (Unmarked / Pending)
                  const isSun = new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay() === 0;
                  const currentStatus = draft.status !== undefined ? draft.status : att?.status ? (att.status as any) : isSun ? "L" : null;

                  const inTimeVal = draft.inTime ?? att?.inTime ?? "";
                  const outTimeVal = draft.outTime ?? att?.outTime ?? "";
                  const siteVal = draft.siteName ?? att?.siteName ?? (activeTab === "office" ? "Headquarters Office" : "SSM School");
                  const advanceVal = draft.dailyAdvance ?? att?.dailyAdvance ?? 0;
                  const permNote = draft.permissionNote ?? att?.permissionNote ?? "";

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Name & ID (Click opens Lifetime Multi-Year Dossier) */}
                      <td className="py-3 px-3">
                        <div
                          onClick={() => handleOpenDossier(emp)}
                          className="flex items-center gap-2.5 cursor-pointer group"
                          title="Click to view full Multi-Year & Lifetime Attendance Dossier"
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition group-hover:scale-105 ${
                              activeTab === "office"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : activeTab === "hindi"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {emp.employeeCode.slice(-3)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline flex items-center gap-1.5">
                              {emp.name}
                              <History size={11} className="opacity-0 group-hover:opacity-100 text-blue-600 transition" />
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {emp.employeeCode} {emp.empCode ? `(${emp.empCode})` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {emp.designation || emp.role || "Worker"}
                        </span>
                        {emp.dailyWage ? (
                          <span className="text-[10.5px] text-slate-400 block tabular-nums">
                            ₹{emp.dailyWage}/day
                          </span>
                        ) : null}
                      </td>

                      {/* Company Unit for Office */}
                      {activeTab === "office" && (
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              emp.companyUnit === "INVI_CREATION"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                            }`}
                          >
                            {emp.companyUnit === "INVI_CREATION" ? "Invi Creation" : "Standard Roofs"}
                          </span>
                        </td>
                      )}

                      {/* Site Location for Labours */}
                      {activeTab !== "office" && (
                        <td className="py-3 px-3">
                          <div className="relative min-w-[190px]">
                            <select
                              value={siteVal}
                              onChange={(e) => handleSiteChange(emp.id, e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:border-blue-500"
                            >
                              {COMMON_SITES.map((site) => (
                                <option key={site} value={site}>
                                  {site}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      )}

                      {/* Daily Pocket Advance for Labours */}
                      {activeTab !== "office" && (
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <span className="text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              value={advanceVal || ""}
                              placeholder="0"
                              onChange={(e) => handleAdvanceChange(emp.id, Number(e.target.value) || 0)}
                              className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-right tabular-nums text-xs font-bold focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                        </td>
                      )}

                      {/* Office In Time */}
                      {activeTab === "office" && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="text"
                            placeholder="09:00 AM"
                            value={inTimeVal}
                            onChange={(e) => handleTimeChange(emp.id, "inTime", e.target.value)}
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-center focus:outline-hidden focus:border-blue-500 tabular-nums"
                          />
                        </td>
                      )}

                      {/* Office Out Time */}
                      {activeTab === "office" && (
                        <td className="py-3 px-3 text-center">
                          <input
                            type="text"
                            placeholder="07:00 PM"
                            value={outTimeVal}
                            onChange={(e) => handleTimeChange(emp.id, "outTime", e.target.value)}
                            className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-center focus:outline-hidden focus:border-blue-500 tabular-nums"
                          />
                        </td>
                      )}

                      {/* 1-Click Status Pill Group [P] [H] [1H] [A] [L] with Clean Unmarked State */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                          {/* Present (P) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "P", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "P"
                                ? "bg-emerald-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            }`}
                            title="Present (1.0 Full Day)"
                          >
                            P
                          </button>

                          {/* Half Day (H) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "H", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "H"
                                ? "bg-amber-500 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            }`}
                            title="Half Day (0.5 Day)"
                          >
                            H
                          </button>

                          {/* 1-Hour Permission (1H) */}
                          <button
                            type="button"
                            onClick={() => {
                              // If already 1H, re-confirm or open prompt
                              setPermPromptTarget({ employeeId: emp.id, siteName: siteVal });
                              setPermissionInput(permNote || "1-Hour Morning Permission");
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "1H"
                                ? "bg-cyan-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                            }`}
                            title="1-Hour Permission (1.0 Day with Permission Log)"
                          >
                            1H
                          </button>

                          {/* Absent (A) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "A", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "A"
                                ? "bg-rose-600 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            }`}
                            title="Absent (0.0 Day)"
                          >
                            A
                          </button>

                          {/* Leave / Sunday (L) */}
                          <button
                            type="button"
                            onClick={() => handleMarkStatus(emp.id, "L", siteVal)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                              currentStatus === "L"
                                ? "bg-slate-700 text-white shadow-xs scale-105"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                            title="Leave / Sunday Holiday"
                          >
                            L
                          </button>

                          {/* Unmarked Indicator */}
                          {currentStatus === null && (
                            <span className="text-[10px] text-slate-400 px-1 font-semibold" title="Pending HR Mark">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= MONTHLY MATRIX GRID (1..31 DAYS WITH CLICKABLE CELLS & SUMMARY) ================= */
        <div className="space-y-4">
          {/* Quick Today's Roll-Call Panel (When toggled open) */}
          {showTodayRollCall && (
            <div className="bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border-2 border-blue-400 dark:border-blue-700 p-4 shadow-md space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200 dark:border-blue-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                      <span>Today's Live Roll-Call & Site Muster</span>
                      <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl px-1.5 py-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(`${selectedDate}T00:00:00Z`);
                            d.setUTCDate(d.getUTCDate() - 1);
                            const next = d.toISOString().slice(0, 10);
                            setSelectedDate(next);
                            setSelectedYear(Number(next.slice(0, 4)));
                            setSelectedMonthNum(next.slice(5, 7));
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 cursor-pointer"
                          title="Previous Day"
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (!next) return;
                            setSelectedDate(next);
                            setSelectedYear(Number(next.slice(0, 4)));
                            setSelectedMonthNum(next.slice(5, 7));
                          }}
                          className="text-xs font-mono font-bold text-blue-800 dark:text-blue-200 bg-transparent focus:outline-none cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(`${selectedDate}T00:00:00Z`);
                            d.setUTCDate(d.getUTCDate() + 1);
                            const next = d.toISOString().slice(0, 10);
                            setSelectedDate(next);
                            setSelectedYear(Number(next.slice(0, 4)));
                            setSelectedMonthNum(next.slice(5, 7));
                          }}
                          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 cursor-pointer"
                          title="Next Day"
                        >
                          <ChevronRight size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date().toLocaleDateString("en-CA");
                            setSelectedDate(today);
                            setSelectedYear(Number(today.slice(0, 4)));
                            setSelectedMonthNum(today.slice(5, 7));
                          }}
                          className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Today
                        </button>
                      </div>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Marking a person here immediately updates both Today and the Month Matrix grid below in real time.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Mark All Present</span>
                  </button>
                  {activeTab === "tamil" && (
                    <button
                      type="button"
                      onClick={handleCopyYesterdaySites}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-200 dark:border-blue-700 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <Copy size={13} />
                      <span>Copy Yesterday's Sites</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowTodayRollCall(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                    title="Close Roll-Call Panel"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Fast Roll-Call Table */}
              <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-blue-100 dark:border-blue-900">
                      <th className="py-2 px-3">Personnel</th>
                      <th className="py-2 px-3">Role</th>
                      {activeTab !== "office" && <th className="py-2 px-3">Site Location</th>}
                      {activeTab !== "office" && <th className="py-2 px-3 text-right">Advance (₹)</th>}
                      {activeTab === "office" && <th className="py-2 px-3 text-center">In Time</th>}
                      {activeTab === "office" && <th className="py-2 px-3 text-center">Out Time</th>}
                      <th className="py-2 px-3 text-center">Quick Mark Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100/50 dark:divide-blue-900/30">
                    {activeTab === "contractor" ? (
                      contractorTeamList.map((team) => {
                        const log = contractorLogs.find(
                          (c) => c.contractorTeamName === team.name && c.date.split("T")[0] === selectedDate
                        );
                        const headcount = log?.headcount ?? 4;
                        const siteName = log?.siteName || "Ravichandran Chennai";
                        const workStatus = log?.siteWorkStatus || "Fabrication Work";
                        const breakdown = log?.workerBreakdown || "";
                        const isPresent = log && log.headcount > 0;
                        const isAbsent = log && (log.headcount === 0 || log.siteWorkStatus?.includes("Absent") || log.siteWorkStatus?.includes("No Work"));

                        return (
                          <tr key={`rc_${team.name}`} className="hover:bg-white/60 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3 font-bold text-blue-600 dark:text-blue-400">
                              <span
                                onClick={() =>
                                  handleOpenDossier(
                                    {
                                      id: team.name,
                                      name: team.name,
                                      employeeCode: team.code,
                                      category: "CONTRACTOR_TEAM",
                                      companyUnit: "STANDARD_ROOFS",
                                      attendances: [],
                                    },
                                    true
                                  )
                                }
                                className="cursor-pointer hover:underline"
                              >
                                {team.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono ml-2">({team.code})</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                              {team.role}
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={siteName}
                                onChange={(e) =>
                                  handleSaveContractorDaily(
                                    team.name,
                                    selectedDate,
                                    headcount,
                                    e.target.value,
                                    workStatus,
                                    breakdown
                                  )
                                }
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-hidden"
                              >
                                {COMMON_SITES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max="50"
                                value={headcount}
                                onChange={(e) =>
                                  handleSaveContractorDaily(
                                    team.name,
                                    selectedDate,
                                    Number(e.target.value) || 0,
                                    siteName,
                                    workStatus,
                                    breakdown
                                  )
                                }
                                className="w-16 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-mono text-xs focus:outline-hidden"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveContractorDaily(
                                      team.name,
                                      selectedDate,
                                      headcount > 0 ? headcount : 4,
                                      siteName,
                                      "Fabrication Work",
                                      breakdown
                                    )
                                  }
                                  className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                    isPresent ? "bg-emerald-600 text-white scale-105" : "text-slate-600 hover:text-emerald-600"
                                  }`}
                                >
                                  P
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveContractorDaily(
                                      team.name,
                                      selectedDate,
                                      2,
                                      siteName,
                                      "Half-Day Site Work",
                                      breakdown
                                    )
                                  }
                                  className="px-2 py-0.5 rounded-lg text-xs font-black text-slate-600 hover:text-amber-500 transition cursor-pointer"
                                >
                                  H
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSaveContractorDaily(
                                      team.name,
                                      selectedDate,
                                      0,
                                      siteName,
                                      "Site Standby / No Work",
                                      breakdown
                                    )
                                  }
                                  className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                    isAbsent ? "bg-rose-600 text-white scale-105" : "text-slate-600 hover:text-rose-600"
                                  }`}
                                >
                                  A
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      tabEmployees.map((emp) => {
                      const key = `${emp.id}_${selectedDate}`;
                      const draft = attendanceDrafts[key];
                      const dbAtt = emp.attendances.find((a) => a.date.split("T")[0] === selectedDate);
                      const currentStatus = draft?.status || (dbAtt ? dbAtt.status : null);
                      const siteVal = draft?.siteName || (dbAtt?.siteName) || (emp.category === "OFFICE_STAFF" ? "Headquarters Office" : "SSM School");
                      const advanceVal = draft?.dailyAdvance !== undefined ? draft.dailyAdvance : (dbAtt?.dailyAdvance ? Number(dbAtt.dailyAdvance) : 0);
                      const inVal = draft?.inTime || (dbAtt?.inTime) || "09:00 AM";
                      const outVal = draft?.outTime || (dbAtt?.outTime) || "07:00 PM";

                      return (
                        <tr key={`rc_${emp.id}`} className="hover:bg-white/60 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">
                            <span>{emp.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">({emp.employeeCode})</span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                            {emp.designation || emp.role || "Worker"}
                          </td>
                          {activeTab !== "office" && (
                            <td className="py-2 px-3">
                              <select
                                value={siteVal}
                                onChange={(e) => handleSiteChange(emp.id, e.target.value)}
                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-hidden"
                              >
                                {COMMON_SITES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </td>
                          )}
                          {activeTab !== "office" && (
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={advanceVal || ""}
                                placeholder="0"
                                onChange={(e) => handleAdvanceChange(emp.id, Number(e.target.value) || 0)}
                                className="w-16 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-mono text-xs focus:outline-hidden"
                              />
                            </td>
                          )}
                          {activeTab === "office" && (
                            <td className="py-2 px-3 text-center">
                              <input
                                type="text"
                                value={inVal}
                                onChange={(e) => handleTimeChange(emp.id, "inTime", e.target.value)}
                                className="w-20 px-1 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono text-xs focus:outline-hidden"
                              />
                            </td>
                          )}
                          {activeTab === "office" && (
                            <td className="py-2 px-3 text-center">
                              <input
                                type="text"
                                value={outVal}
                                onChange={(e) => handleTimeChange(emp.id, "outTime", e.target.value)}
                                className="w-20 px-1 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-mono text-xs focus:outline-hidden"
                              />
                            </td>
                          )}
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleMarkStatus(emp.id, "P", siteVal)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                  currentStatus === "P" ? "bg-emerald-600 text-white scale-105" : "text-slate-600 hover:text-emerald-600"
                                }`}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkStatus(emp.id, "H", siteVal)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                  currentStatus === "H" ? "bg-amber-500 text-white scale-105" : "text-slate-600 hover:text-amber-500"
                                }`}
                              >
                                H
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPermPromptTarget({ employeeId: emp.id, siteName: siteVal });
                                  setPermissionInput("1-Hour Permission");
                                }}
                                className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                  currentStatus === "1H" ? "bg-cyan-600 text-white scale-105" : "text-slate-600 hover:text-cyan-600"
                                }`}
                              >
                                1H
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkStatus(emp.id, "A", siteVal)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                  currentStatus === "A" ? "bg-rose-600 text-white scale-105" : "text-slate-600 hover:text-rose-600"
                                }`}
                              >
                                A
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkStatus(emp.id, "L", siteVal)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                                  currentStatus === "L" ? "bg-slate-700 text-white scale-105" : "text-slate-600 hover:text-slate-800"
                                }`}
                              >
                                L
                              </button>
                              {currentStatus === null && <span className="text-[10px] text-slate-400 px-1">—</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CalendarDays className="text-blue-600" size={16} />
                    Monthly Attendance & Muster Grid ({selectedMonth})
                  </h3>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
                    {totalWorkingDaysInMonth} Scheduled Working Days
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any cell to edit status: <strong className="text-emerald-600">P (1.0)</strong>, <strong className="text-rose-600">P + -1hM / -1hE (1.0)</strong>, <strong className="text-amber-500">H (0.5)</strong>, <strong className="text-teal-600">PL (1.0)</strong>, <strong className="text-slate-600">UP (0.0)</strong>, <strong className="text-rose-600">A (0.0)</strong>, <strong className="text-slate-500">L (Sunday Off)</strong>, <strong className="text-violet-600">OT (+1h/+2h)</strong>
                </p>
              </div>

            <div className="flex flex-wrap items-center gap-2 max-w-full">
              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-extrabold bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 max-w-full">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold" title="Full Day Present (1.0)">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" /> P <span className="text-[9px] font-medium text-slate-400">1.0</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold" title="1-Hour Morning Permission (1.0 Present)">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" /> P + <span className="h-[13px] px-1 text-[8.5px] font-extrabold leading-none rounded-[4px] tracking-tighter shadow-xs ring-1 ring-white bg-rose-600 text-white inline-flex items-center justify-center">-1hM</span> <span className="text-[9px] font-medium text-slate-400">1.0</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold" title="1-Hour Evening Permission (1.0 Present)">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" /> P + <span className="h-[13px] px-1 text-[8.5px] font-extrabold leading-none rounded-[4px] tracking-tighter shadow-xs ring-1 ring-white bg-rose-600 text-white inline-flex items-center justify-center">-1hE</span> <span className="text-[9px] font-medium text-slate-400">1.0</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold" title="Half-Day (0.5)">
                  <span className="w-2 h-2 rounded-xs bg-amber-400" /> H <span className="text-[9px] font-medium text-slate-400">0.5</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-bold" title="Paid Holiday (1.0)">
                  <span className="w-2 h-2 rounded-xs bg-teal-600" /> PL <span className="text-[9px] font-medium text-slate-400">1.0</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 font-bold" title="Unpaid Leave (0.0)">
                  <span className="w-2 h-2 rounded-xs bg-slate-600" /> UP <span className="text-[9px] font-medium text-slate-400">0.0</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold" title="Absent (0.0)">
                  <span className="w-2 h-2 rounded-xs bg-rose-500" /> A <span className="text-[9px] font-medium text-slate-400">0.0</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-bold" title="Sunday / Weekly Off (0.0)">
                  <span className="w-2 h-2 rounded-xs bg-slate-300 dark:bg-slate-600" /> L <span className="text-[9px] font-medium text-slate-400">Off</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 font-bold" title="After 9:00 PM Overtime Hours">
                  <span className="w-2 h-2 rounded-xs bg-emerald-500" /> P + <span className="h-[13px] px-1 text-[8.5px] font-extrabold leading-none rounded-[4px] tracking-tighter shadow-xs ring-1 ring-white bg-violet-600 text-white inline-flex items-center justify-center">+1h/+2h</span>
                </span>
              </div>

              <button
                type="button"
                onClick={handleExportMusterExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer shrink-0"
              >
                <FileSpreadsheet size={13} />
                <span>Export (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-3 sticky left-0 bg-white dark:bg-slate-900 z-20 min-w-[190px] border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)]">
                    Personnel Name
                  </th>

                  {/* 1..31 Days Header */}
                  {daysInMonth.map((d) => (
                    <th
                      key={d.dayNum}
                      className={`py-2 px-1 text-center min-w-[28px] border-r border-slate-100 dark:border-slate-800/50 ${
                        d.isSunday
                          ? "bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black"
                          : d.isHoliday
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold"
                          : d.fullDate === selectedDate
                          ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black"
                          : ""
                      }`}
                    >
                      <div>{d.dayNum}</div>
                      <div className="text-[8px] font-normal opacity-70">{d.dayName}</div>
                    </th>
                  ))}

                  {/* Right Fixed Summary Columns */}
                  <th className="w-14 min-w-[56px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-black border-l border-slate-200 dark:border-slate-800">
                    P (1.0)
                  </th>
                  <th className="w-16 min-w-[64px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-sky-800 dark:text-sky-300 font-black" title="1-Hour Permissions: Total (Morning / Evening)">
                    1H (M/E)
                  </th>
                  <th className="w-14 min-w-[56px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 font-black">
                    H (0.5)
                  </th>
                  {activeTab === "office" && (
                    <th className="w-14 min-w-[56px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 font-black">
                      PL (1.0)
                    </th>
                  )}
                  {activeTab === "office" && (
                    <th className="w-14 min-w-[56px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-black">
                      UP (0.0)
                    </th>
                  )}
                  <th className="w-16 min-w-[60px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-300 font-black">
                    A (0.0)
                  </th>
                  <th className="w-16 min-w-[64px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 font-black">
                    OT HRS
                  </th>
                  <th className="w-16 min-w-[68px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-violet-800 dark:text-violet-300 font-black">
                    PERM HRS
                  </th>
                  {activeTab === "office" && (
                    <th className="w-14 min-w-[56px] py-2.5 px-1 text-center bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-black">
                      L (Sun)
                    </th>
                  )}
                  <th className="w-20 min-w-[80px] py-2.5 px-2 text-center bg-slate-50 dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-black sticky right-0 z-20 border-l border-slate-200 dark:border-slate-700 shadow-sm">
                    Payable Days
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && employees.length === 0 ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={`skel_att_${idx}`} className="h-11 animate-pulse">
                      <td className="py-2.5 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-28 mb-1" />
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-md w-14" />
                      </td>
                      {daysInMonth.map((d) => (
                        <td key={`skeld_${d.dayNum}`} className="py-2 px-0.5 text-center">
                          <div className="h-6 w-7 bg-slate-100 dark:bg-slate-800 rounded-md mx-auto" />
                        </td>
                      ))}
                      <td colSpan={8} className="py-2 px-2">
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-full" />
                      </td>
                    </tr>
                  ))
                ) : activeTab === "contractor" ? (
                  contractorTeamList.map((team) => {
                    let activeDays = 0;
                    let totalManDays = 0;
                    const sitesWorked = new Set<string>();

                    daysInMonth.forEach((d) => {
                      const log = contractorLogs.find(
                        (c) => c.contractorTeamName === team.name && c.date.split("T")[0] === d.fullDate
                      );
                      if (log && log.headcount > 0) {
                        activeDays++;
                        totalManDays += log.headcount;
                        if (log.siteName && !log.siteName.toLowerCase().includes("standby")) {
                          sitesWorked.add(log.siteName);
                        }
                      }
                    });

                    return (
                      <tr key={team.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        {/* Contractor Team Sticky Column */}
                        <td className="py-2.5 px-3 sticky left-0 bg-white dark:bg-slate-900 z-10 font-bold border-r border-slate-200 dark:border-slate-800">
                          <div
                            onClick={() =>
                              handleOpenDossier(
                                {
                                  id: team.name,
                                  name: team.name,
                                  employeeCode: team.code,
                                  category: "CONTRACTOR_TEAM",
                                  companyUnit: "STANDARD_ROOFS",
                                  attendances: [],
                                },
                                true
                              )
                            }
                            className="truncate max-w-[170px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer flex items-center justify-between"
                            title="Click to view full Contractor Dossier"
                          >
                            <span className="truncate">{team.name}</span>
                            <History size={11} className="text-slate-400 shrink-0 ml-1" />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {team.code} • {team.role}
                          </span>
                        </td>

                        {/* 1..31 Day Columns */}
                        {daysInMonth.map((d) => {
                          const log = contractorLogs.find(
                            (c) => c.contractorTeamName === team.name && c.date.split("T")[0] === d.fullDate
                          );
                          const hasWork = log && log.headcount > 0;
                          const isAbsent =
                            log &&
                            (log.headcount === 0 ||
                              log.siteWorkStatus?.includes("Absent") ||
                              log.siteWorkStatus?.includes("No Work"));
                          const isHalf = log && log.siteWorkStatus?.includes("Half");

                          return (
                            <td
                              key={d.dayNum}
                              onClick={() => {
                                setSelectedContractorCell({
                                  teamName: team.name,
                                  date: d.fullDate,
                                  dayNum: d.dayNum,
                                  headcount: log?.headcount ?? 4,
                                  siteName: log?.siteName || "Ravichandran Chennai",
                                  siteWorkStatus: log?.siteWorkStatus || "Fabrication Work",
                                  workerBreakdown: log?.workerBreakdown || "",
                                  remarks: log?.remarks || "",
                                  status: log ? (log.headcount > 0 ? "P" : "A") : "P",
                                });
                              }}
                              className={`py-1.5 px-0.5 text-center border-r border-slate-100 dark:border-slate-800/40 cursor-pointer hover:ring-2 hover:ring-blue-400 transition ${
                                d.fullDate === selectedDate ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                              }`}
                              title={
                                log
                                  ? `${team.name} • ${d.fullDate}\n${log.siteName || "Site"} (${log.headcount} Labours)\nWork: ${log.siteWorkStatus || "Active"}`
                                  : `${team.name} • ${d.fullDate} (Unmarked) - Click to log`
                              }
                            >
                              <span
                                className={`inline-flex items-center justify-center w-7 h-6 rounded-md font-bold transition ${
                                  hasWork
                                    ? "bg-emerald-600 text-white shadow-2xs text-[10px] font-extrabold"
                                    : isAbsent
                                    ? "bg-rose-500 text-white shadow-2xs text-[10px]"
                                    : isHalf
                                    ? "bg-amber-500 text-white shadow-2xs text-[10px]"
                                    : "bg-slate-100/60 text-slate-300 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700 text-[10px]"
                                }`}
                              >
                                {hasWork ? `${log.headcount}L` : isAbsent ? "A" : isHalf ? "H" : "—"}
                              </span>
                            </td>
                          );
                        })}

                        {/* Right Fixed Summary Columns */}
                        <td className="w-14 min-w-[56px] py-2 px-1 text-center font-bold text-emerald-600 tabular-nums bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                          {activeDays}d
                        </td>
                        <td className="w-16 min-w-[64px] py-2 px-1 text-center font-bold text-sky-600 tabular-nums bg-white dark:bg-slate-900">
                          {activeDays}
                        </td>
                        <td className="w-14 min-w-[56px] py-2 px-1 text-center font-bold text-amber-500 tabular-nums bg-white dark:bg-slate-900">
                          0
                        </td>
                        <td className="w-16 min-w-[60px] py-2 px-1 text-center font-bold text-rose-500 tabular-nums bg-white dark:bg-slate-900">
                          {daysInMonth.length - activeDays}
                        </td>
                        <td className="w-16 min-w-[64px] py-2 px-1 text-center font-bold text-amber-600 tabular-nums bg-white dark:bg-slate-900">
                          {contractorLogs
                            .filter((c) => c.contractorTeamName === team.name)
                            .reduce((acc, curr) => acc + (Number((curr as any).otHours) || 0), 0)}h
                        </td>
                        <td className="w-20 min-w-[80px] py-2 px-2 text-center font-black text-blue-700 dark:text-blue-300 tabular-nums bg-slate-50 dark:bg-slate-900 sticky right-0 z-20 border-l border-slate-200 dark:border-slate-700 shadow-sm">
                          {totalManDays}L
                        </td>
                      </tr>
                    );
                  })
                ) : tabEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={daysInMonth.length + 9} className="py-14 text-center">
                      {fetchError ? (
                        <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
                          <p className="text-xs font-bold">{fetchError}</p>
                          <button
                            type="button"
                            onClick={fetchAttendance}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Retry Attendance Grid
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-400 font-semibold text-sm">
                          No personnel profiles found matching current filters.
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  tabEmployees.map((emp) => {
                  const isOffice = emp.category === "OFFICE_STAFF";
                  let pTotal = 0;
                  let hTotal = 0;
                  let p1hTotal = 0;
                  let p1hMorningTotal = 0;
                  let p1hEveningTotal = 0;
                  let plTotal = 0;
                  let halfPaidPlTotal = 0;
                  let upTotal = 0;
                  let aTotal = 0;
                  let lTotal = 0;
                  let otHoursTotal = 0;
                  let permMinutesTotal = 0;

                  const attList = Array.isArray(emp.attendances) ? emp.attendances : [];

                  // Pre-calculate sums with Separate Rules:
                  // Office: Sunday auto-marked L if no record.
                  // Labours: Sunday is NOT auto-marked L. If no record, null.
                  daysInMonth.forEach((d) => {
                    const att = attList.find((a) => {
                      if (!a || !a.date) return false;
                      const dateStr = typeof a.date === "string" ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0];
                      return dateStr === d.fullDate;
                    });
                    const status = att ? att.status : isOffice && d.isSunday ? "L" : null;

                    if (status === "P") pTotal++;
                    else if (status === "1H") {
                      p1hTotal++;
                      if (att?.permissionSlot === "EVENING") p1hEveningTotal++;
                      else p1hMorningTotal++;
                    } else if (status === "H") hTotal++;
                    else if (status === "PL") {
                      const isHalf = Number(att?.permissionHours) === 0.5 || (att?.workNotes && att?.workNotes.includes("HALF_PAID"));
                      if (isHalf) halfPaidPlTotal++;
                      else plTotal++;
                    } else if (status === "UP") upTotal++;
                    else if (status === "A") aTotal++;
                    else if (status === "L") lTotal++;

                    if (att?.otHours) otHoursTotal += Number(att.otHours);
                    const pm = Number((att as any)?.permissionMinutes || 0);
                    if (pm > 0) permMinutesTotal += pm;
                    else if (status === "1H") permMinutesTotal += 60;
                  });

                  // Net Payable Days & Live Mid-Month Projection:
                  // Office = marked (P + 1H + PL + 0.5*H + 0.5*halfPaidPl) + remaining unmarked working days
                  // Labour = P + 1H + (0.5 * H)
                  const markedPayableSoFar = isOffice
                    ? pTotal + p1hTotal + plTotal + hTotal * 0.5 + halfPaidPlTotal * 0.5
                    : pTotal + p1hTotal + hTotal * 0.5;
                  const markedDateSet = new Set(
                    attList
                      .filter((a) => a && a.date)
                      .map((a) =>
                        typeof a.date === "string"
                          ? a.date.split("T")[0]
                          : new Date(a.date).toISOString().split("T")[0]
                      )
                  );
                  const remainingScheduledDays = isOffice
                    ? daysInMonth.filter(
                        (d) =>
                          d.fullDate > todayISO &&
                          !d.isSunday &&
                          !d.isUnpaidShutdown &&
                          !markedDateSet.has(d.fullDate)
                      ).length
                    : 0;
                  const netPayableDays = isOffice
                    ? Math.min(totalWorkingDaysInMonth, markedPayableSoFar + remainingScheduledDays)
                    : markedPayableSoFar;

                  return (
                    <tr key={emp.id} className="h-11 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Fixed Left Column (Clickable to open Dossier) */}
                      <td className="py-2 px-3.5 sticky left-0 bg-white dark:bg-slate-900 z-20 min-w-[190px] font-bold border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)]">
                        <div
                          onClick={() => handleOpenDossier(emp)}
                          className="truncate max-w-[170px] text-[14px] font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 cursor-pointer flex items-center justify-between"
                          title="Click to view full Tenure Dossier"
                        >
                          <span className="truncate">{emp.name}</span>
                          <History size={13} className="text-slate-400 opacity-60 shrink-0 ml-1.5" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-slate-400 font-mono font-medium">
                            {emp.employeeCode}
                          </span>
                          {otHoursTotal > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-violet-100 text-violet-700">
                              +{otHoursTotal}h OT
                            </span>
                          )}
                          {permMinutesTotal > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700">
                              {permMinutesTotal >= 60
                                ? `${Math.floor(permMinutesTotal / 60)}h${permMinutesTotal % 60 ? `${permMinutesTotal % 60}m` : ""} Perm`
                                : `${permMinutesTotal}m Perm`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 1..31 Clickable Day Cells */}
                      {daysInMonth.map((d) => {
                        const att = attList.find((a) => {
                          if (!a || !a.date) return false;
                          const dateStr = typeof a.date === "string" ? a.date.split("T")[0] : new Date(a.date).toISOString().split("T")[0];
                          return dateStr === d.fullDate;
                        });
                        const status = att ? att.status : isOffice && d.isSunday ? "L" : null;
                        const isEve = att?.permissionSlot === "EVENING";

                        return (
                          <td
                            key={d.dayNum}
                            onClick={() => {
                              const savedNote = att?.permissionNote || att?.workNotes || att?.remarks || "";
                              const currentSt = (status as any) || "P";
                              setCellEditTarget({
                                employee: emp,
                                date: d.fullDate,
                                dayNum: d.dayNum,
                                currentStatus: currentSt,
                                currentSite: att?.siteName,
                                currentNote: savedNote,
                              });
                              setCellEditStatus(currentSt);
                              setSiteInput(att?.siteName || (isOffice ? "Headquarters Office" : "SSM School"));
                              setPermissionInput(savedNote);
                              setPermSlotInput(isEve ? "EVENING" : "MORNING");
                              setPermTimeInput(att?.permissionTime || "");
                              setOtHoursInput(att?.otHours || 0);
                              setOtTimeRangeInput(att?.otTimeRange || "");
                              setOtReasonInput(att?.otReason || "");
                              setInTimeInput((att as any)?.inTime || "09:00");
                              setOutTimeInput((att as any)?.outTime || "19:30");
                              const initPermMins = Number((att as any)?.permissionMinutes || (currentSt === "1H" ? 60 : 0));
                              setPermMinutesInput(initPermMins);
                              setPermStatusInput((att as any)?.permissionStatus || "");
                              setOtStatusInput((att as any)?.otApprovalStatus || "");
                              setCellModalTab(initPermMins > 0 && !(att?.otHours && att.otHours > 0) ? "permission" : "ot");
                            }}
                            className={`w-[46px] min-w-[46px] h-[52px] py-1 px-0.5 text-center align-bottom font-black cursor-pointer transition select-none border-r border-slate-100 dark:border-slate-800/50 hover:bg-blue-50/70 dark:hover:bg-blue-900/30 ${
                              d.isSunday && isOffice
                                ? "bg-slate-100/60 dark:bg-slate-800/60"
                                : d.fullDate === selectedDate
                                ? "ring-2 ring-blue-500/50"
                                : ""
                            }`}
                            title={`${emp.name} - ${d.fullDate}: ${status || "Pending"} ${
                              att?.siteName ? `[${att.siteName}]` : ""
                            } ${att?.permissionNote ? `(1H: ${isEve ? "Eve" : "Mrg"} - ${att.permissionNote})` : ""} ${
                              att?.otHours ? `(OT: +${att.otHours}h)` : ""
                            }`}
                          >
                            <div className="h-full flex flex-col items-center justify-end gap-0.5">
                              {(status === "1H" || Number((att as any)?.permissionMinutes || 0) > 0 || Number(att?.otHours || 0) > 0) && (
                                <div className="flex flex-col items-center gap-0.5">
                                  {Number(att?.otHours || 0) > 0 && (
                                    <span
                                      className="text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs whitespace-nowrap"
                                      title={`OT: +${att?.otHours}h`}
                                    >
                                      OT {att?.otHours}h
                                    </span>
                                  )}
                                  {(status === "1H" || Number((att as any)?.permissionMinutes || 0) > 0) && (
                                    <span
                                      className="text-[10px] leading-none font-semibold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs whitespace-nowrap"
                                      title={`Permission: ${(att as any)?.permissionMinutes || 60}m`}
                                    >
                                      {Number((att as any)?.permissionMinutes || 0) > 0
                                        ? `Perm ${Number((att as any)?.permissionMinutes) >= 60 ? `${Math.round((Number((att as any)?.permissionMinutes) / 60) * 10) / 10}h` : `${(att as any)?.permissionMinutes}m`}`
                                        : isEve ? "Perm 1hE" : "Perm 1hM"}
                                    </span>
                                  )}
                                </div>
                              )}
                              <span
                                className={`min-w-[28px] h-6 px-1 rounded-md inline-flex items-center justify-center font-black transition ${
                                  status === "P" || status === "1H"
                                    ? "bg-emerald-500 text-white shadow-2xs text-[10px]"
                                    : status === "H"
                                    ? "bg-amber-400 text-white shadow-2xs text-[10px]"
                                    : status === "PL"
                                    ? "bg-teal-600 text-white shadow-2xs text-[9px] font-extrabold tracking-tight"
                                    : status === "UP"
                                    ? "bg-slate-600 text-white shadow-2xs text-[9px] font-extrabold tracking-tight"
                                    : status === "A"
                                    ? "bg-rose-500 text-white shadow-2xs text-[10px]"
                                    : status === "L"
                                    ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]"
                                    : "bg-slate-100/60 text-slate-300 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-700 text-[10px]"
                                }`}
                              >
                                {status === "1H" ? "P" : status || "—"}
                              </span>
                            </div>
                          </td>
                        );
                      })}

                      {/* Right Fixed Summary Counts */}
                      <td className="w-14 min-w-[56px] py-1 px-1 text-center font-bold text-emerald-600 tabular-nums bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                        {pTotal}
                      </td>
                      <td className="w-16 min-w-[64px] py-1 px-1 text-center font-bold text-sky-600 tabular-nums bg-white dark:bg-slate-900" title={`Total: ${p1hTotal} (Mrg: ${p1hMorningTotal}, Eve: ${p1hEveningTotal})`}>
                        <div>{p1hTotal}</div>
                        {p1hTotal > 0 && (
                          <div className="text-[8.5px] text-slate-400 font-normal">
                            {p1hMorningTotal}M/{p1hEveningTotal}E
                          </div>
                        )}
                      </td>
                      <td className="w-14 min-w-[56px] py-1 px-1 text-center font-bold text-amber-500 tabular-nums bg-white dark:bg-slate-900">
                        {hTotal}
                      </td>
                      {activeTab === "office" && (
                        <td className="w-14 min-w-[56px] py-1 px-1 text-center font-bold text-teal-600 tabular-nums bg-white dark:bg-slate-900">
                          {plTotal + halfPaidPlTotal * 0.5}
                        </td>
                      )}
                      {activeTab === "office" && (
                        <td className="w-14 min-w-[56px] py-1 px-1 text-center font-bold text-slate-500 tabular-nums bg-white dark:bg-slate-900">
                          {upTotal}
                        </td>
                      )}
                      <td className="w-16 min-w-[60px] py-1 px-1 text-center font-bold text-rose-500 tabular-nums bg-white dark:bg-slate-900">
                        {aTotal}
                      </td>
                      <td className="w-16 min-w-[64px] py-1 px-1 text-center font-bold text-amber-600 tabular-nums bg-white dark:bg-slate-900">
                        {otHoursTotal > 0 ? `${otHoursTotal}h` : "—"}
                      </td>
                      <td className="w-16 min-w-[68px] py-1 px-1 text-center font-bold text-violet-700 tabular-nums bg-white dark:bg-slate-900">
                        {permMinutesTotal > 0
                          ? permMinutesTotal >= 60
                            ? `${Math.floor(permMinutesTotal / 60)}h${permMinutesTotal % 60 ? ` ${permMinutesTotal % 60}m` : ""}`
                            : `${permMinutesTotal}m`
                          : "—"}
                      </td>
                      {activeTab === "office" && (
                        <td className="w-14 min-w-[56px] py-1 px-1 text-center font-bold text-slate-500 tabular-nums bg-white dark:bg-slate-900">
                          {lTotal}
                        </td>
                      )}
                      <td className="w-28 min-w-[112px] py-1 px-2 text-center font-black text-blue-700 dark:text-blue-300 tabular-nums bg-slate-50 dark:bg-slate-900 sticky right-0 z-20 border-l border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="leading-tight">
                          {isOffice ? `Payable: ${netPayableDays}` : `Worked: ${netPayableDays}d`}
                        </div>
                        {isOffice && remainingScheduledDays > 0 && (
                          <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 leading-tight whitespace-nowrap">
                            ({markedPayableSoFar} marked + {remainingScheduledDays} left)
                          </div>
                        )}
                        {!isOffice && (
                          <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 leading-tight whitespace-nowrap">
                            × {formatINR(Number((emp as any).dailyWage || (emp as any).baseWage || 0))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* 5. MODAL: CELL EDIT POPOVER (FOR MONTHLY MATRIX) */}
      {cellEditTarget && (() => {
        const toMins = (hhmm: string) => {
          const [h, m] = (hhmm || "09:00").split(":").map(Number);
          return (h || 0) * 60 + (m || 0);
        };
        const fmtDur = (mins: number) => {
          if (mins <= 0) return "0m";
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          if (h > 0 && m > 0) return `${h}h ${m}m`;
          if (h > 0) return `${h}h`;
          return `${m}m`;
        };
        const inM = toMins(inTimeInput);
        const outM = toMins(outTimeInput);
        const lateMinutes = inM > 540 ? Math.min(180, inM - 540) : 0;
        const morningOtMins = inM < 540 ? 540 - inM : 0;
        const eveningOtMins = outM > 1170 ? outM - 1170 : 0;
        const detectedOtMinutes = morningOtMins + eveningOtMins;
        const permChips = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];

        return (
        <ViewportPortal onBackdropClick={() => setCellEditTarget(null)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/70">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  {cellEditTarget.employee.name}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Date: <strong>{cellEditTarget.date}</strong> (Day {cellEditTarget.dayNum}) · Shift 09:00 AM – 07:30 PM
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCellEditTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Set Status</label>
              <div className="grid grid-cols-7 gap-1">
                {[
                  { key: "P", label: "P", desc: "Present (1.0)", bg: "bg-emerald-600 text-white" },
                  { key: "1H", label: "1H", desc: "1-Hr Perm (1.0)", bg: "bg-sky-600 text-white" },
                  { key: "H", label: "H", desc: "Half-Day (0.5)", bg: "bg-amber-500 text-white" },
                  { key: "PL", label: "PL", desc: "Paid Leave (1.0)", bg: "bg-teal-600 text-white" },
                  { key: "UP", label: "UP", desc: "Unpaid Leave (0.0)", bg: "bg-slate-600 text-white" },
                  { key: "A", label: "A", desc: "Absent (0.0)", bg: "bg-rose-600 text-white" },
                  { key: "L", label: "L", desc: "Sunday Off (0.0)", bg: "bg-slate-700 text-white" },
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setCellEditStatus(s.key as any)}
                    className={`py-2 rounded-xl font-black text-xs transition cursor-pointer flex flex-col items-center justify-center ${
                      cellEditStatus === s.key ? s.bg + " ring-2 ring-blue-500 shadow-sm" : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {/* In Time & Out Time Inputs */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    In Time (Shift 09:00 AM)
                  </label>
                  <input
                    type="time"
                    value={inTimeInput}
                    onChange={(e) => setInTimeInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-semibold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Out Time (Shift 07:30 PM)
                  </label>
                  <input
                    type="time"
                    value={outTimeInput}
                    onChange={(e) => setOutTimeInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-semibold text-xs"
                  />
                </div>
              </div>

              {/* Smart Late Login Detection (> 09:00 AM) */}
              {lateMinutes > 0 && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-rose-900">
                    Late check-in detected ({fmtDur(lateMinutes)}) — Is this an approved Permission?
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const rounded = Math.min(180, Math.max(15, Math.ceil(lateMinutes / 15) * 15));
                        setPermMinutesInput(rounded);
                        setPermStatusInput("PENDING");
                        setPermSlotInput("MORNING");
                        setCellModalTab("permission");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Yes, Mark Permission ({fmtDur(lateMinutes)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPermMinutesInput(0);
                        setPermStatusInput("UNAPPROVED_LATE");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 text-[10px] font-bold cursor-pointer"
                    >
                      No, Unapproved Late
                    </button>
                  </div>
                </div>
              )}

              {/* Smart Overtime Detection (< 09:00 AM or > 07:30 PM) */}
              {detectedOtMinutes > 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-900">
                    Extra shift time detected ({fmtDur(detectedOtMinutes)}) — Count as Overtime (OT)?
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const otHrs = Math.round((detectedOtMinutes / 60) * 100) / 100;
                        setOtHoursInput(otHrs);
                        setOtStatusInput("PENDING");
                        setOtTimeRangeInput(`${inTimeInput} - ${outTimeInput}`);
                        if (!otReasonInput) setOtReasonInput(`Extended shift (${fmtDur(detectedOtMinutes)})`);
                        setCellModalTab("ot");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold cursor-pointer"
                    >
                      Yes, Add OT ({fmtDur(detectedOtMinutes)})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtHoursInput(0);
                        setOtStatusInput("");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 text-[10px] font-bold cursor-pointer"
                    >
                      No, Regular Shift
                    </button>
                  </div>
                </div>
              )}

              {/* Site Selector for Labours */}
              {cellEditTarget.employee.category !== "OFFICE_STAFF" && (
                <div className="pt-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Location</label>
                  <select
                    value={siteInput}
                    onChange={(e) => setSiteInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  >
                    {COMMON_SITES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2 DEDICATED TABS: Overtime (OT) | Permission (15m - 3h) */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCellModalTab("ot")}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    cellModalTab === "ot"
                      ? "bg-white dark:bg-slate-900 text-amber-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Overtime (OT) {otHoursInput > 0 ? `· +${otHoursInput}h` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setCellModalTab("permission")}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    cellModalTab === "permission"
                      ? "bg-white dark:bg-slate-900 text-violet-700 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Permission (15m–3h) {permMinutesInput > 0 ? `· ${fmtDur(permMinutesInput)}` : ""}
                </button>
              </div>

              {cellModalTab === "ot" ? (
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                      <Timer size={14} className="text-amber-600" />
                      <span>Overtime (OT) Hours</span>
                    </label>
                    <span className="font-mono text-xs font-black text-amber-700 bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded-md">
                      {otHoursInput > 0 ? `+${otHoursInput} Hours` : "No OT"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 8].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          setOtHoursInput(h);
                          if (h > 0 && !otStatusInput) setOtStatusInput("PENDING");
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          otHoursInput === h
                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                            : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700 hover:bg-amber-100/50"
                        }`}
                      >
                        {h === 0 ? "None" : h === 0.5 ? "+30m" : `+${h}h`}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        setInTimeInput("08:00");
                        setOtHoursInput(1);
                        setOtTimeRangeInput("08:00 AM - 09:00 AM");
                        setOtStatusInput("PENDING");
                        setOtValidationError("");
                      }}
                      className="px-2 py-0.5 rounded-md bg-white text-amber-900 text-[10px] font-bold border border-amber-300 cursor-pointer"
                    >
                      Before 9:00 AM (+1h)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOutTimeInput("20:30");
                        setOtHoursInput(1);
                        setOtTimeRangeInput("07:30 PM - 08:30 PM");
                        setOtStatusInput("PENDING");
                        setOtValidationError("");
                      }}
                      className="px-2 py-0.5 rounded-md bg-white text-amber-900 text-[10px] font-bold border border-amber-300 cursor-pointer"
                    >
                      After 7:30 PM (+1h)
                    </button>
                  </div>
                  {otHoursInput > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">OT Time Slot</label>
                        <input
                          type="text"
                          placeholder="e.g. 07:30 PM - 09:30 PM"
                          value={otTimeRangeInput}
                          onChange={(e) => setOtTimeRangeInput(e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-amber-800 font-bold mb-0.5">OT Reason *</label>
                        <input
                          type="text"
                          placeholder="Work done during OT"
                          value={otReasonInput}
                          onChange={(e) => {
                            setOtReasonInput(e.target.value);
                            if (e.target.value.trim()) setOtValidationError("");
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs"
                        />
                      </div>
                    </div>
                  )}
                  {otValidationError && (
                    <div className="text-[11px] text-rose-600 font-bold bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                      {otValidationError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-violet-900 flex items-center gap-1.5 text-xs">
                      <Clock size={14} className="text-violet-600" />
                      <span>Permission (15m – 3h)</span>
                    </label>
                    <span className="font-mono text-xs font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">
                      {permMinutesInput > 0 ? fmtDur(permMinutesInput) : "None"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {permChips.map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setPermMinutesInput(mins);
                          setPermStatusInput(mins > 0 ? "PENDING" : "");
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                          permMinutesInput === mins
                            ? "bg-violet-600 text-white border-violet-700 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-violet-100/60"
                        }`}
                      >
                        {mins === 0 ? "None" : fmtDur(mins)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPermSlotInput("MORNING")}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        permSlotInput === "MORNING" ? "bg-sky-600 text-white border-sky-700" : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Morning Slot
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermSlotInput("EVENING")}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        permSlotInput === "EVENING" ? "bg-cyan-600 text-white border-cyan-700" : "bg-white text-slate-700 border-slate-200"
                      }`}
                    >
                      Evening Slot
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Permission reason (e.g. Bank work, Doctor visit)"
                    value={permissionInput}
                    onChange={(e) => setPermissionInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                </div>
              )}
            </div>

            <div className="shrink-0 px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCellEditTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (otHoursInput > 0 && !otReasonInput.trim()) {
                    setOtValidationError("OT Reason is mandatory to explain overtime work");
                    setCellModalTab("ot");
                    return;
                  }
                  setOtValidationError("");
                  handleMarkStatus(
                    cellEditTarget.employee.id,
                    cellEditStatus,
                    siteInput,
                    cellEditTarget.date,
                    permissionInput,
                    permSlotInput,
                    permTimeInput,
                    otHoursInput,
                    otTimeRangeInput,
                    otReasonInput,
                    {
                      inTime: inTimeInput,
                      outTime: outTimeInput,
                      permissionMinutes: permMinutesInput,
                      permissionStatus: permStatusInput || undefined,
                      otApprovalStatus: otHoursInput > 0 ? otStatusInput || "PENDING" : undefined,
                    }
                  );
                  setCellEditTarget(null);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </ViewportPortal>
        );
      })()}

      {/* 6. MODAL: 1-HOUR PERMISSION PROMPT IN DAILY VIEW */}
      {permPromptTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Timer className="text-cyan-600" size={16} />
                Log 1-Hour Permission [1H]
              </h4>
              <button
                type="button"
                onClick={() => setPermPromptTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                1-Hour permission grants <strong>1.0 full day attendance credit</strong> with an official time slip record.
              </p>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Permission Reason / Note
                </label>
                <input
                  type="text"
                  value={permissionInput}
                  onChange={(e) => setPermissionInput(e.target.value)}
                  placeholder="e.g. Doctor checkup, Morning delay, Bank work"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPermPromptTarget(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleMarkStatus(
                      permPromptTarget.employeeId,
                      "1H",
                      permPromptTarget.siteName,
                      selectedDate,
                      permissionInput || "1-Hour Permission"
                    );
                    setPermPromptTarget(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs"
                >
                  Confirm [1H]
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: EMPLOYEE LEAVE REQUESTS & ESS DRAWER (FOR HR) */}
      {showLeaveDrawer && (
        <ViewportPortal variant="drawer" onBackdropClick={() => setShowLeaveDrawer(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl p-5 sm:p-6 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={18} />
                  <span>Leaves & Workforce Approvals</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Manage Planned (PL) & Unplanned (UP) leaves, apply on behalf of staff, and view ESS credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveDrawer(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close Drawer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Navigation Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setLeaveDrawerTab("approvals")}
                className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  leaveDrawerTab === "approvals"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>Pending Approvals</span>
                {leaveRequests.filter((r) => r.status === "PENDING").length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-black text-[10px]">
                    {leaveRequests.filter((r) => r.status === "PENDING").length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setLeaveDrawerTab("apply")}
                className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  leaveDrawerTab === "apply"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>+ Apply Leave (HR)</span>
              </button>
              <button
                type="button"
                onClick={() => setLeaveDrawerTab("ess")}
                className={`flex-1 py-1.5 px-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  leaveDrawerTab === "ess"
                    ? "bg-white dark:bg-slate-900 text-blue-600 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>ESS & Role Logins (10)</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {/* TAB 1: PENDING APPROVALS */}
              {leaveDrawerTab === "approvals" && (
                <div className="space-y-3">
                  {leaveRequests.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-xs">
                      No leave requests submitted yet.
                    </div>
                  ) : (
                    leaveRequests
                      .slice()
                      .sort((a: any, b: any) => {
                        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
                        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
                        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                      })
                      .map((req: any) => (
                      <div
                        key={req.id}
                        className={`p-4 rounded-2xl border transition ${
                          req.status === "PENDING"
                            ? "border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-300/60 shadow-xs"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                        } space-y-2.5`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="text-sm text-slate-900 dark:text-slate-100">
                              {req.employee?.name || "Employee"}
                            </strong>
                            <span className="text-xs font-mono text-slate-400 ml-2">
                              ({req.employee?.employeeCode || req.employee?.empCode || "EMP"})
                            </span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                              req.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : req.status === "REJECTED"
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                : req.status === "PENDING_HR"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"
                            }`}
                          >
                            {req.status === "PENDING_TEAM_LEAD" || req.status === "PENDING"
                              ? "1. Team Lead Pending"
                              : req.status === "PENDING_HR"
                              ? "1. Team Lead ✓ → 2. HR Pending"
                              : req.status}
                          </span>
                        </div>

                        {/* Visual 2-Tier Pipeline Indicator */}
                        <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-semibold">
                          <span className={`px-2 py-0.5 rounded border ${req.teamLeadStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : req.teamLeadStatus === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                            1. {req.assignedTeamLead || "Team Lead"} {req.teamLeadStatus === "APPROVED" ? "✓" : req.teamLeadStatus === "REJECTED" ? "✕" : "⏳"}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className={`px-2 py-0.5 rounded border ${req.hrStatus === "APPROVED" || req.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                            2. HR Final (Monika) {req.hrStatus === "APPROVED" || req.status === "APPROVED" ? "✓" : "Pending"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Leave / Request Type</span>
                            <strong className="text-slate-800 dark:text-slate-200">
                              {req.leaveCategory === "PERMISSION_1H"
                                ? `1-Hr Permission (${req.dayType === "EVENING" ? "Evening" : "Morning"})`
                                : req.leaveCategory === "GENERAL_REQUEST"
                                ? "General / Shift Request"
                                : req.leaveCategory === "PLANNED"
                                ? "Planned Leave"
                                : req.leaveCategory === "SICK"
                                ? "Sick Leave"
                                : req.leaveCategory === "UNPLANNED"
                                ? "Unplanned Leave"
                                : req.leaveCategory === "EMERGENCY"
                                ? "Emergency Leave"
                                : "Leave Request"}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Dates / Days</span>
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">
                              {req.startDate?.split("T")[0]} {req.startDate?.split("T")[0] !== req.endDate?.split("T")[0] ? `to ${req.endDate?.split("T")[0]}` : ""} ({req.leaveCategory === "PERMISSION_1H" ? "1-Hour" : `${req.daysCount || req.totalDays || 1}d`})
                            </strong>
                          </div>
                        </div>

                        <div className="text-xs">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Reason / Note</span>
                          <p className="text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                            {req.reason ? `"${req.reason}"` : <span className="text-slate-400 not-italic">No reason provided (Optional)</span>}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLeave(req)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              title="Edit leave details and re-sync attendance"
                            >
                              <Edit3 size={11} className="text-blue-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLeave(req.id, req.employee?.name || "Employee")}
                              className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              title="Delete leave request and move to Recycle Bin"
                            >
                              <Trash2 size={11} className="text-rose-500" />
                              <span>Delete</span>
                            </button>
                          </div>

                          {(req.status === "PENDING" || req.status === "PENDING_TEAM_LEAD" || req.status === "PENDING_HR") && (
                            <div className="flex items-center gap-2">
                              {(req.status === "PENDING" || req.status === "PENDING_TEAM_LEAD") && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const res = await fetch("/api/attendance", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "team-lead-approve", requestId: req.id }),
                                    });
                                    if (res.ok) {
                                      showToast("Stage 1 Team Lead approved — routed to HR");
                                      fetchAttendance();
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition cursor-pointer"
                                >
                                  Approve (Stage 1)
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRejectLeave(req.id)}
                                className="px-3 py-1 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300 text-xs font-bold transition cursor-pointer shadow-2xs"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveLeave(req.id)}
                                className="px-4 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-sm flex items-center gap-1"
                              >
                                <span>Approve</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: APPLY LEAVE (HR ON BEHALF OF STAFF) */}
              {leaveDrawerTab === "apply" && (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Apply Leave on Behalf of Employee
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Select Office Employee *
                    </label>
                    <select
                      value={applyLeaveEmpId}
                      onChange={(e) => setApplyLeaveEmpId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees
                        .filter((e) => e.category === "OFFICE_STAFF")
                        .map((emp) => {
                          const isInvi =
                            emp.companyUnit === "INVI_CREATION" ||
                            (emp.employeeCode && emp.employeeCode.toLowerCase().startsWith("invi"));
                          return (
                            <option key={emp.id} value={emp.id}>
                              {isInvi
                                ? `${emp.employeeCode} • ${emp.name}`
                                : `${emp.employeeCode} • ${emp.name}${
                                    emp.designation || emp.role ? ` (${emp.designation || emp.role})` : ""
                                  } - Standard Roofs`}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Leave Category *
                      </label>
                      <select
                        value={applyLeaveCategory}
                        onChange={(e) => setApplyLeaveCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="PLANNED">Planned Leave</option>
                        <option value="UNPLANNED">Unplanned Leave</option>
                        <option value="SICK">Sick Leave</option>
                        <option value="EMERGENCY">Emergency Leave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Day Duration *
                      </label>
                      <select
                        value={applyLeaveDayType}
                        onChange={(e) => setApplyLeaveDayType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="FULL_DAY">Full-Day (1.0 Day)</option>
                        <option value="HALF_DAY">Half-Day (0.5 Day)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={applyLeaveStartDate}
                        onChange={(e) => setApplyLeaveStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={applyLeaveEndDate}
                        onChange={(e) => setApplyLeaveEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Reason / Note (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Family wedding, medical rest, personal travel (optional)"
                      value={applyLeaveReason}
                      onChange={(e) => setApplyLeaveReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={applyLeaveSubmitting}
                      onClick={() => handleCreateLeave(false)}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {applyLeaveSubmitting ? "Submitting..." : "Submit Leave Request (Pending HR Approval)"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: ESS PORTAL LOGINS & ROLE CREDENTIALS (4-TIER RBAC) */}
              {leaveDrawerTab === "ess" && (
                <div className="space-y-3.5">
                  {/* 4-Tier RBAC Reference Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                        Tier 1: Super Admin
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 block text-[11px] truncate">
                        admin@standardroofs.com
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">Password: admin123</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                        Tier 2: HR Dept (Monika)
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 block text-[11px] truncate">
                        sr002 / hr@standardroofs.com
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">Password: employee123</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                        Tier 3: Accountant (Periyasamy)
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 block text-[11px] truncate">
                        sr003 / accountant@standardroofs.com
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">Password: employee123</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                        Tier 4: Office ESS (10)
                      </span>
                      <strong className="text-slate-800 dark:text-slate-200 block text-[11px] truncate">
                        SR001 – SR010
                      </strong>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">Unique (SR001@2026…)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 block">
                        Standard Roofs Employee Self-Service (ESS)
                      </span>
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        Individual Unique Passwords Assigned &middot; Login with Employee ID or Email
                      </span>
                    </div>
                    <a
                      href="/my-attendance"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      Open ESS Portal ↗
                    </a>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                    {[
                      { code: "SR001", name: "Thiyagu", email: "sr001@standardroofs.com", role: "Supervisor", unit: "Standard Roofs", pass: "SR001@2026" },
                      { code: "SR002", name: "Monika", email: "sr002@standardroofs.com", role: "HR", unit: "Standard Roofs", pass: "SR002@2026" },
                      { code: "SR003", name: "Periyasamy", email: "sr003@standardroofs.com", role: "Accountant", unit: "Standard Roofs", pass: "SR003@2026" },
                      { code: "SR004", name: "Sabari", email: "sr004@standardroofs.com", role: "Marketing Admin", unit: "Standard Roofs", pass: "SR004@2026" },
                      { code: "SR005", name: "Sivakumar", email: "sr005@standardroofs.com", role: "Manager", unit: "Standard Roofs", pass: "SR005@2026" },
                      { code: "SR006", name: "Sri Manikandan", email: "sr006@standardroofs.com", role: "AI Engineer", unit: "Standard Roofs", pass: "SR006@2026" },
                      { code: "SR007", name: "Kavinkumar", email: "sr007@standardroofs.com", role: "AI Prompt Engineer", unit: "Standard Roofs", pass: "SR007@2026" },
                      { code: "SR008", name: "Adhi", email: "sr008@standardroofs.com", role: "AI Prompt Engineer", unit: "Standard Roofs", pass: "SR008@2026" },
                      { code: "SR009", name: "Gowri", email: "sr009@standardroofs.com", role: "Senior Manager", unit: "Standard Roofs", pass: "SR009@2026" },
                      { code: "SR010", name: "Kaviya", email: "sr010@standardroofs.com", role: "Data Ops", unit: "Standard Roofs", pass: "SR010@2026" },
                    ].map((staff) => (
                      <div key={staff.code} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{staff.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold">
                              {staff.code}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-50 text-blue-700">
                              {staff.unit}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                            <span>{staff.email}</span>
                            <span>&bull;</span>
                            <span className="font-sans text-slate-600 dark:text-slate-400">{staff.role}</span>
                            <span>&bull;</span>
                            <span className="text-slate-400">Password:</span>
                            <code className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold font-mono">
                              {staff.pass}
                            </code>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`Login: ${staff.email} (or ${staff.code})\nPassword: ${staff.pass}`);
                              showToast(`Copied ID & Password for ${staff.name}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                            title="Copy Login ID and Password"
                          >
                            <Copy size={11} />
                            <span>Copy ID & Password</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChangeStaffPassword(staff.email, staff.name)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                            title="Change password for this staff member"
                          >
                            <KeyRound size={11} className="text-amber-500" />
                            <span>Change</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ViewportPortal>
      )}

      {/* 8. MODAL: COMPANY HOLIDAY CALENDAR */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Palmtree className="text-amber-500" size={18} />
                  Company Holiday Calendar ({selectedYear})
                </h3>
                <p className="text-xs text-slate-500">
                  Standard Roofs official declared leaves & Tamil Nadu public holidays
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHolidayModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* List of current holidays */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100 block">{h.name}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{h.date.split("T")[0]}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                    Official [L]
                  </span>
                </div>
              ))}
            </div>

            {/* Add Holiday / Shutdown Form */}
            <form onSubmit={handleSaveHoliday} className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3 text-xs">
              <strong className="block text-slate-800 dark:text-slate-200">Declare Holiday or Company Shutdown Day</strong>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 font-semibold">Title / Occasion</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali, Company Shutdown, Pongal"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Holiday / Day-Off Category</label>
                <select
                  value={holidayForm.holidayType}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holidayType: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="PL">Paid Public Holiday [PL] (1.0 Day Paid)</option>
                  <option value="UP">Company Unpaid Off Day / Shutdown [UP] (0.0 Day Pay, worked = 1.0 Day P)</option>
                  <option value="HALF_PAID">Half-Day Paid Holiday [HALF_PAID] (0.5 Day Paid)</option>
                </select>
                {holidayForm.holidayType === "UP" && (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    Staff who do not work will be marked UP (0.0 payable days). Any staff member who attends will be credited P (1.0 paid).
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="markStaff"
                  checked={holidayForm.markStaff}
                  onChange={(e) => setHolidayForm({ ...holidayForm, markStaff: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="markStaff" className="text-slate-600 dark:text-slate-300 cursor-pointer">
                  Auto-mark across active workforce in 1 click
                </label>
              </div>

              <button
                type="submit"
                className={`w-full py-2 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer ${
                  holidayForm.holidayType === "UP" ? "bg-slate-700 hover:bg-slate-800" : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {holidayForm.holidayType === "UP"
                  ? "+ Mark Company Unpaid Off Day [UP]"
                  : "+ Declare Holiday & Auto-Mark"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: LOG CONTRACTOR TEAM DAILY SITE WORK */}
      {showContractorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users2 className="text-amber-500" size={18} />
                {contractorForm.id ? "Edit Contractor Work Log" : "New Contractor Team Daily Log"}
              </h3>
              <button
                type="button"
                onClick={() => setShowContractorModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveContractorLog} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contractor Team</label>
                <select
                  value={contractorForm.contractorTeamName}
                  onChange={(e) => setContractorForm({ ...contractorForm, contractorTeamName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden focus:border-blue-500"
                >
                  <option value="Nandeeshwaran Team">Nandeeshwaran Team (Fabrication & Welding)</option>
                  <option value="Contractor Sakthi">Contractor Sakthi (Roofing & Sheeting)</option>
                  <option value="Prashop Team">Prashop Team (Site Erection)</option>
                  <option value="Monier Suresh">Monier Suresh Team (Purlin Welding)</option>
                  <option value="Suthish Team">Suthish Team (Labour Support)</option>
                  <option value="Hydarali Team">Hydarali Team (Civil & Gutter Works)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={contractorForm.date}
                    onChange={(e) => setContractorForm({ ...contractorForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Location</label>
                  <select
                    value={contractorForm.siteName}
                    onChange={(e) => setContractorForm({ ...contractorForm, siteName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  >
                    {COMMON_SITES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Headcount (Labours)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={contractorForm.headcount}
                    onChange={(e) => setContractorForm({ ...contractorForm, headcount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Work Status</label>
                  <select
                    value={contractorForm.siteWorkStatus}
                    onChange={(e) => setContractorForm({ ...contractorForm, siteWorkStatus: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:outline-hidden"
                  >
                    <option value="Fabrication Work">Fabrication Work</option>
                    <option value="Purlin Work Welding">Purlin Work Welding</option>
                    <option value="Roofing Sheeting">Roofing Sheeting</option>
                    <option value="Rain Season Delay">Rain Season Delay</option>
                    <option value="No Work / Absent">No Work / Absent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Worker Breakdown (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Rajkumar-F, Mani-H, Selvam-H"
                  value={contractorForm.workerBreakdown}
                  onChange={(e) => setContractorForm({ ...contractorForm, workerBreakdown: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowContractorModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
                >
                  Save Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. UNIVERSAL EXCEL IMPORT MODAL */}
      <ExcelImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        moduleName="Workforce Attendance"
        templateColumns={[
          { key: "employeeCode", label: "Employee Code (e.g. SR001, 20001)", required: true },
          { key: "date", label: "Date (YYYY-MM-DD)", required: true },
          { key: "status", label: "Status (P, H, 1H, A, L)", required: true },
          { key: "siteName", label: "Site Location" },
          { key: "inTime", label: "In Time (Office)" },
          { key: "outTime", label: "Out Time (Office)" },
          { key: "dailyAdvance", label: "Daily Advance (₹)" },
        ]}
        onImportComplete={() => {
          showToast("Imported attendance records successfully");
          fetchAttendance();
        }}
      />

      {/* 11. MODAL: CONTRACTOR DAY CELL EDIT MODAL */}
      {selectedContractorCell && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users2 size={16} className="text-amber-500" />
                  {selectedContractorCell.teamName}
                </h4>
                <p className="text-[11px] text-slate-400">
                  Date: <strong>{selectedContractorCell.date}</strong> (Day {selectedContractorCell.dayNum})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContractorCell(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Quick Status Pills */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Quick Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedContractorCell({
                        ...selectedContractorCell,
                        status: "P",
                        headcount: selectedContractorCell.headcount > 0 ? selectedContractorCell.headcount : 4,
                        siteWorkStatus: "Fabrication Work",
                      })
                    }
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedContractorCell.headcount > 0 && selectedContractorCell.status === "P"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Check size={14} />
                    <span>P · Active Work</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedContractorCell({
                        ...selectedContractorCell,
                        status: "H",
                        headcount: 2,
                        siteWorkStatus: "Half-Day Site Work",
                      })
                    }
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedContractorCell.status === "H" || selectedContractorCell.siteWorkStatus?.includes("Half")
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <span>H · Half-Day</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedContractorCell({
                        ...selectedContractorCell,
                        status: "A",
                        headcount: 0,
                        siteWorkStatus: "Site Standby / No Work",
                      })
                    }
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedContractorCell.status === "A" || selectedContractorCell.headcount === 0
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <X size={14} />
                    <span>A · Standby / Off</span>
                  </button>
                </div>
              </div>

              {/* Headcount */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Labours Working (Headcount)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={selectedContractorCell.headcount}
                  onChange={(e) =>
                    setSelectedContractorCell({
                      ...selectedContractorCell,
                      headcount: Number(e.target.value) || 0,
                      status: Number(e.target.value) > 0 ? "P" : "A",
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-sm focus:outline-hidden"
                />
              </div>

              {/* Site Location */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Location</label>
                <select
                  value={selectedContractorCell.siteName}
                  onChange={(e) =>
                    setSelectedContractorCell({ ...selectedContractorCell, siteName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-hidden"
                >
                  {COMMON_SITES.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </div>

              {/* Site Work Status */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Site Work Status</label>
                <select
                  value={selectedContractorCell.siteWorkStatus}
                  onChange={(e) =>
                    setSelectedContractorCell({ ...selectedContractorCell, siteWorkStatus: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-hidden"
                >
                  <option value="Fabrication Work">Fabrication Work</option>
                  <option value="Purlin Work Welding">Purlin Work Welding</option>
                  <option value="Roof Sheeting">Roof Sheeting</option>
                  <option value="High-Roof Truss Erection">High-Roof Truss Erection</option>
                  <option value="Rain season / Standby">Rain season / Standby</option>
                  <option value="Site Standby / No Work">Site Standby / No Work</option>
                </select>
              </div>

              {/* Overtime (OT) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">OT Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="12"
                    placeholder="0"
                    value={selectedContractorCell.otHours || ""}
                    onChange={(e) =>
                      setSelectedContractorCell({
                        ...selectedContractorCell,
                        otHours: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">OT Time Slot</label>
                  <input
                    type="text"
                    placeholder="e.g. 7 PM - 10 PM"
                    value={selectedContractorCell.otTimeRange || ""}
                    onChange={(e) =>
                      setSelectedContractorCell({
                        ...selectedContractorCell,
                        otTimeRange: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Worker Breakdown / Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Worker Breakdown / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajkumar-F, Mani-H, Selvam-H"
                  value={selectedContractorCell.workerBreakdown || selectedContractorCell.remarks || ""}
                  onChange={(e) =>
                    setSelectedContractorCell({
                      ...selectedContractorCell,
                      workerBreakdown: e.target.value,
                      remarks: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:outline-hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedContractorCell(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold transition cursor-pointer hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveContractorDaily(
                      selectedContractorCell.teamName,
                      selectedContractorCell.date,
                      selectedContractorCell.headcount,
                      selectedContractorCell.siteName,
                      selectedContractorCell.siteWorkStatus,
                      selectedContractorCell.workerBreakdown || undefined,
                      selectedContractorCell.remarks || undefined,
                      selectedContractorCell.otHours || undefined,
                      selectedContractorCell.otTimeRange || undefined,
                      selectedContractorCell.otReason || undefined
                    );
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Save Contractor Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 11. MODAL: EDIT LEAVE REQUEST - ROOT LEVEL z-[100000] ALWAYS ABOVE DRAWER */}
      {editingLeave && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-700 w-full max-w-lg p-6 shadow-2xl space-y-4 relative z-[100001]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Edit3 size={16} className="text-blue-600" />
                  Edit Leave Request
                </h3>
                <p className="text-xs text-slate-500">
                  {editingLeave.employee?.name} ({editingLeave.employee?.employeeCode}) &middot; Status: <strong className="text-blue-600">{editingLeave.status}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLeave(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Leave Category *
                  </label>
                  <select
                    value={editLeaveCategory}
                    onChange={(e) => setEditLeaveCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="PLANNED">Planned Leave</option>
                    <option value="UNPLANNED">Unplanned Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="EMERGENCY">Emergency Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Day Duration *
                  </label>
                  <select
                    value={editLeaveDayType}
                    onChange={(e) => setEditLeaveDayType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                  >
                    <option value="FULL_DAY">Full-Day (1.0 Day)</option>
                    <option value="HALF_DAY">Half-Day (0.5 Day)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={editLeaveStartDate}
                    onChange={(e) => setEditLeaveStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={editLeaveEndDate}
                    onChange={(e) => setEditLeaveEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Note
                </label>
                <textarea
                  rows={2}
                  value={editLeaveReason}
                  onChange={(e) => setEditLeaveReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="Reason for leave"
                />
              </div>

              {editingLeave.status === "APPROVED" && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
                  <strong>Notice:</strong> This leave is currently approved. Saving changes will automatically update the attendance grid matrix for the specified dates.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingLeave(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editLeaveSubmitting}
                onClick={handleSaveEditLeave}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {editLeaveSubmitting ? "Saving..." : "Save Changes & Re-sync"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. SYSTEM SETTINGS MODAL */}
      <AttendanceSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onRefreshData={fetchAttendance}
        initialTab={settingsInitialTab}
      />

      {/* 13. MULTI-YEAR ATTENDANCE DOSSIER MODAL */}
      <EmployeeMultiYearDossierModal
        isOpen={!!selectedDossierEmployee}
        onClose={() => setSelectedDossierEmployee(null)}
        employee={selectedDossierEmployee}
        isContractorTeam={isContractorDossier}
      />

      {/* 14. UNIVERSAL ATTENDANCE EXPORT MODAL */}
      <UniversalAttendanceExportModal
        isOpen={showUniversalExportModal}
        onClose={() => setShowUniversalExportModal(false)}
        activeTab={activeTab}
        employees={employees}
        contractors={contractorsFromDb}
        contractorLogs={contractorLogs}
        holidays={holidays}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </div>
  );
}
