import React from "react";

export default function AdminFooter() {
  return (
    <footer className="mt-6 border-t border-sky-100 bg-white/70 py-3 text-center text-sm text-slate-500 backdrop-blur-md">
      © {new Date().getFullYear()} Trung tâm quản trị hệ thống — tiuv clinic
      <span className="text-sky-500"> | Built with care</span>
    </footer>
  );
}
