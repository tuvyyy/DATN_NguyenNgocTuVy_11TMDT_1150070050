import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import ModalDVKTFilter from "./ModalChiDinhDVKTFilter";
import ModalDVKTList from "./ModalChiDinhDVKTList";
import ModalDVKTSelected from "./ModalChiDinhDVKTSelected";
import ModalDVKTTotals from "./ModalChiDinhDVKTTotals";
import BacSiApi from "../../../../api/BacSiApi";

export default function ModalChiDinhDVKT({ open, onClose, idLanKham, idBacSi }) {
  const [loading, setLoading] = useState(false);
  const [dsDVKT, setDsDVKT] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filterLoai, setFilterLoai] = useState("all");
  const [search, setSearch] = useState("");
  const [animate, setAnimate] = useState(false);

  async function loadDVKT() {
    setLoading(true);
    try {
      const res = await BacSiApi.getAllDVKT();
      if (res.ok) setDsDVKT(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    console.log("[ModalChiDinhDVKT] OPEN -> idLanKham =", idLanKham);
    loadDVKT();
    setSelected([]);
    setFilterLoai("all");
    setSearch("");
    setAnimate(false);

    const timer = setTimeout(() => setAnimate(true), 30);
    return () => clearTimeout(timer);
  }, [open, idLanKham]);

  function toggleSelect(item) {
    const exists = selected.find((x) => x.id === item.id);
    setSelected(exists ? selected.filter((x) => x.id !== item.id) : [...selected, { ...item, soLuong: 1 }]);
  }

  function updateSoLuong(id, sl) {
    setSelected(selected.map((x) => (x.id === id ? { ...x, soLuong: sl >= 1 ? sl : 1 } : x)));
  }

  function openPdfBlob(blob, targetWindow) {
    const url = URL.createObjectURL(blob);
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = url;
    } else {
      window.open(url, "_blank", "noopener");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function openPrintPlaceholder() {
    const win = window.open("", "_blank");
    if (!win) return null;

    win.document.title = "Đang tạo phiếu chỉ định";
    win.document.body.innerHTML =
      "<div style='font-family:Arial,sans-serif;padding:24px;color:#0f172a'>Đang tạo phiếu chỉ định cho bệnh nhân...</div>";
    return win;
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      alert("Chưa chọn DVKT nào");
      return;
    }

    console.log("[ModalChiDinhDVKT] handleSubmit() - selected =", selected);
    setLoading(true);
    const printWindow = openPrintPlaceholder();

    try {
      const createdIds = [];

      for (const dv of selected) {
        const dto = {
          idLanKham,
          idBacSi,
          idDVKT: dv.id,
          soLuong: dv.soLuong,
          ghiChu: "",
        };

        console.log("[ModalChiDinhDVKT] Gửi DTO ->", dto);
        const res = await BacSiApi.chiDinhDVKT(dto);
        console.log("[ModalChiDinhDVKT] Kết quả API ->", res);

        if (!res?.ok) {
          const msg = res?.message || res?.data?.message || res?.data?.error || "Không thể chỉ định DVKT.";
          if (printWindow && !printWindow.closed) printWindow.close();
          alert(msg);
          return;
        }

        const createdId = res?.data?.id || res?.data?.data?.id;
        if (createdId) createdIds.push(createdId);
      }

      if (createdIds.length > 0) {
        const pdf = await BacSiApi.exportPhieuChiDinhXetNghiemPDF(idLanKham, createdIds);
        openPdfBlob(pdf, printWindow);
      } else if (printWindow && !printWindow.closed) {
        printWindow.close();
      }

      onClose(true, { chiDinhIds: createdIds });
    } catch (err) {
      console.error("[ModalChiDinhDVKT] Lỗi handleSubmit()", err);
      if (printWindow && !printWindow.closed) printWindow.close();

      const msg = err?.response?.data?.message || err?.response?.data || err?.message || "Có lỗi khi gửi chỉ định DVKT";
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 backdrop-blur-sm transition-opacity duration-300 ${
        animate ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`bg-white w-[90vw] h-[90vh] rounded-2xl shadow-2xl border border-slate-200 transition-all duration-300 transform flex flex-col overflow-hidden ${
          animate ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#0077B6]/20 bg-gradient-to-r from-[#0077B6] to-[#0096C7] px-6 py-4 text-white">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-sky-100 tracking-wider leading-none mb-1">
              Chỉ định cận lâm sàng
            </p>
            <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
              <Activity size={20} className="text-sky-200 animate-pulse" />
              Chỉ định dịch vụ kỹ thuật
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200 font-bold text-base shadow-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0 bg-white">
          <div className="w-1/2 border-r border-slate-200 flex flex-col min-h-0">
            <ModalDVKTFilter filterLoai={filterLoai} setFilterLoai={setFilterLoai} search={search} setSearch={setSearch} />

            <ModalDVKTList
              ds={dsDVKT}
              filterLoai={filterLoai}
              search={search}
              selected={selected}
              toggleSelect={toggleSelect}
            />
          </div>

          <div className="w-1/2 flex flex-col min-h-0">
            <ModalDVKTTotals selected={selected} />

            <ModalDVKTSelected selected={selected} updateSoLuong={updateSoLuong} toggleSelect={toggleSelect} />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 p-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 rounded-lg text-sm font-bold text-slate-700 transition-all duration-200 hover:-translate-y-[1px]"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-5 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-[1px] ${
              loading
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-[#0077B6] hover:bg-[#006093] hover:shadow-lg hover:shadow-[#0077B6]/20 active:translate-y-0"
            }`}
          >
            {loading ? "Đang xử lý..." : "Xác nhận chỉ định"}
          </button>
        </div>
      </div>
    </div>
  );
}
