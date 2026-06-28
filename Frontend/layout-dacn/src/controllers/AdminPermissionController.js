import {
  applyReceptionPreset,
  checkUserPermission,
  cloneUserPermissions,
  getPermissionAuditLogs,
  getPermissions,
  getRoleMembers,
  getRolePermissions,
  getRoles,
  getUserPermissionConflicts,
  getUserPermissions,
  updateRolePermissions,
  updateUserRoles,
  undoLastPermissionChange,
} from "../api/AdminPermissionApi";

export async function loadPermissionData(setRoles, setPermissions) {
  try {
    const [roles, permissions] = await Promise.all([getRoles(), getPermissions()]);
    setRoles(Array.isArray(roles) ? roles : []);
    setPermissions(Array.isArray(permissions) ? permissions : []);
    return { ok: true, message: "Tải dữ liệu thành công." };
  } catch (err) {
    console.error("[AdminPermissionController.loadPermissionData]", err);
    setRoles([]);
    setPermissions([]);
    return { ok: false, message: "Không tải được danh sách vai trò hoặc quyền." };
  }
}

export async function handleRoleSelect(roleId, setSelectedRole, setRolePermissions) {
  if (!roleId) return { ok: false, message: "Thiếu vai trò." };
  try {
    setSelectedRole(roleId);
    const data = await getRolePermissions(roleId);

    const formatted = (Array.isArray(data) ? data : []).map((p) => ({
      idQuyen: p.idQuyen,
      maQuyen: p.maQuyen,
      tenChucNang: p.tenChucNang || p.chucNang || "Chưa phân nhóm",
      maChucNang: p.maChucNang || "",
      xem: p.xem ?? false,
      them: p.them ?? false,
      sua: p.sua ?? false,
      xoa: p.xoa ?? false,
      xuat: p.xuat ?? false,
    }));

    setRolePermissions(formatted);
    return { ok: true, message: "Tải quyền vai trò thành công." };
  } catch (err) {
    console.error("[AdminPermissionController.handleRoleSelect]", err);
    setRolePermissions([]);
    return { ok: false, message: "Không tải được quyền của vai trò này." };
  }
}

export async function handleLoadRoleMembers(roleId, roleName, setMembers) {
  if (!roleId) return { ok: false, message: "Thiếu vai trò." };
  try {
    const data = await getRoleMembers(roleId, roleName);
    setMembers(Array.isArray(data) ? data : []);
    return { ok: true, message: "Tải danh sách nhân viên thành công." };
  } catch (err) {
    console.error("[AdminPermissionController.handleLoadRoleMembers]", err);
    setMembers([]);
    return { ok: false, message: "Không tải được danh sách nhân viên theo vai trò." };
  }
}

export async function handleUpdateRolePermissions(roleId, selectedUpdates) {
  if (!roleId) {
    return { ok: false, message: "Chưa chọn vai trò cần cập nhật." };
  }
  try {
    const res = await updateRolePermissions(roleId, selectedUpdates);
    if (res?.message) {
      return { ok: true, message: res.message };
    }
    return { ok: false, message: "Cập nhật quyền thất bại." };
  } catch (err) {
    console.error("[AdminPermissionController.handleUpdateRolePermissions]", err);
    return { ok: false, message: "Có lỗi khi cập nhật quyền vai trò." };
  }
}

export async function handleGetUserPermissions(userId, setUserPermissions) {
  if (!userId) {
    setUserPermissions(null);
    return { ok: false, message: "Chưa chọn nhân viên." };
  }
  try {
    const res = await getUserPermissions(userId);
    setUserPermissions(res || null);
    return { ok: true, message: "Tải quyền nhân viên thành công." };
  } catch (err) {
    console.error("[AdminPermissionController.handleGetUserPermissions]", err);
    setUserPermissions(null);
    return { ok: false, message: "Không tải được quyền nhân viên." };
  }
}

export async function handleUpdateUserRoles(userId, roleNames) {
  if (!userId) return { ok: false, message: "Chưa chọn nhân viên." };
  try {
    const res = await updateUserRoles(userId, roleNames);
    if (res?.message) {
      return { ok: true, message: res.message };
    }
    return { ok: false, message: "Cập nhật vai trò người dùng thất bại." };
  } catch (err) {
    console.error("[AdminPermissionController.handleUpdateUserRoles]", err);
    return { ok: false, message: "Có lỗi khi cập nhật vai trò người dùng." };
  }
}

export async function handleCheckUserPermission(userId, feature, action) {
  if (!userId || !feature || !action) return false;
  try {
    return await checkUserPermission(userId, feature, action);
  } catch (err) {
    console.error("[AdminPermissionController.handleCheckUserPermission]", err);
    return false;
  }
}

export async function handleApplyReceptionPreset(userId, preset) {
  if (!userId || !preset) return { ok: false, message: "Thiếu dữ liệu preset." };
  try {
    const res = await applyReceptionPreset(userId, preset);
    if (res?.message) return { ok: true, message: res.message, data: res };
    return { ok: false, message: "Áp dụng preset thất bại." };
  } catch (err) {
    console.error("[AdminPermissionController.handleApplyReceptionPreset]", err);
    return { ok: false, message: "Không thể áp dụng preset quyền." };
  }
}

export async function handleCloneUserPermissions(sourceUserId, targetUserId) {
  if (!sourceUserId || !targetUserId) return { ok: false, message: "Thiếu user nguồn hoặc đích." };
  try {
    const res = await cloneUserPermissions(sourceUserId, targetUserId);
    if (res?.message) return { ok: true, message: res.message, data: res };
    return { ok: false, message: "Clone quyền thất bại." };
  } catch (err) {
    console.error("[AdminPermissionController.handleCloneUserPermissions]", err);
    return { ok: false, message: "Không thể clone quyền giữa hai nhân viên." };
  }
}

export async function handleGetUserPermissionConflicts(userId, setConflicts) {
  if (!userId) {
    setConflicts(null);
    return { ok: false, message: "Thiếu user." };
  }
  try {
    const res = await getUserPermissionConflicts(userId);
    setConflicts(res || null);
    return { ok: true, data: res };
  } catch (err) {
    console.error("[AdminPermissionController.handleGetUserPermissionConflicts]", err);
    setConflicts(null);
    return { ok: false, message: "Không tải được cảnh báo xung đột quyền." };
  }
}

export async function handleGetPermissionAuditLogs(filters, setLogs) {
  try {
    const logs = await getPermissionAuditLogs(filters || {});
    setLogs(Array.isArray(logs) ? logs : []);
    return { ok: true };
  } catch (err) {
    console.error("[AdminPermissionController.handleGetPermissionAuditLogs]", err);
    setLogs([]);
    return { ok: false, message: "Không tải được lịch sử thay đổi quyền." };
  }
}

export async function handleUndoLastPermissionChange(payload) {
  try {
    const res = await undoLastPermissionChange(payload || {});
    if (res?.message) return { ok: true, message: res.message, data: res };
    return { ok: false, message: "Hoàn tác thay đổi quyền thất bại." };
  } catch (err) {
    console.error("[AdminPermissionController.handleUndoLastPermissionChange]", err);
    return { ok: false, message: "Không thể hoàn tác thay đổi quyền gần nhất." };
  }
}
