"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  X,
  Edit2,
  Lock,
  Mail,
  UserCheck,
  Check,
  ShieldCheck,
  Building,
  AlertTriangle,
  Sparkles,
  Trash2,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  active: boolean;
  permissions?: any;
  createdAt: string;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Executive Dashboard",
  estimates: "Quotes & Roofing Estimates",
  customers: "Customers & Accounts Receivable",
  projects: "Projects & Job Costing",
  invoices: "Sales Invoices & GST (#33)",
  credit_debit_notes: "Credit & Debit Notes",
  advances: "Customer & Vendor Advances",
  recurring: "Recurring Invoices & Bills",
  price_catalog: "Roofing Service & Price Catalog",
  suppliers: "Suppliers & Purchases",
  expenses: "Site Expenses & Reimbursements",
  fleet: "Fleet & Cargo Vehicles (Bolero/Eicher)",
  inventory: "Yard Stock Inventory",
  labour: "HR & Labour Muster Hub",
  reports: "Financial Statements & Cash Flow",
  capital: "Capital, Loans & Fixed Assets",
  cashbook: "Daily Cash Book",
  banking: "Banking, Contra & Reconciliation",
  accounts: "Chart of Accounts",
  vouchers: "Journal Vouchers & Audit Trail",
  machines: "Machines & Tools Tracking (SRM)",
  import: "Excel Bulk Data Importer",
  settings: "Company Settings & Year Locking",
  audit: "Security Audit Trail",
  users: "User & Permission Management",
  approvals: "Managing Director Approval Queue",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [showPermModal, setShowPermModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Permission Matrix State
  const [matrixRole, setMatrixRole] = useState("ACCOUNTANT");
  const [matrixPermissions, setMatrixPermissions] = useState<any>({});

  // New User Form State
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "ACCOUNTANT",
    phone: "",
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openPermissionModal = (user: UserItem) => {
    setSelectedUser(user);
    setMatrixRole(user.role);

    // Initial permissions
    const perms = user.permissions || getDefaultRolePermissions(user.role);
    setMatrixPermissions(JSON.parse(JSON.stringify(perms)));
    setShowPermModal(true);
  };

  const getDefaultRolePermissions = (role: string) => {
    const full = Object.keys(MODULE_LABELS).reduce((acc: any, k) => {
      acc[k] = { view: false, create: false, edit: false, approve: false };
      return acc;
    }, {});

    if (role === "SUPER_ADMIN" || role === "MANAGING_DIRECTOR") {
      Object.keys(MODULE_LABELS).forEach((k) => {
        full[k] = { view: true, create: true, edit: true, approve: true };
      });
      return full;
    }

    if (role === "ACCOUNTANT") {
      Object.keys(MODULE_LABELS).forEach((k) => {
        if (k !== "users" && k !== "settings") {
          full[k] = { view: true, create: true, edit: true, approve: true };
        }
      });
      return full;
    }

    if (role === "HR_MANAGER") {
      // HR Manager only gets labour, expenses, machines, approvals
      full.labour = { view: true, create: true, edit: true, approve: true };
      full.expenses = { view: true, create: true, edit: true, approve: false };
      full.machines = { view: true, create: false, edit: false, approve: false };
      full.approvals = { view: true, create: false, edit: false, approve: true };
      return full;
    }

    if (role === "SITE_SUPERVISOR") {
      full.expenses = { view: true, create: true, edit: false, approve: false };
      full.machines = { view: true, create: false, edit: false, approve: false };
      full.fleet = { view: true, create: true, edit: false, approve: false };
      return full;
    }

    return full;
  };

  const handleRoleChangeInMatrix = (newRole: string) => {
    setMatrixRole(newRole);
    setMatrixPermissions(getDefaultRolePermissions(newRole));
  };

  const handleCheckboxToggle = (
    moduleKey: string,
    action: "view" | "create" | "edit" | "approve"
  ) => {
    setMatrixPermissions((prev: any) => {
      const currentMod = prev[moduleKey] || { view: false, create: false, edit: false, approve: false };
      return {
        ...prev,
        [moduleKey]: {
          ...currentMod,
          [action]: !currentMod[action],
        },
      };
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          role: matrixRole,
          permissions: matrixPermissions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Permissions updated successfully for ${selectedUser.name}!`);
        setShowPermModal(false);
        fetchUsers();
      } else {
        alert(data.error || "Failed to update permissions");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const defaultPerms = getDefaultRolePermissions(newUser.role);
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newUser,
          permissions: defaultPerms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`User ${newUser.name} created successfully!`);
        setShowNewUserModal(false);
        setNewUser({ name: "", email: "", password: "", role: "ACCOUNTANT", phone: "" });
        fetchUsers();
      } else {
        alert(data.error || "Failed to create user");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (user.role === "SUPER_ADMIN") {
      alert("Cannot delete the primary Super Administrator account!");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${user.name} (${user.email})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleToggleUserActive = async (user: UserItem) => {
    if (!confirm(`Are you sure you want to ${user.active ? "deactivate" : "activate"} ${user.name}?`)) {
      return;
    }
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          active: !user.active,
        }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
              Security & RBAC
            </span>
            <span className="text-xs text-slate-400 font-medium">Granular Permission Matrix</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Team Members & Access Control
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control exact page visibility, creation, editing, and voucher approval rights per team member.
          </p>
        </div>

        <button
          onClick={() => setShowNewUserModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition active:scale-95"
        >
          <Plus size={16} />
          <span>+ Add Team Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Registered Team Accounts ({users.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading team accounts...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === "SUPER_ADMIN"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                            : u.role === "MANAGING_DIRECTOR"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                            : u.role === "ACCOUNTANT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                            : u.role === "HR_MANAGER"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleUserActive(u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                          u.active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {u.active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openPermissionModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition shadow-xs cursor-pointer"
                        >
                          <Shield size={12} className="text-blue-500" />
                          <span>Permissions</span>
                        </button>
                        {u.role !== "SUPER_ADMIN" && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Granular Permission Matrix */}
      {showPermModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="text-blue-600" /> Permissions for {selectedUser.name}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedUser.email} • Check or uncheck exact module capabilities.
                </p>
              </div>
              <button
                onClick={() => setShowPermModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Role Preset Selector */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Apply Role Preset:
              </span>
              <select
                value={matrixRole}
                onChange={(e) => handleRoleChangeInMatrix(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
              >
                <option value="SUPER_ADMIN">Super Admin (All Privileges)</option>
                <option value="MANAGING_DIRECTOR">Managing Director</option>
                <option value="ACCOUNTANT">Accountant (All Accounting, GST, P&L)</option>
                <option value="HR_MANAGER">HR Manager (Labour & Payroll Only)</option>
                <option value="ACCOUNTS_EXECUTIVE">Accounts Executive</option>
                <option value="PROJECT_MANAGER">Project Manager</option>
                <option value="SITE_SUPERVISOR">Site Supervisor (Expenses & Machines Only)</option>
                <option value="VIEWER">Viewer (Read-only)</option>
              </select>
              <span className="text-[11px] text-slate-400 italic">
                Auto-fills default checkboxes below. You can customize any checkbox individually!
              </span>
            </div>

            {/* Permission Checkbox Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">SR-Books Module</th>
                    <th className="py-2.5 px-4 text-center">View (Read)</th>
                    <th className="py-2.5 px-4 text-center">Create (New)</th>
                    <th className="py-2.5 px-4 text-center">Edit (Modify)</th>
                    <th className="py-2.5 px-4 text-center">Approve (Signoff)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(MODULE_LABELS).map(([mKey, mLabel]) => {
                    const perm = matrixPermissions[mKey] || {
                      view: false,
                      create: false,
                      edit: false,
                      approve: false,
                    };
                    return (
                      <tr key={mKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {mLabel}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!perm.view}
                            onChange={() => handleCheckboxToggle(mKey, "view")}
                            className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!perm.create}
                            onChange={() => handleCheckboxToggle(mKey, "create")}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!perm.edit}
                            onChange={() => handleCheckboxToggle(mKey, "edit")}
                            className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!perm.approve}
                            onChange={() => handleCheckboxToggle(mKey, "approve")}
                            className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">
                Unauthorized modules are blocked at API level with HTTP 403 Forbidden.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPermModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Team Member */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="text-blue-600" /> + Add New Team Member
              </h2>
              <button
                onClick={() => setShowNewUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. S. Thenarrusu"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="name@standardroofs.com"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Initial Password *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign Base Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="ACCOUNTANT">Accountant (Invoices, Banking, Reports)</option>
                  <option value="HR_MANAGER">HR Manager (Payroll & Labour Muster Only)</option>
                  <option value="SITE_SUPERVISOR">Site Supervisor (Expenses & Machines Only)</option>
                  <option value="PROJECT_MANAGER">Project Manager (Costing & Tools)</option>
                  <option value="ACCOUNTS_EXECUTIVE">Accounts Executive</option>
                  <option value="MANAGING_DIRECTOR">Managing Director</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
