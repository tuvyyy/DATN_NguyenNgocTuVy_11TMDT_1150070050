import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { User, Hash, Activity, FileText } from "lucide-react";
import { fetchFullKetQua, saveKetQuaChiTiet, saveKetQuaTong } from "../../../api/ThucHienDVKTApi";
import { ThucHienDVKTController } from "../../../controllers/ThucHienDVKTController";

const evaluateValue = (value, minimum, maximum) => {
  const number = Number.parseFloat(value);
  if (Number.isNaN(number)) return "";
  if (minimum !== null && minimum !== undefined && number < Number(minimum)) return "Thấp";
  if (maximum !== null && maximum !== undefined && number > Number(maximum)) return "Cao";
  return "Bình thường";
};

export default function ModalTraKetQua({ open, onClose, chiDinh, onSaved }) {
  const orderId = chiDinh?.id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [summary, setSummary] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const loadResult = useCallback(async () => {
    if (!open || !orderId) return;
    setLoading(true);
    try {
      const result = await fetchFullKetQua(orderId);
      setInfo(result?.thongTin || null);
      setSummary(result?.ketQuaTong || "");
      setFileUrl(result?.fileUrl || "");
      setIndicators(
        (result?.chiTieus || []).map((item) => ({
          indicatorId: item.chiTieuId,
          name: item.tenChiTieu,
          unit: item.donVi,
          minimum: item.gioiHanThap,
          maximum: item.gioiHanCao,
          value: item.giaTri || "",
          assessment: item.danhGia || "",
        }))
      );
    } catch (error) {
      Swal.fire("Không thể tải kết quả", error?.response?.data?.message || "Vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
    }
  }, [open, orderId]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  useEffect(() => {
    const generated = indicators
      .filter((item) => item.value)
      .map(
        (item) =>
          `${item.name}: ${item.value}${item.unit ? ` ${item.unit}` : ""}${
            item.assessment ? ` (${item.assessment})` : ""
          }`
      )
      .join("\n");
    if (generated) setSummary(generated);
  }, [indicators]);

  const updateValue = (index, value) => {
    setIndicators((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, value, assessment: evaluateValue(value, item.minimum, item.maximum) }
          : item
      )
    );
  };

  const saveAll = async () => {
    if (!orderId || saving) return;
    try {
      setSaving(true);
      await saveKetQuaTong({ idChiDinhDVKT: orderId, ketQuaText: summary, fileUrl });
      const refreshed = await fetchFullKetQua(orderId);
      if (!refreshed?.ketQuaId) throw new Error("Không lấy được mã kết quả sau khi lưu.");

      for (const indicator of indicators) {
        await saveKetQuaChiTiet({
          idKetQua: refreshed.ketQuaId,
          idChiTieu: indicator.indicatorId,
          giaTri: indicator.value,
          danhGia: indicator.assessment,
        });
      }

      await Swal.fire("Đã lưu kết quả", "Kết quả tổng và các chỉ tiêu đã được cập nhật.", "success");
      await loadResult();
      await onSaved?.();
    } catch (error) {
      Swal.fire(
        "Không thể lưu kết quả",
        error?.response?.data?.message || error?.message || "Vui lòng kiểm tra dữ liệu và thử lại.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-modal-title"
    >
      <div className="flex h-[88vh] w-full max-w-6xl min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300">
        <header className="flex shrink-0 items-center justify-between border-b border-[#0077B6]/20 bg-gradient-to-r from-[#0077B6] to-[#0096C7] px-6 py-4 text-white">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-sky-100 tracking-wider leading-none mb-1">
              Phiếu kết quả cận lâm sàng
            </p>
            <h2 id="result-modal-title" className="text-lg font-bold tracking-tight">
              Nhập kết quả thực hiện chỉ định
            </h2>
            <p className="mt-1 text-xs font-medium text-sky-100/70">
              Cập nhật chỉ số, kiểm tra đánh giá và lưu kết quả tổng quan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all duration-200 font-bold text-base shadow-sm"
          >
            ✕
          </button>
        </header>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-slate-500 font-semibold">
            Đang tải dữ liệu kết quả...
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <section className="grid shrink-0 grid-cols-2 gap-4 border-b border-slate-200 bg-white p-5 lg:grid-cols-4">
              <Info label="Người bệnh" value={info?.benhNhan || chiDinh?.benhNhan || "-"} icon={<User size={16} />} />
              <Info label="Mã người bệnh" value={info?.maBenhNhan || chiDinh?.maBenhNhan || "-"} icon={<Hash size={16} />} />
              <Info label="Dịch vụ kỹ thuật" value={info?.tenDvkt || chiDinh?.tenDvkt || "-"} icon={<Activity size={16} />} />
              <Info label="Mã dịch vụ" value={info?.maDvkt || chiDinh?.maDvkt || "-"} icon={<FileText size={16} />} />
            </section>

            <div className="grid min-h-0 flex-1 grid-cols-12">
              <section className="col-span-12 flex min-h-0 flex-col border-r border-slate-200 lg:col-span-8">
                <div className="flex h-12 shrink-0 items-center justify-between bg-slate-50/50 px-4 border-b border-slate-200">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Dữ liệu chuyên môn</p>
                    <h3 className="text-xs font-bold text-slate-700 mt-0.5">Danh sách chỉ tiêu phân tích</h3>
                  </div>
                  <span className="rounded-full bg-[#0077B6]/10 border border-[#0077B6]/15 px-2.5 py-0.5 text-xs font-bold text-[#0077B6]">
                    {indicators.length} chỉ tiêu
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left">Tên chỉ tiêu</th>
                        <th className="px-4 py-3 text-left">Khoảng tham chiếu</th>
                        <th className="w-36 px-4 py-3 text-left">Giá trị đo</th>
                        <th className="w-32 px-4 py-3 text-left">Đánh giá cận lâm sàng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {indicators.length ? (
                        indicators.map((item, index) => (
                          <tr key={item.indicatorId || index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3.5 font-bold text-slate-900 border-l-4 border-l-[#0077B6]">
                              {item.name || "-"}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-semibold">
                              {item.minimum ?? "-"} - {item.maximum ?? "-"} {item.unit || ""}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                value={item.value}
                                onChange={(event) => updateValue(index, event.target.value)}
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3.5 font-mono font-bold text-slate-800 shadow-sm outline-none transition-all duration-200 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350"
                              />
                            </td>
                            <td className="px-4 py-3.5">
                              <Assessment value={item.assessment} />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-400 font-semibold">
                            Dịch vụ này chưa có danh mục chỉ tiêu.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="col-span-12 flex min-h-0 flex-col bg-slate-50 p-5 border-l border-slate-200 lg:col-span-4 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#0077B6] tracking-wider leading-none mb-1">
                    Kết luận chẩn đoán
                  </p>
                  <label className="text-sm font-bold text-slate-800" htmlFor="result-summary">
                    Kết quả tổng quát
                  </label>
                </div>
                <textarea
                  id="result-summary"
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  className="w-full flex-1 resize-none rounded-lg border border-slate-200 bg-white p-3.5 text-sm font-semibold leading-relaxed shadow-sm outline-none transition-all duration-200 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350 min-h-[220px]"
                  placeholder="Nhập ghi chú kết luận cận lâm sàng..."
                />

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600" htmlFor="result-file">
                    Đường dẫn kết quả (File PDF/Hình ảnh)
                  </label>
                  <input
                    id="result-file"
                    value={fileUrl}
                    onChange={(event) => setFileUrl(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold shadow-sm outline-none transition-all duration-200 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350"
                    placeholder="Đường dẫn liên kết kết quả tài liệu..."
                  />
                </div>
              </section>
            </div>
          </div>
        )}

        <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => ThucHienDVKTController.handleExportPDF(orderId)}
            disabled={!orderId || saving}
            className="rounded-lg border border-[#0077B6]/25 bg-white px-4 py-2.5 text-sm font-bold text-[#0077B6] shadow-sm hover:bg-[#0077B6]/5 hover:border-[#0077B6]/40 transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:-translate-y-0 disabled:shadow-none"
          >
            Xuất PDF phiếu thu
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={loading || saving || !orderId}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-450 disabled:shadow-none"
          >
            {saving ? "Đang ghi nhận..." : "Lưu kết quả chẩn đoán"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Info({ label, value, icon }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/55 p-3 flex items-center gap-3 transition-all duration-200 hover:shadow-sm hover:border-slate-200">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-[#0077B6] shrink-0 shadow-inner">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-1">{label}</p>
        <p className="truncate font-extrabold text-slate-850 text-sm" title={String(value)}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Assessment({ value }) {
  let badgeStyle = "bg-slate-50 border-slate-200 text-slate-500";
  if (value === "Cao") {
    badgeStyle = "bg-rose-50 border-rose-200 text-rose-700 font-bold";
  } else if (value === "Thấp") {
    badgeStyle = "bg-sky-50 border-sky-200 text-sky-700 font-bold";
  } else if (value === "Bình thường") {
    badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold";
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border ${badgeStyle}`}>
      {value || "Chưa có"}
    </span>
  );
}
