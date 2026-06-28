import axios from "axios";

const API_BASE = "https://localhost:7007/api";

const readUserInfoToken = (storage) => {
  try {
    const raw = storage.getItem("userInfo");
    if (!raw) return "";
    const user = JSON.parse(raw);
    return user?.accessToken || user?.token || user?.jwt || user?.access_token || "";
  } catch {
    return "";
  }
};

const getAccessToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("jwt") ||
  sessionStorage.getItem("access_token") ||
  sessionStorage.getItem("token") ||
  readUserInfoToken(localStorage) ||
  readUserInfoToken(sessionStorage);

const withAuth = (headers = {}) => {
  const token = getAccessToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

const request = async (method, path, { params, data } = {}) => {
  const res = await axios({
    method,
    url: `${API_BASE}${path}`,
    params,
    data,
    headers: withAuth({ "Content-Type": "application/json" }),
    validateStatus: () => true,
  });

  if (res.status >= 400) {
    const msg = res?.data?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return res.data;
};

export const getRoles = async () => {
  try {
    return await request("get", "/vaitro");
  } catch (err) {
    console.error("[AdminPermissionApi.getRoles]", err);
    return [];
  }
};

export const getAllUsers = async () => {
  try {
    const users = await request("get", "/users");
    return (Array.isArray(users) ? users : []).map((user) => ({
      ...user,
      roles: Array.isArray(user.roles)
        ? user.roles
        : String(user.vaiTro || "")
            .split(",")
            .map((role) => role.trim())
            .filter(Boolean),
    }));
  } catch (err) {
    console.error("[AdminPermissionApi.getAllUsers]", err);
    return [];
  }
};

export const getPermissions = async () => {
  try {
    return await request("get", "/quyen");
  } catch (err) {
    console.error("[AdminPermissionApi.getPermissions]", err);
    return [];
  }
};

export const getRolePermissions = async (roleId) => {
  try {
    return await request("get", "/users/vaitroquyen", { params: { roleId } });
  } catch (err) {
    console.error("[AdminPermissionApi.getRolePermissions]", err);
    return [];
  }
};

export const updateRolePermissions = async (roleId, updates) => {
  if (!roleId) return null;
  try {
    return await request("patch", `/users/vaitroquyen/${roleId}`, { data: updates });
  } catch (err) {
    console.error("[AdminPermissionApi.updateRolePermissions]", err);
    return null;
  }
};

export const getRoleMembers = async (roleId, roleName = "") => {
  if (!roleId) return [];
  try {
    return await request("get", `/users/vaitro/${roleId}/members`);
  } catch (err) {
    console.warn("[AdminPermissionApi.getRoleMembers] fallback to /users?role=", err?.message || err);
    if (!roleName) return [];
    try {
      const rawUsers = await request("get", "/users", { params: { role: roleName } });
      return (Array.isArray(rawUsers) ? rawUsers : []).map((u) => ({
        id: u.id,
        tenDangNhap: u.tenDangNhap,
        hoTen: u.hoTen,
        chucDanh: u.chucDanh,
        khoaPhong: u.khoaPhong,
        hoatDong: u.hoatDong !== false,
        roles: String(u.vaiTro || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      }));
    } catch (fallbackErr) {
      console.error("[AdminPermissionApi.getRoleMembers.fallback]", fallbackErr);
      return [];
    }
  }
};

export const getUserPermissions = async (userId) => {
  if (!userId) return null;
  try {
    return await request("get", `/users/${userId}/permissions`);
  } catch (err) {
    console.error("[AdminPermissionApi.getUserPermissions]", err);
    return null;
  }
};

export const updateUserRoles = async (userId, roleNames) => {
  if (!userId) return null;
  try {
    return await request("patch", `/users/${userId}/roles-audit`, { data: roleNames || [] });
  } catch (err) {
    console.error("[AdminPermissionApi.updateUserRoles]", err);
    return null;
  }
};

export const getUserDataScope = async (userId) => {
  if (!userId) return null;
  try {
    return await request("get", `/users/${userId}/data-scope`);
  } catch (err) {
    console.error("[AdminPermissionApi.getUserDataScope]", err);
    return null;
  }
};

export const updateUserDataScope = async (userId, roomIds) => {
  if (!userId) return null;
  try {
    return await request("patch", `/users/${userId}/data-scope`, {
      data: { roomIds: roomIds || [] },
    });
  } catch (err) {
    console.error("[AdminPermissionApi.updateUserDataScope]", err);
    return null;
  }
};

export const applyReceptionPreset = async (userId, preset) => {
  if (!userId || !preset) return null;
  try {
    return await request("post", `/users/${userId}/reception-preset`, {
      data: { preset },
    });
  } catch (err) {
    console.error("[AdminPermissionApi.applyReceptionPreset]", err);
    return null;
  }
};

export const cloneUserPermissions = async (sourceUserId, targetUserId) => {
  if (!sourceUserId || !targetUserId) return null;
  try {
    return await request("post", "/users/clone-permissions", {
      data: { sourceUserId, targetUserId },
    });
  } catch (err) {
    console.error("[AdminPermissionApi.cloneUserPermissions]", err);
    return null;
  }
};

export const getUserPermissionConflicts = async (userId) => {
  if (!userId) return null;
  try {
    return await request("get", `/users/${userId}/permission-conflicts`);
  } catch (err) {
    console.error("[AdminPermissionApi.getUserPermissionConflicts]", err);
    return null;
  }
};

export const getPermissionAuditLogs = async ({ userId, roleId, take = 40 } = {}) => {
  try {
    const params = { take };
    if (userId) params.userId = userId;
    if (roleId) params.roleId = roleId;
    return await request("get", "/users/permission-audit", { params });
  } catch (err) {
    console.error("[AdminPermissionApi.getPermissionAuditLogs]", err);
    return [];
  }
};

export const undoLastPermissionChange = async ({ userId, roleId } = {}) => {
  if (!userId && !roleId) return null;
  try {
    return await request("post", "/users/permission-undo-last", {
      data: { userId: userId || null, roleId: roleId || null },
    });
  } catch (err) {
    console.error("[AdminPermissionApi.undoLastPermissionChange]", err);
    return null;
  }
};

export const checkUserPermission = async (userId, feature, action) => {
  if (!userId || !feature || !action) return false;
  try {
    const data = await request("get", `/users/${userId}/can`, {
      params: { feature, action },
    });
    return !!data?.allowed;
  } catch (err) {
    console.error("[AdminPermissionApi.checkUserPermission]", err);
    return false;
  }
};
