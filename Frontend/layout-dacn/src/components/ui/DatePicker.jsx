import React, { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function DatePicker({ value, onChange, placeholder = "Chọn ngày...", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse YYYY-MM-DD into a Date object or use current date for calendar navigation
  const getInitialDate = () => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate);
  const selectedDate = value ? getInitialDate() : null;

  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setCurrentDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Calendar math
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday...

  // Days from previous month to fill the first week row
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prevMonthCells = [];
  for (let i = startDayIndex - 1; i >= 0; i--) {
    prevMonthCells.push({
      day: prevMonthDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false,
    });
  }

  // Days in current month
  const currentMonthCells = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthCells.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true,
    });
  }

  // Days for next month to fill out grid (typically 6 rows * 7 days = 42 cells)
  const totalCells = prevMonthCells.length + currentMonthCells.length;
  const nextMonthCells = [];
  const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let i = 1; i <= remaining; i++) {
    nextMonthCells.push({
      day: i,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false,
    });
  }

  const allCells = [...prevMonthCells, ...currentMonthCells, ...nextMonthCells];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (cell) => {
    const formattedMonth = String(cell.month + 1).padStart(2, "0");
    const formattedDay = String(cell.day).padStart(2, "0");
    const formattedValue = `${cell.year}-${formattedMonth}-${formattedDay}`;
    onChange(formattedValue);
    setIsOpen(false);
  };

  const formatDisplayDate = () => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  };

  const isToday = (cell) => {
    const today = new Date();
    return today.getDate() === cell.day && today.getMonth() === cell.month && today.getFullYear() === cell.year;
  };

  const isSelected = (cell) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === cell.day && selectedDate.getMonth() === cell.month && selectedDate.getFullYear() === cell.year;
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
  };

  const monthNames = [
    "Tháng 1",
    "Tháng 2",
    "Tháng 3",
    "Tháng 4",
    "Tháng 5",
    "Tháng 6",
    "Tháng 7",
    "Tháng 8",
    "Tháng 9",
    "Tháng 10",
    "Tháng 11",
    "Tháng 12",
  ];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white pl-3 pr-3.5 py-2 text-sm font-semibold text-slate-700 outline-none shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10"
      >
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span className={value ? "text-slate-800" : "text-slate-400 font-medium"}>
            {formatDisplayDate() || placeholder}
          </span>
        </div>
        {value ? (
          <span
            onClick={handleClear}
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={12} />
          </span>
        ) : (
          <Calendar size={14} className="text-slate-300 opacity-0 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-40 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black text-slate-800">
              {monthNames[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, idx) => (
              <span
                key={day}
                className={`text-[9px] font-extrabold uppercase tracking-wider ${
                  idx === 0 ? "text-rose-500" : "text-slate-400"
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {allCells.map((cell, idx) => {
              const selected = isSelected(cell);
              const today = isToday(cell);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                    !cell.isCurrentMonth
                      ? "text-slate-300 hover:bg-slate-50/50"
                      : selected
                      ? "bg-[#0077B6] text-white shadow-sm shadow-[#0077B6]/15"
                      : today
                      ? "bg-slate-100 text-[#0077B6] border border-[#0077B6]/30"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
