import React, { useCallback, useEffect, useState } from "react";
import { Clock, Play, CheckCircle2, Activity } from "lucide-react";
import { getDoneDVKT, getPendingDVKT, getProcessingDVKT } from "../../api/ThucHienDVKTApi";
import { ThucHienDVKTController } from "../../controllers/ThucHienDVKTController";
import MainLayout from "../../layouts/MainLayout";
import DoneTable from "./components/DoneTable";
import PendingTable from "./components/PendingTable";
import ProcessingTable from "./components/ProcessingTable";
import ModalLichSuDVKT from "./modals/ModalLichSuDVKT";
import ModalTraKetQua from "./modals/ModalTraKetQua";

export default function ThucHienDVKT() {
  const [state, setState] = useState({ pending: [], processing: [], done: [], loading: true });
  const [activeTab, setActiveTab] = useState("processing");
  const [openResultModal, setOpenResultModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openLogModal, setOpenLogModal] = useState(false);
  const [selectedLogOrder, setSelectedLogOrder] = useState(null);

  const refreshAll = useCallback(async () => {
    setState((current) => ({ ...current, loading: true }));
    try {
      const [pending, processing, done] = await Promise.all([
        getPendingDVKT(),
        getProcessingDVKT(),
        getDoneDVKT(),
      ]);
      setState({
        pending: Array.isArray(pending) ? pending : [],
        processing: Array.isArray(processing) ? processing : [],
        done: Array.isArray(done) ? done : [],
        loading: false,
      });
    } catch {
      setState((current) => ({ ...current, loading: false }));
    }
  }, []);

  useEffect(() => {
    const openResult = (event) => {
      setSelectedOrder(event.detail);
      setOpenResultModal(true);
    };
    window.addEventListener("openTraKetQua", openResult);
    return () => window.removeEventListener("openTraKetQua", openResult);
  }, []);

  useEffect(() => {
    const openLogs = (event) => {
      setSelectedLogOrder(event.detail);
      setOpenLogModal(true);
    };
    window.addEventListener("openDVKTLogs", openLogs);
    return () => window.removeEventListener("openDVKTLogs", openLogs);
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <MainLayout>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-800">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#0077B6]/15 bg-gradient-to-r from-[#0077B6] to-[#0096C7] px-6 py-4 shadow-md text-white">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-sky-100 tracking-wider leading-none mb-1">
              Phòng thực hiện cận lâm sàng
            </p>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Activity size={20} className="text-sky-200 animate-pulse" />
              Thực hiện cận lâm sàng
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Summary
              label="Chờ tiếp nhận"
              value={state.pending.length}
              icon={<Clock size={16} />}
            />
            <Summary
              label="Đang thực hiện"
              value={state.processing.length}
              icon={<Play size={15} />}
            />
            <Summary
              label="Đã hoàn thành"
              value={state.done.length}
              icon={<CheckCircle2 size={16} />}
            />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-5 p-5">
          <section className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-5">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Hàng đợi chỉ định</p>
                <h2 className="text-sm font-bold text-slate-850 mt-0.5">Chờ tiếp nhận thực hiện</h2>
              </div>
              <span className="min-w-8 rounded-full bg-amber-500 px-2.5 py-0.5 text-center text-xs font-black text-white shadow-sm shadow-amber-500/10">
                {state.pending.length}
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <PendingTable
                data={state.pending}
                loading={state.loading}
                onReceive={(id) => ThucHienDVKTController.handleNhan(id, refreshAll)}
              />
            </div>
          </section>

          <section className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-7">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-3">
              <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm gap-1">
                <TabButton
                  active={activeTab === "processing"}
                  onClick={() => setActiveTab("processing")}
                  label="Đang thực hiện"
                  count={state.processing.length}
                  tone="sky"
                />
                <TabButton
                  active={activeTab === "done"}
                  onClick={() => setActiveTab("done")}
                  label="Đã hoàn thành"
                  count={state.done.length}
                  tone="emerald"
                />
              </div>
              {state.loading && <span className="text-xs text-slate-400 font-semibold animate-pulse">Đang cập nhật...</span>}
            </div>
            <div className="min-h-0 flex-1">
              {activeTab === "processing" ? (
                <ProcessingTable
                  data={state.processing}
                  loading={state.loading}
                  onComplete={refreshAll}
                  onCancel={refreshAll}
                />
              ) : (
                <DoneTable data={state.done} loading={state.loading} refresh={refreshAll} />
              )}
            </div>
          </section>
        </div>

        <ModalTraKetQua
          open={openResultModal}
          chiDinh={selectedOrder}
          onClose={() => {
            setOpenResultModal(false);
            setSelectedOrder(null);
          }}
          onSaved={refreshAll}
        />
        <ModalLichSuDVKT
          open={openLogModal}
          order={selectedLogOrder}
          onClose={() => {
            setOpenLogModal(false);
            setSelectedLogOrder(null);
          }}
        />
      </div>
    </MainLayout>
  );
}

function Summary({ label, value, icon }) {
  return (
    <div className="flex min-w-[140px] items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 shadow-sm text-white transition-all duration-200 hover:bg-white/15">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-100/90 leading-tight">{label}</p>
        <p className="mt-0.5 text-xl font-black leading-tight tracking-tight">{value}</p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white shadow-inner shrink-0">
        {icon}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count, tone }) {
  const activeClass =
    tone === "emerald"
      ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/10"
      : "bg-[#0077B6] text-white font-bold shadow-md shadow-[#0077B6]/10";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[145px] rounded-lg px-3.5 py-1.5 text-xs transition-all duration-200 hover:-translate-y-[0.5px] ${
        active
          ? `${activeClass}`
          : "text-slate-650 hover:bg-slate-100 hover:text-slate-900 font-semibold"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] ${
          active ? "bg-white/20 text-white font-black" : "bg-slate-200/70 text-slate-500 font-bold"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
