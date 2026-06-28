import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { History, Search } from "lucide-react";
import { ThucHienDVKTController } from "../../../controllers/ThucHienDVKTController";

const pageSize = 10;
const normalizeItem = (raw) => ({
  ...raw,
  tenDvkt: raw.tenDvkt || raw.TenDvkt,
  maDvkt: raw.maDvkt || raw.MaDvkt,
  benhNhan: raw.benhNhan || raw.BenhNhan,
  maBenhNhan: raw.maBenhNhan || raw.MaBenhNhan,
  ngaySinh: raw.ngaySinh || raw.NgaySinh,
  hoanThanhLuc: raw.hoanThanhLuc || raw.HoanThanhLuc,
  trangThaiKQ: raw.trangThaiKQ || raw.TrangThaiKQ || "draft",
  fileUrl: raw.fileUrl || raw.FileUrl,
});

export default function DoneTable({ data = [], loading = false, refresh = () => {} }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const normalized = useMemo(() => data.map(normalizeItem), [data]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    if (!keyword) return normalized;
    return normalized.filter((item) => [item.tenDvkt, item.ketQuaText, item.benhNhan, item.maBenhNhan]
      .some((value) => value?.toLocaleLowerCase("vi-VN").includes(keyword)));
  }, [normalized, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const approve = async (id) => {
    const result = await Swal.fire({ title: "Duyệt kết quả?", text: "Kết quả sau khi duyệt sẽ không thể chỉnh sửa cho đến khi hủy duyệt.", icon: "question", showCancelButton: true, confirmButtonText: "Duyệt", cancelButtonText: "Quay lại", confirmButtonColor: "#059669" });
    if (result.isConfirmed) await ThucHienDVKTController.handleDuyet(id, refresh);
  };

  const cancelApproval = async (id) => {
    const result = await Swal.fire({ title: "Hủy duyệt kết quả?", text: "Kết quả sẽ được mở lại để chỉnh sửa.", icon: "warning", showCancelButton: true, confirmButtonText: "Hủy duyệt", cancelButtonText: "Quay lại", confirmButtonColor: "#e11d48" });
    if (result.isConfirmed) await ThucHienDVKTController.handleHuyDuyet(id, refresh);
  };

  const send = async (id) => {
    const result = await Swal.fire({ title: "Gửi kết quả về phòng khám?", icon: "question", showCancelButton: true, confirmButtonText: "Gửi kết quả", cancelButtonText: "Quay lại", confirmButtonColor: "#0284c7" });
    if (result.isConfirmed) await ThucHienDVKTController.handleGui(id, refresh);
  };

  const edit = (item) => {
    const state = String(item.trangThaiKQ || item.trangThai || "draft").toLowerCase();
    if (["approved", "sent"].includes(state)) {
      Swal.fire("Không thể sửa", "Hãy hủy duyệt trước khi chỉnh sửa kết quả.", "warning");
      return;
    }
    window.dispatchEvent(new CustomEvent("openTraKetQua", { detail: item }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/30 p-3">
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={15} />
          </span>
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm người bệnh, DVKT hoặc kết quả..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350 font-semibold"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">Người bệnh</th>
              <th className="px-4 py-3 text-left">Dịch vụ kỹ thuật</th>
              <th className="px-4 py-3 text-left">Hoàn thành lúc</th>
              <th className="px-4 py-3 text-left">Trạng thái kết quả</th>
              <th className="sticky right-0 z-30 w-[420px] bg-slate-50 px-4 py-3 text-center border-l border-slate-200">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !data.length ? (
              Array.from({ length: 8 }).map((_, index) => (
                <tr key={index}>
                  {Array.from({ length: 5 }).map((__, cell) => (
                    <td
                      key={cell}
                      className={`${
                        cell === 4 ? "sticky right-0 border-l bg-white" : ""
                      } px-4 py-3`}
                    >
                      <span className="app-skeleton-line block h-3.5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length ? (
              rows.map((item) => {
                const resultState = String(item.trangThaiKQ || item.trangThai || "draft").toLowerCase();
                const approved = resultState === "approved";
                const sent =
                  resultState === "sent" ||
                  String(item.trangThai).toLowerCase() === "sent";
                const hasResult = resultState === "completed" || !!item.ketQuaText || !!item.fileUrl;
                return (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="border-l-4 border-l-emerald-500 px-4 py-3">
                      <p className="font-bold text-slate-900">{item.benhNhan || "-"}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">{item.maBenhNhan || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{item.tenDvkt || "-"}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">{item.maDvkt || "-"}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                      {item.hoanThanhLuc ? new Date(item.hoanThanhLuc).toLocaleString("vi-VN") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <ResultStatus state={resultState} />
                    </td>
                    <td className="sticky right-0 border-l border-slate-100 bg-white px-4 py-3 group-hover:bg-slate-50/50">
                      <div className="flex justify-center gap-1.5">
                        {approved ? (
                          <button
                            type="button"
                            onClick={() => cancelApproval(item.id)}
                            className="h-8 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 hover:border-rose-300 px-3 text-xs font-bold text-rose-700 transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0"
                          >
                            Hủy duyệt
                          </button>
                        ) : (
                          !sent && (
                            <button
                              type="button"
                              onClick={() => approve(item.id)}
                              disabled={!hasResult}
                              title={hasResult ? "Duyệt kết quả" : "Chưa có kết quả để duyệt"}
                              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/15 px-3 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
                            >
                              Duyệt
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => edit(item)}
                          disabled={approved || sent}
                          className="h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 px-3 text-xs font-bold text-slate-700 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => send(item.id)}
                          disabled={!approved}
                          className={`h-8 rounded-lg px-3 text-xs font-bold shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0 ${
                            !approved
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                              : "bg-[#0077B6] hover:bg-[#006093] hover:shadow-md hover:shadow-[#0077B6]/15 text-white"
                          }`}
                        >
                          Gửi
                        </button>
                        {sent && item.fileUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                /^https?:/i.test(item.fileUrl)
                                  ? item.fileUrl
                                  : `https://localhost:7007${item.fileUrl}`,
                                "_blank"
                              )
                            }
                            className="h-8 rounded-lg border border-[#0077B6]/20 bg-[#0077B6]/5 hover:bg-[#0077B6]/10 px-3 text-xs font-bold text-[#0077B6] transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0"
                          >
                            Xem PDF
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => window.dispatchEvent(new CustomEvent("openDVKTLogs", { detail: item }))}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-all duration-150 hover:-translate-y-[0.5px] hover:border-slate-350 hover:bg-slate-50 hover:text-slate-900 active:translate-y-0"
                          title="Lịch sử xử lý"
                        >
                          <History size={13} />
                          Lịch sử
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                  Chương có chỉ định đã hoàn thành.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} total={filtered.length} onChange={setPage} />
    </div>
  );
}

function ResultStatus({ state }) {
  const config =
    state === "approved"
      ? ["Đã duyệt", "bg-emerald-50 border border-emerald-250 text-emerald-700"]
      : state === "sent"
      ? ["Đã gửi", "bg-[#0077B6]/10 border border-[#0077B6]/20 text-[#0077B6]"]
      : ["Chờ duyệt", "bg-amber-50 border border-amber-250 text-amber-700"];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${config[1]}`}>
      {config[0]}
    </span>
  );
}

function Pagination({ page, totalPages, total, onChange }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 text-xs font-semibold text-slate-500">
      <span>
        Trang {page}/{totalPages} · {total} kết quả
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 font-bold transition-colors"
        >
          Trước
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 font-bold transition-colors"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
