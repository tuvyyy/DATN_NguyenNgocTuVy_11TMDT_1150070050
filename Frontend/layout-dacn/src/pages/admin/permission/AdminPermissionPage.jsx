import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Save,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  Shield,
  Stethoscope,
  Receipt,
  Pill,
  UserPlus2,
  AlertCircle,
  Loader2,
  Activity
} from "lucide-react";
import {
  getAllUsers,
  getPermissions,
  getRolePermissions,
  getRoles,
  getUserDataScope,
  getUserPermissions,
  updateRolePermissions,
  updateUserDataScope,
  updateUserRoles,
} from "../../../api/AdminPermissionApi";

const ACTIONS = [
  { key: "xem", label: "Xem" },
  { key: "them", label: "Thêm" },
  { key: "sua", label: "Sửa" },
  { key: "xoa", label: "Xóa" },
  { key: "xuat", label: "Xuất" },
];

const ROLE_NAMES = {
  ADMIN: "Quản trị viên",
  QUAN_TRI: "Quản trị viên",
  BAC_SI: "Bác sĩ",
  TIEP_DON: "Nhân viên tiếp đón",
  THU_NGAN: "Nhân viên thu ngân",
  KY_THUAT_VIEN: "Kỹ thuật viên cận lâm sàng",
  KTV: "Kỹ thuật viên cận lâm sàng",
  DUOC_SI: "Dược sĩ",
  DUOC: "Dược sĩ",
  TIEP_DON_PRESET_FULL: "Tiếp đón - toàn quyền",
  TIEP_DON_PRESET_CHI_XEM: "Tiếp đón - chỉ xem",
};

const FEATURE_NAMES = {
  KHAM_BENH: "Khám bệnh",
  TIEP_DON: "Tiếp đón người bệnh",
  THUOC: "Quản lý thuốc",
  BAO_CAO: "Báo cáo thống kê",
  THANH_TOAN: "Thu ngân và thanh toán",
  DICH_VU: "Dịch vụ khám bệnh",
  DVKT: "Cận lâm sàng",
};

const FEATURE_ROLE_RULES = {
  KHAM_BENH: ["BAC_SI"],
  TIEP_DON: ["TIEP_DON", "TIEP_DON_PRESET_FULL", "TIEP_DON_PRESET_CHI_XEM"],
  THANH_TOAN: ["THU_NGAN"],
  DVKT: ["KY_THUAT_VIEN", "KTV", "CAN_LAM_SANG"],
  THUOC: ["DUOC", "DUOC_SI"],
  DICH_VU: ["TIEP_DON", "TIEP_DON_PRESET_FULL"],
  BAO_CAO: [
    "TIEP_DON",
    "TIEP_DON_PRESET_FULL",
    "TIEP_DON_PRESET_CHI_XEM",
    "BAC_SI",
    "THU_NGAN",
    "KY_THUAT_VIEN",
    "KTV",
    "CAN_LAM_SANG",
    "DUOC",
    "DUOC_SI",
  ],
};

const ROLE_ICONS = {
  ADMIN: <Shield size={14} />,
  QUAN_TRI: <Shield size={14} />,
  BAC_SI: <Stethoscope size={14} />,
  TIEP_DON: <UserPlus2 size={14} />,
  THU_NGAN: <Receipt size={14} />,
  KY_THUAT_VIEN: <Activity size={14} />,
  KTV: <Activity size={14} />,
  DUOC_SI: <Pill size={14} />,
  DUOC: <Pill size={14} />,
};

const getRoleIcon = (roleName) => {
  const key = String(roleName || "").trim().toUpperCase();
  return ROLE_ICONS[key] || <ShieldCheck size={14} />;
};

const getUserInitials = (name) => {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const roleLabel = (role) => ROLE_NAMES[String(role || "").trim().toUpperCase()] || role || "Chưa xác định";

const featureCode = (permission) => {
  const direct = String(permission?.maChucNang || "").trim().toUpperCase();
  if (direct) return direct;
  const permissionCode = String(permission?.maQuyen || "").trim().toUpperCase();
  return Object.keys(FEATURE_NAMES).find((code) => permissionCode.includes(code)) || "";
};

const featureLabel = (permission) => {
  const code = featureCode(permission);
  return FEATURE_NAMES[code] || permission?.tenChucNang || permission?.chucNang || "Quyền hệ thống";
};

const normalizeRoleName = (roleName) => String(roleName || "").trim().toUpperCase();

const canRoleConfigurePermission = (roleName, permission) => {
  const role = normalizeRoleName(roleName);
  if (role === "ADMIN" || role === "QUAN_TRI") return true;
  const code = featureCode(permission);
  if (!code) return false;
  return (FEATURE_ROLE_RULES[code] || []).includes(role);
};

const normalizeRoles = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : item?.ten)).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

function NoticeModal({ notice, onClose }) {
  if (!notice.open) return null;
  const success = notice.type === "success";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-2xl animate-fadeSlide border-slate-200">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 rounded-xl p-2.5 shadow-inner ${
            success 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
              : "bg-rose-50 text-rose-600 border border-rose-100"
          }`}>
            {success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-extrabold text-slate-850">{notice.title}</h3>
            <p className="mt-1.5 text-xs font-semibold text-slate-500 leading-relaxed">{notice.message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-all duration-150 ${
              success
                ? "bg-[#0077B6] hover:bg-[#006093]"
                : "bg-slate-700 hover:bg-slate-800"
            }`}
          >
            Đóng thông báo
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPermissionPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userRoleDraft, setUserRoleDraft] = useState([]);
  const [rolePermissionDraft, setRolePermissionDraft] = useState({});
  const [dataScope, setDataScope] = useState({ rooms: [], assignedRoomIds: [] });
  const [roomScopeDraft, setRoomScopeDraft] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [keyword, setKeyword] = useState("");
  const [candidateUserId, setCandidateUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState({ open: false, type: "success", title: "", message: "" });

  const showNotice = (type, title, message) => setNotice({ open: true, type, title, message });

  const visibleRoles = useMemo(
    () => roles.filter((role) => !String(role.ten || "").includes("_PRESET_")),
    [roles]
  );

  const selectedRole = useMemo(
    () => roles.find((role) => Number(role.id) === Number(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );

  const selectedUser = useMemo(
    () => users.find((user) => Number(user.id) === Number(selectedUserId)) || null,
    [users, selectedUserId]
  );

  const selectedRoleName = selectedRole?.ten || "";

  const getRoleMemberCount = useCallback(
    (roleName) => {
      return users.filter((user) => normalizeRoles(user.roles || user.vaiTro).includes(roleName)).length;
    },
    [users]
  );

  const roleMemberCount = useMemo(
    () => getRoleMemberCount(selectedRoleName),
    [selectedRoleName, getRoleMemberCount]
  );

  const filteredUsers = useMemo(() => {
    const search = keyword.trim().toLocaleLowerCase("vi");
    return users
      .filter((user) => {
        const userRoles = normalizeRoles(user.roles || user.vaiTro);
        if (!userRoles.includes(selectedRoleName)) return false;
        if (!search) return true;
        return `${user.hoTen || ""} ${user.tenDangNhap || ""}`.toLocaleLowerCase("vi").includes(search);
      })
      .sort((a, b) => String(a.hoTen || a.tenDangNhap || "").localeCompare(String(b.hoTen || b.tenDangNhap || ""), "vi"));
  }, [users, keyword, selectedRoleName]);

  const candidateUsers = useMemo(
    () =>
      users
        .filter((user) => !normalizeRoles(user.roles || user.vaiTro).includes(selectedRoleName))
        .sort((a, b) => String(a.hoTen || a.tenDangNhap || "").localeCompare(String(b.hoTen || b.tenDangNhap || ""), "vi")),
    [users, selectedRoleName]
  );

  const permissionRows = useMemo(() => {
    const map = new Map();
    permissions.forEach((permission) => {
      const key = Number(permission.id);
      if (!map.has(key)) map.set(key, permission);
    });
    return Array.from(map.values()).sort((a, b) => featureLabel(a).localeCompare(featureLabel(b), "vi"));
  }, [permissions]);

  const permissionById = useMemo(
    () => new Map(permissionRows.map((permission) => [Number(permission.id), permission])),
    [permissionRows]
  );

  const roomGroups = useMemo(() => {
    const groups = new Map();
    (dataScope.rooms || []).forEach((room) => {
      const department = room.khoaPhong || room.KhoaPhong || "Chưa phân khoa";
      if (!groups.has(department)) groups.set(department, []);
      groups.get(department).push(room);
    });
    return Array.from(groups.entries()).map(([department, rooms]) => ({ department, rooms }));
  }, [dataScope.rooms]);

  const loadUsers = async (keepUserId = null) => {
    const list = await getAllUsers();
    setUsers(list);
    if (keepUserId && list.some((user) => Number(user.id) === Number(keepUserId))) {
      setSelectedUserId(keepUserId);
    } else if (!selectedUserId && list.length) {
      setSelectedUserId(list[0].id);
    }
    return list;
  };

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const [roleList, permissionList, userList] = await Promise.all([getRoles(), getPermissions(), getAllUsers()]);
      if (!active) return;
      setRoles(roleList);
      setPermissions(permissionList);
      setUsers(userList);
      const firstBusinessRole = roleList.find((role) => !String(role.ten || "").includes("_PRESET_"));
      setSelectedRoleId(firstBusinessRole?.id || null);
      setSelectedUserId(userList[0]?.id || null);
      setLoading(false);
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    let active = true;
    const run = async () => {
      setLoadingDetail(true);
      const assigned = await getRolePermissions(selectedRoleId);
      if (!active) return;
      const draft = {};
      assigned.forEach((permission) => {
        draft[permission.idQuyen] = Object.fromEntries(
          ACTIONS.map((action) => [action.key, permission[action.key] === true])
        );
      });
      setRolePermissionDraft(draft);
      setLoadingDetail(false);
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedRoleId]);

  useEffect(() => {
    const roleMembers = users.filter((user) => normalizeRoles(user.roles || user.vaiTro).includes(selectedRoleName));
    const selectedStillBelongs = roleMembers.some((user) => Number(user.id) === Number(selectedUserId));
    if (!selectedStillBelongs) setSelectedUserId(roleMembers[0]?.id || null);
    setCandidateUserId("");
  }, [selectedRoleName, users, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) {
      setUserRoleDraft([]);
      setDataScope({ rooms: [], assignedRoomIds: [] });
      setRoomScopeDraft([]);
      return;
    }
    let active = true;
    const run = async () => {
      setLoadingDetail(true);
      setScopeLoading(true);
      const [detail, scope] = await Promise.all([
        getUserPermissions(selectedUserId),
        getUserDataScope(selectedUserId),
      ]);
      if (!active) return;
      const fallbackUser = users.find((user) => Number(user.id) === Number(selectedUserId));
      setUserRoleDraft(normalizeRoles(detail?.roles || fallbackUser?.roles || fallbackUser?.vaiTro));
      const nextScope = scope || { rooms: [], assignedRoomIds: [] };
      setDataScope(nextScope);
      setRoomScopeDraft((nextScope.assignedRoomIds || []).map((id) => Number(id)));
      setLoadingDetail(false);
      setScopeLoading(false);
    };
    run();
    return () => {
      active = false;
    };
  }, [selectedUserId, users]);

  const toggleUserRole = (roleName) => {
    setUserRoleDraft((current) =>
      current.includes(roleName) ? current.filter((name) => name !== roleName) : [...current, roleName]
    );
  };

  const toggleRoomScope = (roomId) => {
    const id = Number(roomId);
    setRoomScopeDraft((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const setAllRoomScope = (enabled) => {
    setRoomScopeDraft(enabled ? (dataScope.rooms || []).map((room) => Number(room.id || room.Id)) : []);
  };

  const saveUserRoles = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    const response = await updateUserRoles(selectedUserId, userRoleDraft);
    if (!response) {
      setSaving(false);
      showNotice("error", "Không thể lưu vai trò", "Hệ thống chưa cập nhật được vai trò của nhân viên. Vui lòng thử lại.");
      return;
    }

    await loadUsers(selectedUserId);
    setSaving(false);
    showNotice("success", "Đã cập nhật vai trò", `${selectedUser?.hoTen || selectedUser?.tenDangNhap} đã được cập nhật quyền truy cập.`);
  };

  const saveUserDataScope = async () => {
    if (!selectedUserId) return;
    if (scopeLoading || !(dataScope.rooms || []).length) {
      showNotice("error", "Chưa tải được danh sách phòng", "Không thể lưu phạm vi khi danh sách phòng đang rỗng. Vui lòng tải lại trang hoặc chọn lại nhân viên.");
      return;
    }
    if (!roomScopeDraft.length) {
      showNotice("error", "Chưa chọn phòng", "Vui lòng chọn ít nhất một phòng trước khi lưu để tránh xóa nhầm phạm vi hiện có.");
      return;
    }

    setSaving(true);
    const response = await updateUserDataScope(selectedUserId, roomScopeDraft);
    setSaving(false);
    if (!response) {
      showNotice("error", "Không thể lưu phạm vi", "Hệ thống chưa cập nhật được phạm vi khoa/phòng. Vui lòng thử lại.");
      return;
    }

    const scope = await getUserDataScope(selectedUserId);
    if (scope) {
      setDataScope(scope);
      setRoomScopeDraft((scope.assignedRoomIds || []).map((id) => Number(id)));
    }
    showNotice("success", "Đã lưu phạm vi", `${selectedUser?.hoTen || selectedUser?.tenDangNhap} đã được cập nhật khoa/phòng được phép xem và thao tác.`);
  };

  const addUserToSelectedRole = async () => {
    const userId = Number(candidateUserId || 0);
    const candidate = users.find((user) => Number(user.id) === userId);
    if (!candidate || !selectedRoleName) return;

    const nextRoles = Array.from(new Set([...normalizeRoles(candidate.roles || candidate.vaiTro), selectedRoleName]));
    setSaving(true);
    const response = await updateUserRoles(userId, nextRoles);
    if (!response) {
      setSaving(false);
      showNotice("error", "Không thể thêm nhân viên", "Hệ thống chưa cập nhật được vai trò. Vui lòng thử lại.");
      return;
    }

    await loadUsers(userId);
    setSelectedUserId(userId);
    setCandidateUserId("");
    setSaving(false);
    showNotice("success", "Đã thêm nhân viên", `${candidate.hoTen || candidate.tenDangNhap} đã thuộc vai trò ${roleLabel(selectedRoleName)}.`);
  };

  const togglePermission = (permissionId, action) => {
    const permission = permissionById.get(Number(permissionId));
    if (!canRoleConfigurePermission(selectedRoleName, permission)) return;

    setRolePermissionDraft((current) => ({
      ...current,
      [permissionId]: {
        ...current[permissionId],
        [action]: !current[permissionId]?.[action],
      },
    }));
  };

  const setPermissionRow = (permissionId, enabled) => {
    const permission = permissionById.get(Number(permissionId));
    if (!canRoleConfigurePermission(selectedRoleName, permission)) return;

    setRolePermissionDraft((current) => ({
      ...current,
      [permissionId]: Object.fromEntries(ACTIONS.map((action) => [action.key, enabled])),
    }));
  };

  const saveRoleMatrix = async () => {
    if (!selectedRoleId) return;
    const updates = permissionRows.map((permission) => {
      const applicable = canRoleConfigurePermission(selectedRoleName, permission);
      return {
        idQuyen: Number(permission.id),
        ...Object.fromEntries(
          ACTIONS.map((action) => [
            action.key,
            applicable && rolePermissionDraft[permission.id]?.[action.key] === true,
          ])
        ),
      };
    });

    setSaving(true);
    const response = await updateRolePermissions(selectedRoleId, updates);
    setSaving(false);
    if (!response) {
      showNotice("error", "Không thể lưu quyền", "Hệ thống chưa cập nhật được quyền của vai trò. Vui lòng thử lại.");
      return;
    }
    showNotice("success", "Đã lưu quyền", `Quyền của vai trò ${roleLabel(selectedRoleName)} đã được cập nhật.`);
  };

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 size={32} className="animate-spin text-[#0077B6]" />
        <p className="text-sm font-bold text-slate-500">Đang tải dữ liệu phân quyền...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#0077B6]" />
              Phân quyền & Phân vai trò người dùng
            </h1>
            <p className="mt-0.5 text-[13px] font-semibold text-slate-500 leading-none">
              Gán vai trò cho nhân viên, cấu hình quyền hạn nghiệp vụ, và phạm vi hoạt động khoa/phòng.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/70 p-1 shadow-inner h-9">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`rounded-lg px-3 text-[13px] font-bold transition-all duration-200 hover:-translate-y-[0.5px] active:translate-y-0 h-7 flex items-center justify-center gap-1.5 ${
                activeTab === "users"
                  ? "bg-[#0077B6] text-white shadow-sm border border-[#0077B6]"
                  : "text-slate-600 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900"
              }`}
            >
              <UserCog size={13} />
              Vai trò nhân viên
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`rounded-lg px-3 text-[13px] font-bold transition-all duration-200 hover:-translate-y-[0.5px] active:translate-y-0 h-7 flex items-center justify-center gap-1.5 ${
                activeTab === "matrix"
                  ? "bg-[#0077B6] text-white shadow-sm border border-[#0077B6]"
                  : "text-slate-600 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900"
              }`}
            >
              <ShieldCheck size={13} />
              Quyền của vai trò
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scope")}
              className={`rounded-lg px-3 text-[13px] font-bold transition-all duration-200 hover:-translate-y-[0.5px] active:translate-y-0 h-7 flex items-center justify-center gap-1.5 ${
                activeTab === "scope"
                  ? "bg-[#0077B6] text-white shadow-sm border border-[#0077B6]"
                  : "text-slate-600 border border-transparent hover:bg-white hover:border-slate-200 hover:text-slate-900"
              }`}
            >
              <Building2 size={13} />
              Phạm vi khoa/phòng
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1.5 shrink-0">
          {visibleRoles.map((role) => {
            const active = Number(role.id) === Number(selectedRoleId);
            const count = getRoleMemberCount(role.ten);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-bold transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 ${
                  active
                    ? "border-[#0077B6] bg-[#0077B6] text-white shadow-md shadow-[#0077B6]/15"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-350 hover:shadow-sm"
                }`}
              >
                <span className={active ? "text-white" : "text-[#0077B6]"}>
                  {getRoleIcon(role.ten)}
                </span>
                <span>{roleLabel(role.ten)}</span>
                <span className={`inline-flex h-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-none ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: "40% 60%" }}>
        <aside className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-2.5 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-extrabold text-slate-800">Nhân viên</h2>
              <span className="rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-bold text-[#0077B6] uppercase">
                {roleMemberCount} thành viên
              </span>
            </div>
            <div className="relative mt-2">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
                <Search size={14} />
              </span>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm tên hoặc tài khoản..."
                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8.5 pr-2.5 text-sm font-semibold shadow-sm outline-none transition-all duration-200 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2.5 bg-slate-50/30">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                  <Users size={20} />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700">Không tìm thấy nhân viên</p>
                <p className="mt-1 text-xs font-semibold text-slate-400 leading-normal max-w-[200px] mx-auto">
                  Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn vai trò khác.
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const userRoles = normalizeRoles(user.roles || user.vaiTro);
                const belongsToRole = userRoles.includes(selectedRoleName);
                const active = Number(user.id) === Number(selectedUserId);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`group relative mb-2 w-full rounded-xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-[0.5px] hover:shadow-sm ${
                      active
                        ? "border-[#0077B6] bg-blue-50/50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-slate-300"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-[#0077B6]" />}
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-inner ${
                        active ? "bg-[#0077B6] text-white" : "bg-slate-100 text-slate-550"
                      }`}>
                        {getUserInitials(user.hoTen || user.tenDangNhap)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="truncate text-[14px] font-bold text-slate-800 group-hover:text-slate-950">
                            {user.hoTen || user.tenDangNhap}
                          </p>
                          {belongsToRole && (
                            <span className="shrink-0 rounded-md bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-600 uppercase">
                              Đã gán
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-450">@{user.tenDangNhap}</p>
                      </div>
                    </div>
                    {userRoles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {userRoles.map((role) => (
                          <span key={role} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-bold text-slate-500 border border-slate-200/50">
                            {roleLabel(role)}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="min-h-0 flex-1 bg-slate-50/45 flex flex-col">
          {activeTab === "users" ? (
            <section className="flex h-full min-h-0 flex-col justify-between">
              <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2.5">
                <div className="w-full space-y-3">
                  {/* PANEL 1: THÊM NHÂN VIÊN */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <UserCog size={16} className="text-[#0077B6]" />
                      <h3 className="text-[15px] font-bold text-slate-800">
                        Thêm nhân viên vào vai trò {roleLabel(selectedRoleName)}
                      </h3>
                    </div>
                    <p className="text-xs md:text-sm font-semibold text-slate-450 mb-3">
                      Chọn một nhân viên từ danh sách chưa có vai trò này để gán quyền.
                    </p>
                    <div className="flex gap-2.5">
                      <select
                        value={candidateUserId}
                        onChange={(event) => setCandidateUserId(event.target.value)}
                        className="h-9 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350"
                      >
                        <option value="">-- Chọn nhân viên để thêm --</option>
                        {candidateUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.hoTen || user.tenDangNhap} (@{user.tenDangNhap})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addUserToSelectedRole}
                        disabled={!candidateUserId || saving}
                        className="h-9 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#0077B6] hover:bg-[#006093] hover:shadow-md hover:shadow-[#0077B6]/15 px-4 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:-translate-y-0 disabled:shadow-none"
                      >
                        Thêm vào vai trò
                      </button>
                    </div>
                  </div>

                  {/* PANEL 2: DANH SÁCH VAI TRÒ */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <ShieldCheck size={16} className="text-[#0077B6]" />
                      <h3 className="text-[15px] font-bold text-slate-800">Cấu hình vai trò</h3>
                    </div>
                    <p className="text-xs md:text-sm font-semibold text-slate-455 mb-3 leading-relaxed">
                      Nhân viên có thể được gán nhiều vai trò cùng lúc. Quyền hạn nghiệp vụ tương ứng sẽ được tự động cộng gộp.
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleRoles.map((role) => {
                        const checked = userRoleDraft.includes(role.ten);
                        return (
                          <label
                            key={role.id}
                            className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-[0.5px] hover:shadow-sm ${
                              checked
                                ? "border-[#0077B6] bg-blue-50/45 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-350"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleUserRole(role.ten)}
                                className="h-4 w-4 rounded border-slate-300 text-[#0077B6] focus:ring-[#0077B6] accent-[#0077B6] cursor-pointer"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-sm font-extrabold text-slate-805 group-hover:text-slate-900">
                                <span className={checked ? "text-[#0077B6]" : "text-slate-500"}>
                                  {getRoleIcon(role.ten)}
                                </span>
                                {roleLabel(role.ten)}
                              </span>
                              <span className="mt-0.5 block text-xs font-semibold text-slate-450 leading-relaxed">
                                {role.moTa || "Quyền truy cập nghiệp vụ tương ứng."}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0 -mx-3 -mb-3 border-t border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">
                    Nhân viên đang cấu hình
                  </p>
                  <h2 className="truncate text-[17px] font-black text-slate-855">
                    {selectedUser?.hoTen || selectedUser?.tenDangNhap || "Chưa chọn nhân viên"}
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-450">
                    {selectedUser?.tenDangNhap ? `@${selectedUser.tenDangNhap}` : "Chọn nhân viên ở danh sách bên trái"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={saveUserRoles}
                    disabled={!selectedUserId || saving || loadingDetail}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0077B6] hover:bg-[#006093] hover:shadow-md hover:shadow-[#0077B6]/15 px-5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:-translate-y-0 disabled:shadow-none"
                  >
                    <Save size={14} />
                    {saving ? "Đang lưu..." : "Lưu vai trò nhân viên"}
                  </button>
                </div>
              </div>
            </section>
          ) : activeTab === "matrix" ? (
            <section className="flex h-full min-h-0 flex-col justify-between">
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="w-full">
                  <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Nghiệp vụ</th>
                          {ACTIONS.map((action) => (
                            <th key={action.key} className="w-24 px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                              {action.label}
                            </th>
                          ))}
                          <th className="w-28 px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                            Toàn quyền
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {permissionRows.map((permission) => {
                          const applicable = canRoleConfigurePermission(selectedRoleName, permission);
                          const row = applicable ? rolePermissionDraft[permission.id] || {} : {};
                          const allEnabled = applicable && ACTIONS.every((action) => row[action.key] === true);
                          return (
                            <tr
                              key={permission.id}
                              className={`group transition-all duration-150 ${
                                applicable ? "hover:bg-sky-50/20" : "bg-slate-50/70 opacity-70"
                              }`}
                            >
                              <td className="px-4 py-2">
                                <p className="font-bold text-slate-800 text-[14.5px] group-hover:text-[#0077B6] transition-colors">{featureLabel(permission)}</p>
                                {!applicable && (
                                  <p className="mt-0.5 text-xs font-bold text-rose-500">
                                    Khong ap dung cho vai tro nay
                                  </p>
                                )}
                                <p className="mt-0.5 text-xs md:text-sm font-semibold text-slate-400">Mã: {permission.maQuyen || permission.maChucNang || "N/A"}</p>
                              </td>
                              {ACTIONS.map((action) => (
                                <td key={action.key} className="px-2 py-2 text-center align-middle">
                                  <input
                                    type="checkbox"
                                    checked={applicable && row[action.key] === true}
                                    onChange={() => togglePermission(permission.id, action.key)}
                                    disabled={!applicable}
                                    className={`h-4 w-4 rounded border-slate-350 text-[#0077B6] focus:ring-[#0077B6] accent-[#0077B6] ${
                                      applicable ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                                    }`}
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-2 text-center align-middle">
                                <input
                                  type="checkbox"
                                  checked={allEnabled}
                                  onChange={(event) => setPermissionRow(permission.id, event.target.checked)}
                                  disabled={!applicable}
                                  className={`h-4 w-4 rounded border-slate-350 text-emerald-600 focus:ring-emerald-505 accent-emerald-600 ${
                                    applicable ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                                  }`}
                                  aria-label={`Cấp toàn quyền ${featureLabel(permission)}`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="shrink-0 -mx-3 -mb-3 border-t border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">
                    Cấu hình quyền vai trò
                  </p>
                  <h2 className="truncate text-[17px] font-black text-slate-855">
                    {roleLabel(selectedRoleName)}
                  </h2>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-455">
                    Chọn các quyền thao tác tương ứng cho vai trò này.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={saveRoleMatrix}
                    disabled={!selectedRoleId || saving || loadingDetail}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0077B6] hover:bg-[#006093] hover:shadow-md hover:shadow-[#0077B6]/15 px-5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:-translate-y-0 disabled:shadow-none"
                  >
                    <Save size={14} />
                    {saving ? "Đang lưu..." : "Lưu quyền vai trò"}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="flex h-full min-h-0 flex-col justify-between">
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <div className="w-full space-y-2.5">
                  {/* Header info */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-slate-900 mb-1.5">
                          <Building2 size={16} className="text-[#0077B6]" />
                          <h3 className="text-[15px] font-bold text-slate-850">Phạm vi khoa/phòng hoạt động</h3>
                        </div>
                        <p className="text-xs font-semibold text-slate-455 leading-relaxed">
                          Nhân viên chỉ có quyền truy cập, hiển thị và thực hiện nghiệp vụ trên các khoa/phòng được chỉ định dưới đây.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setAllRoomScope(true)}
                          disabled={scopeLoading || !(dataScope.rooms || []).length}
                          className="h-8 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 text-xs md:text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllRoomScope(false)}
                          disabled={scopeLoading || !roomScopeDraft.length}
                          className="h-8 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 text-xs md:text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 rounded-lg bg-blue-50/50 border border-blue-100/50 px-3 py-1.5 text-xs md:text-sm font-semibold text-[#0077B6]">
                      Đang chọn: <span className="font-extrabold">{roomScopeDraft.length}</span> phòng. Hệ thống yêu cầu phân công ít nhất 1 phòng khám/thực hiện.
                    </div>
                  </div>

                  {/* Rooms layout */}
                  {scopeLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                      <Loader2 size={24} className="animate-spin mx-auto text-slate-400" />
                      <p className="mt-3 text-xs font-bold text-slate-500">Đang tải danh sách phòng hoạt động...</p>
                    </div>
                  ) : !roomGroups.length ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                      <AlertCircle size={24} className="mx-auto text-slate-350" />
                      <p className="mt-3 text-xs font-bold text-slate-500">Chưa có phòng ban nào được cấu hình</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {roomGroups.map((group) => (
                        <div key={group.department} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
                          <div className="border-b border-slate-200 bg-slate-50/50 px-3.5 py-1.5 text-xs md:text-sm font-bold text-slate-500 uppercase tracking-wider">
                            🏢 {group.department}
                          </div>
                          <div className="grid gap-2 p-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            {group.rooms.map((room) => {
                              const roomId = Number(room.id || room.Id);
                              const checked = roomScopeDraft.includes(roomId);
                              return (
                                <label
                                  key={roomId}
                                  className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-2.5 transition-all duration-200 hover:-translate-y-[0.5px] ${
                                    checked
                                      ? "border-emerald-400 bg-emerald-50/45 shadow-sm"
                                      : "border-slate-200 bg-white hover:border-slate-350"
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleRoomScope(roomId)}
                                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] font-bold text-slate-800 group-hover:text-slate-950">
                                      {room.tenPhong || room.TenPhong || "Phòng khám"}
                                    </span>
                                    <span className="mt-0.5 block text-xs font-semibold text-slate-450">
                                      Mã: {room.maPhong || room.MaPhong || `#${roomId}`}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 -mx-3 -mb-3 border-t border-slate-200 bg-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">
                    Phạm vi khoa/phòng
                  </p>
                  <h2 className="truncate text-[17px] font-black text-slate-855">
                    {selectedUser?.hoTen || selectedUser?.tenDangNhap || "Chưa chọn nhân viên"}
                  </h2>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-455">
                    {selectedUser?.tenDangNhap ? `@${selectedUser.tenDangNhap}` : "Chọn nhân viên ở danh sách bên trái"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={saveUserDataScope}
                    disabled={!selectedUserId || saving || scopeLoading || !(dataScope.rooms || []).length || !roomScopeDraft.length}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:-translate-y-0 disabled:shadow-none"
                  >
                    <Save size={14} />
                    {saving ? "Đang lưu..." : "Lưu phạm vi khoa/phòng"}
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <NoticeModal notice={notice} onClose={() => setNotice((current) => ({ ...current, open: false }))} />
    </div>
  );
}

