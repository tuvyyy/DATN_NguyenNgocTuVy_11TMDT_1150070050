import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminHeader from "../components/AdminHeader";
import AdminFooter from "../components/AdminFooter";

export default function AdminLayout() {
  const location = useLocation();
  const fixedWorkspacePaths = [
    "/admin/users",
    "/admin/roles",
    "/admin/danh-muc-dv",
    "/admin/danh-muc-thuoc",
    "/admin/danh-muc-dvkt",
    "/admin/logs",
    "/admin/bao-cao",
  ];
  const isFixedWorkspace = fixedWorkspacePaths.includes(location.pathname);

  return (
    <div className={`admin-shell flex flex-col ${isFixedWorkspace ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <AdminHeader />

      <main className={`w-full flex-1 ${isFixedWorkspace ? "min-h-0 overflow-hidden px-0" : "px-2 sm:px-3 md:px-4"}`}>
        <div className={isFixedWorkspace ? "h-full w-full" : "w-full"}>
          <Outlet />
        </div>
      </main>

      {!isFixedWorkspace && <AdminFooter />}
    </div>
  );
}
