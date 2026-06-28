import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export default function ModalChiDinhDVKTFilter({
  filterLoai,
  setFilterLoai,
  search,
  setSearch,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const options = [
    { value: "all", label: "Tất cả loại phiếu" },
    { value: "1", label: "Xét nghiệm" },
    { value: "2", label: "Chẩn đoán hình ảnh" },
    { value: "3", label: "Kỹ thuật khác" },
  ];

  const currentOption = options.find((x) => x.value === filterLoai) || options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex gap-3 items-center shrink-0">
      {/* Custom Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-9 min-w-[170px] rounded-lg border bg-white px-3.5 text-sm text-slate-700 outline-none flex items-center justify-between gap-2 transition-all duration-200 font-semibold ${
            isOpen
              ? "border-[#0077B6] ring-4 ring-[#0077B6]/10 -translate-y-[1px]"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <span>{currentOption.label}</span>
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-185 text-[#0077B6]" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-1.5 z-50 bg-white border border-[#0077B6]/10 rounded-xl shadow-[0_12px_36px_-6px_rgba(0,119,182,0.2)] py-1.5 w-52 animate-fadeIn">
            {options.map((opt) => {
              const isSelected = opt.value === filterLoai;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFilterLoai(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition-colors duration-150 ${
                    isSelected
                      ? "bg-blue-50 text-[#0077B6]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} className="text-[#0077B6] stroke-[2.5]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Search size={15} />
        </span>
        <input
          type="text"
          placeholder="Tìm dịch vụ cần chỉ định..."
          className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 font-semibold hover:border-slate-350"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
}
