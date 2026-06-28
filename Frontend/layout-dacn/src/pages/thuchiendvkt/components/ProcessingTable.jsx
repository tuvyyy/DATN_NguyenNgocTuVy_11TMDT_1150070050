import React, { useEffect, useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { ThucHienDVKTController } from "../../../controllers/ThucHienDVKTController";

const pageSize = 10;

export default function ProcessingTable({ data = [], loading = false, onComplete, onCancel }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    if (!keyword) return data;
    return data.filter((item) => [item.benhNhan, item.maBenhNhan, item.tenDvkt, item.maDvkt]
      .some((value) => value?.toLocaleLowerCase("vi-VN").includes(keyword)));
  }, [data, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

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
            placeholder="Tìm người bệnh hoặc dịch vụ..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/10 hover:border-slate-350 font-semibold"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left">Người bệnh</th>
              <th className="px-4 py-3 text-left">Dịch vụ kỹ thuật</th>
              <th className="px-4 py-3 text-left">Phòng</th>
              <th className="px-4 py-3 text-left">Thời gian nhận</th>
              <th className="sticky right-0 z-30 w-[380px] bg-slate-50 px-4 py-3 text-center border-l border-slate-200">
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
              rows.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="border-l-4 border-l-[#0077B6] px-4 py-3">
                    <p className="font-bold text-slate-900">{item.benhNhan || "-"}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">{item.maBenhNhan || "-"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{item.tenDvkt || "-"}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-400">{item.maDvkt || ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded bg-[#0077B6]/10 border border-[#0077B6]/20 px-2 py-0.5 text-xs font-bold text-[#0077B6]">
                      {item.phong || "Chưa xác định"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                    {item.nhanLuc ? new Date(item.nhanLuc).toLocaleString("vi-VN") : "-"}
                  </td>
                  <td className="sticky right-0 border-l border-slate-100 bg-white px-4 py-3 group-hover:bg-slate-50/50">
                    <div className="flex justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("openTraKetQua", { detail: item }))}
                        className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/15 px-3 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0"
                      >
                        Nhập kết quả
                      </button>
                      <button
                        type="button"
                        onClick={() => ThucHienDVKTController.handleHoanThanh(item.id, onComplete)}
                        className="h-8 rounded-lg bg-[#0077B6] hover:bg-[#006093] hover:shadow-md hover:shadow-[#0077B6]/15 px-3 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0"
                      >
                        Hoàn thành
                      </button>
                      <button
                        type="button"
                        onClick={() => ThucHienDVKTController.handleHuyNhan(item.id, onCancel)}
                        className="h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-350 px-3 text-xs font-bold text-rose-600 transition-all duration-150 hover:-translate-y-[0.5px] active:translate-y-0"
                      >
                        Hủy nhận
                      </button>
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
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold">
                  Không có chỉ định đang thực hiện.
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

function Pagination({ page, totalPages, total, onChange }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 text-xs font-semibold text-slate-500">
      <span>
        Trang {page}/{totalPages} · {total} chỉ định
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
