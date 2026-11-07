import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import AdminHeader from "../components/AdminHeader";
import AdminFooter from "../components/AdminFooter";
import PageTransition from "../components/PageTransition";

export default function AdminLayout() {
  const location = useLocation();
  const fixedWorkspacePaths = [
    "/admin/users",
    "/admin/roles",
    "/admin/danh-muc-dv",
    "/admin/danh-muc-thuoc",
    "/admin/danh-muc-dvkt",
    "/admin/logs",
  ];
  const isFixedWorkspace = fixedWorkspacePaths.includes(location.pathname);

  return (
    <div className={`app-page-bg flex flex-col ${isFixedWorkspace ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <AdminHeader />

      <main className={`w-full flex-1 ${isFixedWorkspace ? "min-h-0 overflow-hidden px-0" : "px-2 sm:px-3 md:px-4"}`}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname} fullHeight={isFixedWorkspace}>
            <div className={isFixedWorkspace ? "h-full w-full" : "w-full"}>
              <Outlet />
            </div>
          </PageTransition>
        </AnimatePresence>
      </main>

      {!isFixedWorkspace && <AdminFooter />}
    </div>
  );
}
