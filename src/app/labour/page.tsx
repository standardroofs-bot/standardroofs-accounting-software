"use client";

import { useEffect, useState } from "react";
import {
  Users2,
  Plus,
  DollarSign,
  Calendar,
  AlertCircle,
  Clock,
  Wallet,
  CheckCircle2,
  Building,
  HardHat,
  Receipt,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatINR } from "@/lib/decimal";
import {
  AttendanceDistributionChart,
  MonthlyPayrollTrendChart,
} from "@/components/labour/LabourCharts";

export default function LabourPayrollPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "labour" | "contractors">("staff");
  const [loading, setLoading] = useState(true);

  // Data states
  const [labourers, setLabourers] = useState<any[]>([]);
  const [staffPayrolls, setStaffPayrolls] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Modals
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showMusterModal, setShowMusterModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  // Forms
  const [staffForm, setStaffForm] = useState({
    employeeId: "",
    monthYear: "April 2026",
    basicSalary: 25000,
    allowances: 3000,
    advancesDeducted: 0,
    tdsDeduction: 0,
    paymentMode: "BANK",
    bankAccountId: "",
    notes: "",
    payoutDate: new Date().toISOString().split("T")[0],
  });

  const [labourForm, setLabourForm] = useState({
    name: "",
    code: "",
    roleType: "DAILY_LABOUR",
    payCycle: "FIFTEEN_DAYS",
    baseWage: "12000",
    phone: "",
  });

  const [advanceForm, setAdvanceForm] = useState({
    employeeId: "",
    amount: "2000",
    purpose: "Mid-cycle cash advance",
  });

  const [musterForm, setMusterForm] = useState({
    employeeId: "",
    periodStart: "2026-04-01",
    periodEnd: "2026-04-15",
    daysWorked: "15",
    grossWage: "12000",
    advanceDeduction: "0",
    paymentMode: "CASH",
  });

  const [milestoneForm, setMilestoneForm] = useState({
    contractorId: "",
    projectId: "",
    stage: "STAGE_40_PROGRESS",
    percentage: 40,
    amount: 150000,
    tdsRate: 1, // 1% for individual/proprietor, 2% for company
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      setLoading(true);
      const [labRes, staffRes, contRes, prjRes, bankRes] = await Promise.all([
        fetch("/api/labour"),
        fetch("/api/labour/staff"),
        fetch("/api/contractors"),
        fetch("/api/projects"),
        fetch("/api/bank-accounts"),
      ]);

      const labData = await labRes.json();
      const staffData = await staffRes.json();
      const contData = await contRes.json();
      const prjData = await prjRes.json();
      const bankData = await bankRes.json();

      if (labData.success) setLabourers(labData.labourers || []);
      if (staffData.success) {
        setStaffPayrolls(staffData.payrolls || []);
        setStaffMembers(staffData.staffMembers || []);
      }
      if (contData.success) setContractors(contData.contractors || []);
      if (prjData.success) setProjects(prjData.projects || []);
      if (bankData.success) setBankAccounts(bankData.bankAccounts || []);
    } catch (e) {
      console.error("Error fetching payroll data:", e);
    } finally {
      setLoading(false);
    }
  }

  // Handle Staff Payout Submit
  async function handleStaffSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/labour/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowStaffModal(false);
        fetchAllData();
      } else {
        alert("Failed to post staff payroll: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Labour Submit
  async function handleLabourSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/labour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labourForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowLabourModal(false);
        fetchAllData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Advance Submit
  async function handleAdvanceSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/labour/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(advanceForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdvanceModal(false);
        fetchAllData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Muster Submit
  async function handleMusterSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/labour/muster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(musterForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowMusterModal(false);
        fetchAllData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // Handle Milestone Submit
  async function handleMilestoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/contractors/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: milestoneForm.contractorId,
          projectId: milestoneForm.projectId,
          milestoneType: milestoneForm.stage,
          milestonePercentage: milestoneForm.percentage,
          milestoneAmount: milestoneForm.amount,
          tdsRate: milestoneForm.tdsRate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowMilestoneModal(false);
        fetchAllData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users2 className="h-7 w-7 text-amber-500" />
            Unified HR, Labour Muster & Payroll
          </h1>
          <p className="text-sm text-muted-foreground">
            Office staff monthly salaries, 15-day site labour attendance muster & contractor milestone billing with TDS 194C
          </p>
        </div>

        {/* Dynamic Action Buttons based on Active Tab */}
        <div className="flex flex-wrap gap-2">
          {activeTab === "staff" && (
            <>
              <button
                onClick={() => {
                  setLabourForm({
                    name: "",
                    code: "",
                    roleType: "PERMANENT_STAFF",
                    payCycle: "MONTHLY",
                    baseWage: "25000",
                    phone: "",
                  });
                  setShowLabourModal(true);
                }}
                className="px-3 py-2 text-xs font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Staff Member
              </button>
              <button
                onClick={() => setShowStaffModal(true)}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-sm"
              >
                <DollarSign className="h-4 w-4" /> + Process Monthly Salary
              </button>
            </>
          )}

          {activeTab === "labour" && (
            <>
              <button
                onClick={() => setShowAdvanceModal(true)}
                className="px-3 py-2 text-xs font-semibold rounded-md border border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5"
              >
                <Wallet className="h-4 w-4 text-amber-500" /> Cash Advance
              </button>
              <button
                onClick={() => setShowMusterModal(true)}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-sm"
              >
                <Clock className="h-4 w-4" /> + Process 15-Day Muster
              </button>
            </>
          )}

          {activeTab === "contractors" && (
            <button
              onClick={() => setShowMilestoneModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-sm"
            >
              <Receipt className="h-4 w-4" /> + Raise Milestone Bill (TDS 194C)
            </button>
          )}
        </div>
      </div>

      {/* Visual Analytics Strip: Attendance Distribution & Monthly Payroll Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceDistributionChart
          totalStaff={staffMembers.length || 6}
          totalLabour={labourers.length || 24}
        />
        <MonthlyPayrollTrendChart
          grossSalary={staffPayrolls.reduce((sum, p) => sum + (Number(p.grossSalary) || 0), 0) || 125000}
          advancesDeducted={staffPayrolls.reduce((sum, p) => sum + (Number(p.advanceDeduction) || 0), 0) || 8000}
          netDisbursed={staffPayrolls.reduce((sum, p) => sum + (Number(p.netSalary) || 0), 0) || 117000}
        />
      </div>

      {/* 3-Tab Navigator */}
      <div className="flex border-b border-border bg-card rounded-t-lg px-2 pt-2">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "staff"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building className="h-4 w-4" />
          Tab 1: Office Staff Monthly Payroll ({staffPayrolls.length})
        </button>
        <button
          onClick={() => setActiveTab("labour")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "labour"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HardHat className="h-4 w-4" />
          Tab 2: Site Labour 15-Day Muster ({labourers.length})
        </button>
        <button
          onClick={() => setActiveTab("contractors")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === "contractors"
              ? "border-amber-500 text-amber-500 bg-amber-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users2 className="h-4 w-4" />
          Tab 3: Teams & Milestone Contractors ({contractors.length})
        </button>
      </div>

      {/* TAB 1: OFFICE STAFF MONTHLY PAYROLL */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
              <div className="text-xs text-muted-foreground">Permanent Staff Headcount</div>
              <div className="text-2xl font-bold mt-1 text-foreground">{staffMembers.length} Employees</div>
              <div className="text-xs text-muted-foreground mt-0.5">Admin, Accounts & Project Managers</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
              <div className="text-xs text-muted-foreground">Total Monthly Payroll Paid</div>
              <div className="text-2xl font-bold mt-1 text-foreground">
                ₹ {staffPayrolls.reduce((sum, p) => sum + Number(p.netPayable || 0), 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Auto-debited to Salary Expense</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
              <div className="text-xs text-muted-foreground">Payment Mode Distribution</div>
              <div className="text-sm font-semibold mt-2 text-foreground flex items-center gap-3">
                <span className="text-emerald-500 font-bold">100% Direct Bank Transfer</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">Office Staff Payroll Vouchers</h3>
                <p className="text-xs text-muted-foreground">
                  Monthly salaries processed with gross earnings, advance deductions, and balanced double-entry vouchers
                </p>
              </div>
              <button
                onClick={() => setShowStaffModal(true)}
                className="text-xs font-semibold text-amber-500 hover:text-amber-600"
              >
                + Process Payout
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Payroll No / Date</th>
                    <th className="py-3 px-4">Staff Name & Code</th>
                    <th className="py-3 px-4">Pay Period</th>
                    <th className="py-3 px-4 text-right">Basic + Allowances</th>
                    <th className="py-3 px-4 text-right">Advances Deducted</th>
                    <th className="py-3 px-4 text-right">Net Payout</th>
                    <th className="py-3 px-4 text-center">Payment Mode</th>
                    <th className="py-3 px-4 text-center">Journal Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No monthly staff payroll processed yet. Click{" "}
                        <button onClick={() => setShowStaffModal(true)} className="text-amber-500 underline font-medium">
                          + Process Monthly Salary
                        </button>{" "}
                        to create the first staff payout voucher.
                      </td>
                    </tr>
                  ) : (
                    staffPayrolls.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{p.payrollNumber}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(p.payoutDate).toLocaleDateString("en-IN")}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{p.employee?.name}</div>
                          <div className="text-muted-foreground">{p.employee?.employeeCode}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{p.monthYear}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          ₹ {(Number(p.basicSalary) + Number(p.allowances)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-rose-500 font-medium">
                          - ₹ {Number(p.advancesDeducted).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ₹ {Number(p.netPayable).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.journalEntry ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> {p.journalEntry.entryNumber}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Direct Payout</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SITE LABOUR 15-DAY MUSTER */}
      {activeTab === "labour" && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">15-Day Cycle Labour Roster</h3>
                <p className="text-xs text-muted-foreground">
                  Roof fitters, daily helpers, mid-cycle cash advances & 15-day muster payments
                </p>
              </div>
              <button
                onClick={() => {
                  setLabourForm({
                    name: "",
                    code: "",
                    roleType: "DAILY_LABOUR",
                    payCycle: "FIFTEEN_DAYS",
                    baseWage: "12000",
                    phone: "",
                  });
                  setShowLabourModal(true);
                }}
                className="text-xs font-semibold text-amber-500 hover:text-amber-600"
              >
                + Add Labourer
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code & Name</th>
                    <th className="py-3 px-4">Role & Pay Cycle</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4 text-right">Base Wage (15 Days)</th>
                    <th className="py-3 px-4 text-right">Advance Balance</th>
                    <th className="py-3 px-4 text-center">Last Payout</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {labourers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No site labourers registered yet.
                      </td>
                    </tr>
                  ) : (
                    labourers.map((lab) => (
                      <tr key={lab.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{lab.name}</div>
                          <div className="text-[11px] font-mono text-amber-500">{lab.employeeCode}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                            {lab.roleType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{lab.phone || "N/A"}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          ₹ {Number(lab.baseWage).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-rose-500">
                          ₹ {Number(lab.cashAdvanceBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground">
                          {lab.musters && lab.musters.length > 0 ? (
                            <span className="text-emerald-600 font-medium">
                              ₹ {Number(lab.musters[0].netPayout).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            "No payouts yet"
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setAdvanceForm({ employeeId: lab.id, amount: "2000", purpose: "Mid-cycle cash advance" });
                                setShowAdvanceModal(true);
                              }}
                              className="px-2 py-1 text-[11px] rounded bg-amber-500/10 text-amber-600 font-semibold hover:bg-amber-500/20"
                            >
                              + Advance
                            </button>
                            <button
                              onClick={() => {
                                setMusterForm({
                                  employeeId: lab.id,
                                  periodStart: "2026-04-01",
                                  periodEnd: "2026-04-15",
                                  daysWorked: "15",
                                  grossWage: String(lab.baseWage || "12000"),
                                  advanceDeduction: String(lab.cashAdvanceBalance || "0"),
                                  paymentMode: "CASH",
                                });
                                setShowMusterModal(true);
                              }}
                              className="px-2 py-1 text-[11px] rounded bg-emerald-500/10 text-emerald-600 font-semibold hover:bg-emerald-500/20"
                            >
                              Muster
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEAMS & MILESTONE CONTRACTORS */}
      {activeTab === "contractors" && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-foreground">Roofing Contractors & Installation Teams</h3>
                <p className="text-xs text-muted-foreground">
                  SRM01–SRM06, Team Thenarrusu, Team Saran — 10%, 40%, 75%, 100% stage payouts with Section 194C TDS
                </p>
              </div>
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="text-xs font-semibold text-amber-500 hover:text-amber-600"
              >
                + Raise Milestone Bill
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Contractor / Team</th>
                    <th className="py-3 px-4">Specialty</th>
                    <th className="py-3 px-4">PAN / Mobile</th>
                    <th className="py-3 px-4 text-right">Agreed Contract Value</th>
                    <th className="py-3 px-4 text-center">Active Milestones</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contractors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No contractors registered yet. Register teams to track work stages.
                      </td>
                    </tr>
                  ) : (
                    contractors.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{c.name}</div>
                          <div className="text-[11px] font-mono text-amber-500">{c.code || "CONT"}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{c.specialty}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <div>PAN: {c.panNumber || "N/A"}</div>
                          <div>{c.phone || "N/A"}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          ₹ {Number(c.contractValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {c.milestones ? `${c.milestones.length} Stages` : "0 Stages"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setMilestoneForm({
                                contractorId: c.id,
                                projectId: projects[0]?.id || "",
                                stage: "STAGE_40_PROGRESS",
                                percentage: 40,
                                amount: Math.round(Number(c.contractValue) * 0.4) || 100000,
                                tdsRate: 1,
                              });
                              setShowMilestoneModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                          >
                            + Bill Stage
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Process Staff Monthly Salary */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Building className="h-5 w-5 text-amber-500" /> Process Staff Monthly Salary Payout
            </h3>

            <form onSubmit={handleStaffSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Staff Member *</label>
                  <select
                    required
                    value={staffForm.employeeId}
                    onChange={(e) => {
                      const emp = staffMembers.find((s) => s.id === e.target.value);
                      const advBal = emp?.advances?.reduce((sum: number, a: any) => sum + Number(a.amount), 0) || 0;
                      setStaffForm({
                        ...staffForm,
                        employeeId: e.target.value,
                        basicSalary: emp ? Number(emp.baseWage) : staffForm.basicSalary,
                        advancesDeducted: advBal,
                      });
                    }}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Select Staff --</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Pay Period *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., April 2026"
                    value={staffForm.monthYear}
                    onChange={(e) => setStaffForm({ ...staffForm, monthYear: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Basic Salary (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={staffForm.basicSalary}
                    onChange={(e) => setStaffForm({ ...staffForm, basicSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Allowances / HRA (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={staffForm.allowances}
                    onChange={(e) => setStaffForm({ ...staffForm, allowances: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Advance Recovery (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={staffForm.advancesDeducted}
                    onChange={(e) => setStaffForm({ ...staffForm, advancesDeducted: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground text-rose-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">TDS / Deductions (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={staffForm.tdsDeduction}
                    onChange={(e) => setStaffForm({ ...staffForm, tdsDeduction: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Mode</label>
                  <select
                    value={staffForm.paymentMode}
                    onChange={(e) => setStaffForm({ ...staffForm, paymentMode: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="BANK">Bank Account (NEFT/RTGS)</option>
                    <option value="CASH">Cash in Hand</option>
                  </select>
                </div>
                {staffForm.paymentMode === "BANK" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Company Bank</label>
                    <select
                      value={staffForm.bankAccountId}
                      onChange={(e) => setStaffForm({ ...staffForm, bankAccountId: e.target.value })}
                      className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                    >
                      <option value="">-- Select Bank --</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} - {b.accountNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Net Payout Calculation */}
              <div className="p-3 bg-muted/40 rounded border border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">Net Payout to Employee:</span>
                <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                  ₹ {(staffForm.basicSalary + staffForm.allowances - staffForm.advancesDeducted - staffForm.tdsDeduction).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm"
                >
                  Post Salary & Double-Entry Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Labour / Staff */}
      {showLabourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground">Register Employee / Labourer</h3>
            <form onSubmit={handleLabourSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={labourForm.name}
                  onChange={(e) => setLabourForm({ ...labourForm, name: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="Auto (EMP001)"
                    value={labourForm.code}
                    onChange={(e) => setLabourForm({ ...labourForm, code: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Role Type</label>
                  <select
                    value={labourForm.roleType}
                    onChange={(e) => setLabourForm({ ...labourForm, roleType: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="PERMANENT_STAFF">Office Staff</option>
                    <option value="SITE_FITTER">Roof Fitter</option>
                    <option value="DAILY_LABOUR">Daily Labourer</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Base Wage (₹)</label>
                  <input
                    type="number"
                    value={labourForm.baseWage}
                    onChange={(e) => setLabourForm({ ...labourForm, baseWage: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Mobile No</label>
                  <input
                    type="text"
                    value={labourForm.phone}
                    onChange={(e) => setLabourForm({ ...labourForm, phone: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabourModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Advance */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground">Issue Mid-Cycle Cash Advance</h3>
            <form onSubmit={handleAdvanceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Labourer *</label>
                <select
                  required
                  value={advanceForm.employeeId}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, employeeId: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                >
                  <option value="">-- Select Labourer --</option>
                  {labourers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Advance Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Purpose</label>
                <input
                  type="text"
                  value={advanceForm.purpose}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, purpose: e.target.value })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  Issue Advance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Muster */}
      {showMusterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground">Process 15-Day Muster Wage Payout</h3>
            <form onSubmit={handleMusterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Labourer *</label>
                <select
                  required
                  value={musterForm.employeeId}
                  onChange={(e) => {
                    const l = labourers.find((lab) => lab.id === e.target.value);
                    setMusterForm({
                      ...musterForm,
                      employeeId: e.target.value,
                      grossWage: String(l?.baseWage || "12000"),
                      advanceDeduction: String(l?.cashAdvanceBalance || "0"),
                    });
                  }}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                >
                  <option value="">-- Select Labourer --</option>
                  {labourers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Gross Wage (₹)</label>
                  <input
                    type="number"
                    value={musterForm.grossWage}
                    onChange={(e) => setMusterForm({ ...musterForm, grossWage: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Advance Recovery (₹)</label>
                  <input
                    type="number"
                    value={musterForm.advanceDeduction}
                    onChange={(e) => setMusterForm({ ...musterForm, advanceDeduction: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground text-rose-500 font-bold"
                  />
                </div>
              </div>
              <div className="p-3 bg-muted/40 rounded border border-border flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-semibold">Net Payout to Labourer:</span>
                <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                  ₹ {(parseFloat(musterForm.grossWage || "0") - parseFloat(musterForm.advanceDeduction || "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMusterModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  Post Muster Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Milestone Bill */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-500" /> Raise Contractor Milestone Bill (TDS 194C)
            </h3>
            <form onSubmit={handleMilestoneSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Contractor Team *</label>
                  <select
                    required
                    value={milestoneForm.contractorId}
                    onChange={(e) => {
                      const c = contractors.find((item) => item.id === e.target.value);
                      setMilestoneForm({
                        ...milestoneForm,
                        contractorId: e.target.value,
                        amount: c ? Math.round(Number(c.contractValue) * (milestoneForm.percentage / 100)) : milestoneForm.amount,
                      });
                    }}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Select Contractor --</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.specialty})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Roofing Project *</label>
                  <select
                    required
                    value={milestoneForm.projectId}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, projectId: e.target.value })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Work Stage</label>
                  <select
                    value={milestoneForm.stage}
                    onChange={(e) => {
                      let pct = 40;
                      if (e.target.value === "STAGE_10_ADVANCE") pct = 10;
                      if (e.target.value === "STAGE_40_PROGRESS") pct = 40;
                      if (e.target.value === "STAGE_75_STRUCTURE") pct = 75;
                      if (e.target.value === "STAGE_100_COMPLETION") pct = 100;

                      const c = contractors.find((item) => item.id === milestoneForm.contractorId);
                      setMilestoneForm({
                        ...milestoneForm,
                        stage: e.target.value,
                        percentage: pct,
                        amount: c ? Math.round(Number(c.contractValue) * (pct / 100)) : milestoneForm.amount,
                      });
                    }}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="STAGE_10_ADVANCE">10% Initial Mobilization Advance</option>
                    <option value="STAGE_40_PROGRESS">40% Trusses & Structure Erection</option>
                    <option value="STAGE_75_STRUCTURE">75% Purlins & Sheeting Fixing</option>
                    <option value="STAGE_100_COMPLETION">100% Final Handover & Finishing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">TDS u/s 194C Rate</label>
                  <select
                    value={milestoneForm.tdsRate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, tdsRate: parseFloat(e.target.value) || 1 })}
                    className="w-full text-xs p-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="1">1% - Individual / Sole Proprietor</option>
                    <option value="2">2% - Company / Partnership Firm</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Milestone Gross Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={milestoneForm.amount}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs p-2 rounded border border-border bg-background text-foreground font-bold"
                />
              </div>

              {/* TDS Calculation Breakdown */}
              <div className="p-3 bg-muted/40 rounded border border-border space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Stage Amount:</span>
                  <span className="font-semibold text-foreground">
                    ₹ {milestoneForm.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-rose-500">
                  <span>Less: Section 194C TDS ({milestoneForm.tdsRate}%):</span>
                  <span>
                    - ₹ {(milestoneForm.amount * (milestoneForm.tdsRate / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border font-bold">
                  <span className="text-foreground">Net Contractor Payable:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ₹ {(milestoneForm.amount * (1 - milestoneForm.tdsRate / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  Post Milestone & TDS Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
