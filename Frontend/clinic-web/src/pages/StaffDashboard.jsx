import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  Calendar,
  CalendarCheck2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileSpreadsheet,
  Stethoscope,
  UserPlus,
  Lock,
  Sun,
  CloudSun,
  Sunset,
  Moon,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import { getEncounterListV2, getEncounterStatsV2 } from "../api/TiepDonApi";
import { usePermission } from "../hooks/UsePermission";

const TEXT = {
  dashboard: "B\u1ea3ng \u0111i\u1ec1u khi\u1ec3n",
  hello: "Xin ch\u00e0o",
  shift: "Ca l\u00e0m vi\u1ec7c: 07:00 - 20:00",
  chooseToday: "Ch\u1ecdn nghi\u1ec7p v\u1ee5 c\u1ea7n x\u1eed l\u00fd trong ng\u00e0y.",
  workHome: "Trang ch\u1ee7 nghi\u1ec7p v\u1ee5",
  workHint: "C\u00e1c t\u00e1c v\u1ee5 th\u01b0\u1eddng d\u00f9ng \u0111\u01b0\u1ee3c \u0111\u1eb7t tr\u1ef1c ti\u1ebfp \u0111\u1ec3 thao t\u00e1c nhanh h\u01a1n.",
  chooseModule: "Ch\u1ecdn module \u0111\u1ec3 b\u1eaft \u0111\u1ea7u thao t\u00e1c",
  active: "\u0110ang ch\u1ecdn",
  noPermission: "Kh\u00f4ng c\u00f3 quy\u1ec1n",
  noPermissionTitle: "T\u00e0i kho\u1ea3n Ti\u1ebfp \u0111\u00f3n kh\u00f4ng c\u00f3 quy\u1ec1n truy c\u1eadp ch\u1ee9c n\u0103ng n\u00e0y.",
  receptionWork: "Nghi\u1ec7p v\u1ee5 ti\u1ebfp \u0111\u00f3n",
};

const decodeEscapedUnicode = (value) => {
  if (typeof value !== "string" || !value.includes("\\u")) return value;
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
};

const getTodayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const MODULE_CONFIG = [
  {
    key: "reception",
    title: "Tiếp đón bệnh nhân",
    subtitle: "Nhập hồ sơ & quản lý tiếp đón",
    icon: UserPlus,
    allowedRoles: ["TIEP_DON", "ADMIN"],
    guideText: "Xem các tác vụ tiếp đón →",
  },
  {
    key: "doctor",
    title: "Khám bệnh",
    subtitle: "Khám, chẩn đoán & chỉ định",
    icon: Stethoscope,
    path: "/bac-si",
    allowedRoles: ["BAC_SI", "ADMIN"],
    guideText: "Truy cập buồng khám →",
  },
  {
    key: "cashier",
    title: "Thu ngân",
    subtitle: "Thanh toán viện phí & dịch vụ",
    icon: DollarSign,
    path: "/thu-ngan",
    allowedRoles: ["THU_NGAN", "ADMIN"],
    guideText: "Mở quầy thu ngân →",
  },
  {
    key: "cls",
    title: "Cận lâm sàng",
    subtitle: "Thực hiện dịch vụ kỹ thuật",
    icon: CalendarCheck2,
    path: "/can-lam-sang",
    allowedRoles: ["KY_THUAT_VIEN", "KTV", "CAN_LAM_SANG", "ADMIN"],
    guideText: "Truy cập khu kỹ thuật →",
  },
  {
    key: "report",
    title: "Xu\u1ea5t b\u00e1o c\u00e1o",
    subtitle: "T\u1ea3i b\u00e1o c\u00e1o theo vai tr\u00f2",
    icon: FileSpreadsheet,
    path: "/bao-cao",
    allowedRoles: [
      "TIEP_DON",
      "TIEP_DON_PRESET_FULL",
      "TIEP_DON_PRESET_CHI_XEM",
      "THU_NGAN",
      "BAC_SI",
      "KY_THUAT_VIEN",
      "KTV",
      "CAN_LAM_SANG",
      "ADMIN",
    ],
    guideText: "M\u1edf b\u00e1o c\u00e1o ->",
  },
];

const RECEPTION_MENU_ITEMS = [
  { key: "input", title: "Nhập tiếp đón", path: "/tiep-don/nhap", icon: UserPlus },
  { key: "list", title: "Người bệnh đã tiếp đón", path: "/tiep-don/danh-sach", icon: ClipboardList },
  { key: "cancelled", title: "Hồ sơ hủy tiếp đón", path: "/tiep-don/huy", icon: Ban },
  { key: "appointments", title: "Lịch hẹn", path: "/tiep-don/danh-sach?tab=appointments", icon: Calendar },
];

const STAT_CARD_CONFIG = [
  { key: "today", label: "Tiếp đón hôm nay" },
  { key: "waitingService", label: "Chờ dịch vụ" },
  { key: "waitingExam", label: "Chờ khám" },
  { key: "cancelled", label: "Hồ sơ hủy" },
];

const TREND_CONFIG = {
  today: { text: "↑ 8.2%", class: "text-emerald-600 bg-emerald-50 border-emerald-100/50" },
  waitingService: { text: "↓ 4.1%", class: "text-emerald-600 bg-emerald-50 border-emerald-100/50" },
  waitingExam: { text: "↑ 12.5%", class: "text-sky-600 bg-sky-50 border-sky-100/50" },
  cancelled: { text: "↓ 2 hồ sơ", class: "text-emerald-600 bg-emerald-50 border-emerald-100/50" },
};

const THEME_CONFIG = {
  reception: {
    borderActive: "border-sky-500 bg-white shadow-md ring-1 ring-sky-500/20",
    borderDefault: "border-slate-200 bg-white hover:border-sky-400 hover:shadow-md",
    iconBg: "bg-sky-50 text-sky-600 border border-sky-100",
    textColor: "text-sky-600",
  },
  doctor: {
    borderActive: "border-emerald-500 bg-white shadow-md ring-1 ring-emerald-500/20",
    borderDefault: "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md",
    iconBg: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    textColor: "text-emerald-600",
  },
  cashier: {
    borderActive: "border-amber-500 bg-white shadow-md ring-1 ring-amber-500/20",
    borderDefault: "border-slate-200 bg-white hover:border-amber-400 hover:shadow-md",
    iconBg: "bg-amber-50 text-amber-600 border border-amber-100",
    textColor: "text-amber-600",
  },
  cls: {
    borderActive: "border-indigo-500 bg-white shadow-md ring-1 ring-indigo-500/20",
    borderDefault: "border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md",
    iconBg: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    textColor: "text-indigo-600",
  },
  report: {
    borderActive: "border-cyan-500 bg-white shadow-md ring-1 ring-cyan-500/20",
    borderDefault: "border-slate-200 bg-white hover:border-cyan-400 hover:shadow-md",
    iconBg: "bg-cyan-50 text-cyan-600 border border-cyan-100",
    textColor: "text-cyan-600",
  },
};


export default function StaffDashboard() {
  const navigate = useNavigate();
  const receptionWrapperRef = useRef(null);
  const closeTimerRef = useRef(null);

  const [selectedModule, setSelectedModule] = useState(null);
  const [isReceptionHovered, setIsReceptionHovered] = useState(false);
  const [isReceptionMenuPinned, setIsReceptionMenuPinned] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    waitingService: 0,
    waitingExam: 0,
    cancelled: 0,
  });

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  
  const dateString = time.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const greeting = useMemo(() => {
    const hour = time.getHours();
    if (hour >= 5 && hour < 12) return { text: "Chào buổi sáng", icon: Sun, color: "text-amber-500", glowBg: "bg-amber-400", gradId: "grad-amber" };
    if (hour >= 12 && hour < 15) return { text: "Chào buổi trưa", icon: CloudSun, color: "text-orange-500", glowBg: "bg-orange-400", gradId: "grad-orange" };
    if (hour >= 15 && hour < 18) return { text: "Chào buổi chiều", icon: Sunset, color: "text-amber-600", glowBg: "bg-amber-500", gradId: "grad-amber" };
    return { text: "Chào buổi tối", icon: Moon, color: "text-indigo-500", glowBg: "bg-indigo-400", gradId: "grad-indigo" };
  }, [time]);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "{}");
    } catch {
      return {};
    }
  }, []);

  const roles = useMemo(() => (Array.isArray(user?.roles) ? user.roles : []), [user?.roles]);
  const doctorPermission = usePermission("KHAM_BENH");
  const receptionPermission = usePermission("TIEP_DON");
  const cashierPermission = usePermission("THANH_TOAN");
  const clsPermission = usePermission("DVKT");
  const reportPermission = usePermission("BAO_CAO");
  const canUseReception =
    !!receptionPermission.canView || roles.includes("TIEP_DON") || roles.includes("ADMIN");
  const userDisplayName = decodeEscapedUnicode(user?.fullName || user?.hoTen || user?.tenDangNhap || "recep1");

  const isReceptionMenuOpen = canUseReception && (isReceptionHovered || isReceptionMenuPinned);
  const shouldDimOthers = isReceptionMenuOpen;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!isReceptionMenuPinned) return;
      if (!receptionWrapperRef.current) return;
      if (receptionWrapperRef.current.contains(event.target)) return;
      setIsReceptionMenuPinned(false);
      setIsReceptionHovered(false);
      if (selectedModule === "reception") setSelectedModule(null);
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [isReceptionMenuPinned, selectedModule]);

  const clearCloseTimer = () => {
    if (!closeTimerRef.current) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openReceptionMenu = () => {
    clearCloseTimer();
    setIsReceptionHovered(true);
  };

  const closeReceptionMenuWithDelay = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsReceptionHovered(false);
      if (!isReceptionMenuPinned && selectedModule === "reception") {
        setSelectedModule(null);
      }
    }, 160);
  };

  useEffect(() => {
    if (!canUseReception) {
      setStatsLoading(false);
      return;
    }

    let ignore = false;
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const todayKey = getTodayKey();
        const [summary, waitingExamRes] = await Promise.all([
          getEncounterStatsV2({ date: todayKey }),
          getEncounterListV2({ tab: "today", date: todayKey, status: "CHO_KHAM", page: 1, pageSize: 1 }),
        ]);

        if (ignore) return;
        setStats({
          today: Number(summary?.total) || 0,
          waitingService: Number(summary?.waitingService) || 0,
          waitingExam: Number(waitingExamRes?.total) || 0,
          cancelled: Number(summary?.cancelled) || 0,
        });
      } catch {
        if (!ignore) {
          setStats({ today: 0, waitingService: 0, waitingExam: 0, cancelled: 0 });
        }
      } finally {
        if (!ignore) setStatsLoading(false);
      }
    };

    loadStats();
    return () => {
      ignore = true;
    };
  }, [canUseReception]);

  const statsItems = STAT_CARD_CONFIG.map((item) => ({
    ...item,
    value: stats[item.key] ?? 0,
  }));

  return (
    <MainLayout>
      <div className="min-h-[calc(100vh-64px)] overflow-y-auto px-4 pb-16 pt-6 md:px-6 relative transition-all duration-300 bg-slate-50">
        <div className="mx-auto w-full max-w-[1680px] relative z-10 animate-fadeIn">
          
          {/* Greeting Banner */}
          <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f4c81] via-[#0077b6] to-[#0096c7] p-6 text-white shadow-sm border-none relative">
            <div className="absolute inset-0 db-banner-grid opacity-25 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 hidden sm:flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white">
                  <greeting.icon size={26} className="stroke-[2]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-200 bg-black/25 border border-white/10 px-2.5 py-0.5 rounded-full">
                      {greeting.text}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-100 bg-black/25 border border-white/10 px-2.5 py-0.5 rounded-full">
                      {TEXT.shift}
                    </span>
                  </div>
                  <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                    {TEXT.hello}, <span className="text-sky-200">{userDisplayName}</span>
                  </h1>
                  <p className="mt-1 text-sm text-slate-100 font-medium">
                    {TEXT.chooseToday}
                  </p>
                </div>
              </div>
              
              {/* Dynamic Clock Widget */}
              <div className="flex flex-col md:items-end bg-black/25 border border-white/10 rounded-xl p-3.5 min-w-[220px]">
                <p className="text-2xl font-bold font-mono tracking-wider text-white select-none">
                  {timeString}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-sky-200 capitalize select-none">
                  {dateString}
                </p>
              </div>
            </div>
          </section>

          {/* Stat Cards */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statsItems.map((item) => {
              let iconInfo = { 
                icon: UserPlus, 
                bg: "bg-sky-50 text-sky-600 border-sky-100", 
                topLine: "bg-sky-500" 
              };
              let sparklineD = "M0,15 L20,15 L24,11 L28,21 L32,15 L40,15 L43,3 L47,27 L51,15 L56,15 L59,12 L62,17 L65,15 L100,15"; // default heartbeat
              let sparklineColor = "#0ea5e9";

              if (item.key === "waitingService") {
                iconInfo = { 
                  icon: ClipboardList, 
                  bg: "bg-amber-50 text-amber-600 border-amber-100", 
                  topLine: "bg-amber-500" 
                };
                sparklineD = "M0,25 L15,22 Q25,24 35,18 T55,14 T75,8 T100,3";
                sparklineColor = "#f59e0b";
              } else if (item.key === "waitingExam") {
                iconInfo = { 
                  icon: Stethoscope, 
                  bg: "bg-emerald-50 text-emerald-600 border-emerald-100/50", 
                  topLine: "bg-emerald-500" 
                };
                sparklineD = "M0,15 L30,15 L33,12 L36,18 L39,15 L43,15 L46,6 L50,24 L54,15 L58,15 L61,13 L64,17 L67,15 L100,15";
                sparklineColor = "#10b981";
              } else if (item.key === "cancelled") {
                iconInfo = { 
                  icon: Ban, 
                  bg: "bg-rose-50 text-rose-600 border-rose-100", 
                  topLine: "bg-rose-500" 
                };
                sparklineD = "M0,5 L20,7 Q30,5 40,12 L43,8 L47,20 L51,14 L65,18 L80,24 L100,27";
                sparklineColor = "#f43f5e";
              }
              const Icon = iconInfo.icon;
              
              const trend = TREND_CONFIG[item.key] || { text: "", class: "" };
              
              return (
                <div
                  key={item.key}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Accent Top Border */}
                  <span className={`absolute top-0 left-0 right-0 h-1 ${iconInfo.topLine}`} />
                  <span className="absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                  
                  <div className="flex items-start justify-between relative z-10">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">{item.label}</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <p className="text-3xl font-extrabold text-slate-800 leading-none">
                          {statsLoading ? (
                            <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-100" />
                          ) : (
                            item.value
                          )}
                        </p>
                        {!statsLoading && trend.text && (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${trend.class}`}>
                            {trend.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconInfo.bg} shadow-sm group-hover:scale-105 transition-transform duration-200`}>
                      <Icon size={20} className="stroke-[2.2]" />
                    </div>
                  </div>

                  {/* Sparkline Graphic (Crisp line, no blurs) */}
                  <div className="mt-4 h-8 w-full relative z-10 overflow-hidden pointer-events-none opacity-45">
                    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                      <path
                        d={sparklineD}
                        fill="none"
                        stroke={sparklineColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="db-sparkline-path"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Quick Action Modules */}
          <section>
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{TEXT.workHome}</h2>
                <p className="text-sm text-slate-400">{TEXT.workHint}</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">{TEXT.chooseModule}</span>
            </div>

            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {MODULE_CONFIG.map((module) => {
                const Icon = module.icon;
                const allowed =
                  module.key === "doctor"
                    ? !!doctorPermission.canView
                    : module.key === "reception"
                      ? !!receptionPermission.canView
                      : module.key === "cashier"
                        ? !!cashierPermission.canView
                        : module.key === "cls"
                          ? !!clsPermission.canView
                          : module.key === "report"
                            ? !!reportPermission.canView
                            : module.allowedRoles.some((role) => roles.includes(role));
                
                const isReceptionModule = module.key === "reception";
                const shouldDimCard = shouldDimOthers && !isReceptionModule;
                const isPinned = isReceptionMenuPinned && selectedModule === "reception";
                const isReceptionActive = isReceptionMenuOpen || isPinned;
                const theme = THEME_CONFIG[module.key];

                if (isReceptionModule) {
                  return (
                    <div
                      key={module.key}
                      ref={receptionWrapperRef}
                      className="relative"
                      onMouseEnter={openReceptionMenu}
                      onMouseLeave={closeReceptionMenuWithDelay}
                      onFocusCapture={openReceptionMenu}
                      onBlurCapture={(event) => {
                        if (isReceptionMenuPinned) return;
                        if (event.currentTarget.contains(event.relatedTarget)) return;
                        closeReceptionMenuWithDelay();
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!canUseReception) return;
                          setSelectedModule("reception");
                          setIsReceptionMenuPinned((prev) => !prev);
                          openReceptionMenu();
                        }}
                        className={`group relative flex h-32 w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                          shouldDimCard ? "opacity-40 scale-[0.98]" : "opacity-100"
                        } ${
                          isReceptionActive
                            ? theme.borderActive
                            : theme.borderDefault
                        }`}
                        aria-label={module.title}
                      >
                        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${theme.iconBg} transition-all duration-200`}>
                          <Icon size={24} className="relative z-10" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold text-slate-800">{module.title}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400 leading-relaxed">{module.subtitle}</p>
                        </div>

                        {/* Interactive Guide Text */}
                        <div className={`absolute bottom-3 left-5 text-[11px] font-bold ${theme.textColor} opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0`}>
                          {module.guideText}
                        </div>

                        {isReceptionActive && (
                          <span className="absolute right-3 top-3 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            {TEXT.active}
                          </span>
                        )}
                      </button>

                      {/* Dropdown Popover with solid background */}
                      <div
                        className={`absolute left-0 top-[calc(100%+10px)] z-40 w-[304px] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg transition-all duration-200 md:left-[calc(100%+14px)] md:top-1/2 md:-translate-y-1/2 ${
                          isReceptionMenuOpen
                            ? "visible translate-y-0 opacity-100"
                            : "pointer-events-none invisible -translate-y-1 opacity-0"
                        }`}
                        role="menu"
                        aria-label={TEXT.receptionWork}
                      >
                        <span className="absolute -top-1.5 left-10 h-3 w-3 rotate-45 border-l border-t border-slate-200 bg-white md:left-[-7px] md:top-1/2 md:-translate-y-1/2 md:rotate-[-45deg]" />
                        <h3 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">{TEXT.receptionWork}</h3>
                        <div className="space-y-0.5">
                          {RECEPTION_MENU_ITEMS.map((item) => {
                            const ItemIcon = item.icon;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onMouseDown={() => navigate(item.path)}
                                className="group/item flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-sky-600 font-semibold"
                                title={item.title}
                                aria-label={item.title}
                              >
                                <span className="inline-flex min-w-0 items-center gap-2.5">
                                  <ItemIcon size={16} className="shrink-0 text-slate-500 group-hover/item:text-sky-600 transition-colors" />
                                  <span className="truncate font-semibold">{item.title}</span>
                                </span>
                                <ChevronRight size={14} className="text-slate-400 transition-transform duration-200 group-hover/item:translate-x-0.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    key={module.key}
                    type="button"
                    title={allowed ? module.title : TEXT.noPermissionTitle}
                    aria-label={module.title}
                    onClick={() => {
                      setSelectedModule(module.key);
                      if (allowed && module.path) navigate(module.path);
                    }}
                    className={`group relative flex h-32 w-full items-start gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                      shouldDimCard ? "opacity-40 scale-[0.98]" : "opacity-100"
                    } ${
                      allowed
                        ? theme.borderDefault
                        : "cursor-not-allowed border-slate-200 bg-slate-100/50 opacity-60"
                    }`}
                  >
                    <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${allowed ? theme.iconBg : "bg-slate-100 text-slate-400 border-slate-200"} transition-all duration-200`}>
                      {allowed ? (
                        <Icon size={24} className="relative z-10" strokeWidth={2} />
                      ) : (
                        <Lock size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-base font-bold ${allowed ? "text-slate-800" : "text-slate-400"}`}>{module.title}</p>
                      <p className={`mt-1 text-xs font-semibold ${allowed ? "text-slate-400" : "text-slate-400"} leading-relaxed`}>{module.subtitle}</p>
                    </div>

                    {/* Interactive Guide Text */}
                    {allowed ? (
                      <div className={`absolute bottom-3 left-5 text-[11px] font-bold ${theme.textColor} opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0`}>
                        {module.guideText}
                      </div>
                    ) : (
                      <div className="absolute bottom-3 left-5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400/80">
                        <Lock size={10} /> Liên hệ Quản trị viên để mở khóa
                      </div>
                    )}

                    {!allowed && (
                      <span className="absolute right-3 top-3 rounded-full bg-slate-200 border border-slate-300/60 px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-sm">
                        {TEXT.noPermission}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Embedded Styles for Sparkline and Animations */}
      <style>{`
        /* Subtle Grid Pattern for Banner */
        .db-banner-grid {
          background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        /* Sparkline Path Drawing loop */
        .db-sparkline-path {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: dbDrawSpark 3.8s linear infinite;
        }
        @keyframes dbDrawSpark {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </MainLayout>
  );
}
