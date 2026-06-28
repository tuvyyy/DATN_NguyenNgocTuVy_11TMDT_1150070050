import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "https://localhost:7007/api";

const DEFAULT_PERMISSIONS = {
  canView: false,
  canAdd: false,
  canEdit: false,
  canDelete: false,
  canExport: false,
  loading: true,
};

const deniedPermissions = () => ({ ...DEFAULT_PERMISSIONS, loading: false });

const readUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem("userInfo") || "{}");
  } catch {
    return {};
  }
};

const getTokenFromUserInfo = () => {
  const read = (storage) => {
    try {
      const raw = storage.getItem("userInfo");
      if (!raw) return "";
      const user = JSON.parse(raw);
      return user?.accessToken || user?.token || user?.jwt || user?.access_token || "";
    } catch {
      return "";
    }
  };

  return read(localStorage) || read(sessionStorage);
};

const getAccessToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("token") ||
  localStorage.getItem("jwt") ||
  sessionStorage.getItem("access_token") ||
  sessionStorage.getItem("token") ||
  getTokenFromUserInfo();

export function usePermission(feature) {
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);

  useEffect(() => {
    const user = readUserInfo();
    const userId = user?.userId || user?.id || user?.Id;
    const token = getAccessToken();

    if (!feature || !userId) {
      setPermissions(deniedPermissions());
      return;
    }

    let ignore = false;

    const load = async () => {
      try {
        const actions = ["xem", "them", "sua", "xoa", "xuat"];
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const results = await Promise.all(
          actions.map(async (action) => {
            const res = await axios.get(`${API_BASE}/users/${userId}/can`, {
              params: { feature, action },
              headers,
              validateStatus: () => true,
            });

            if (res.status >= 400) return null;
            return !!res.data?.allowed;
          })
        );

        if (ignore) return;

        if (results.some((x) => x === null)) {
          setPermissions(deniedPermissions());
          return;
        }

        setPermissions({
          canView: !!results[0],
          canAdd: !!results[1],
          canEdit: !!results[2],
          canDelete: !!results[3],
          canExport: !!results[4],
          loading: false,
        });
      } catch (err) {
        if (ignore) return;
        console.error("[usePermission] Cannot load permissions.", err);
        setPermissions(deniedPermissions());
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [feature]);

  return permissions;
}
