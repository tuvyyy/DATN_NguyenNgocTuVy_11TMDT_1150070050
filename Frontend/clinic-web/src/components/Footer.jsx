import React from "react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0077b6] text-white py-2.5 mt-4 border-t border-white/10 shadow-inner overflow-hidden select-none">
      {/* eslint-disable-next-line jsx-a11y/no-distracting-elements */}
      <marquee behavior="scroll" direction="left" scrollamount="5" className="text-xs font-semibold tracking-wide">
        Bệnh viện Chợ Rẫy – Chăm sóc sức khỏe, tận tâm phục vụ – Hotline: 036 887 8419 – Làm việc tất cả các ngày trong tuần từ 07h00 đến 20h00
      </marquee>
    </footer>
  );
}
