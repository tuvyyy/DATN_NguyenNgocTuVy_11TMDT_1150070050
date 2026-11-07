import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pill, Settings2 } from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  loadFilters, loadThuoc, createThuoc, updateThuoc, toggleThuoc,
  loadGiaByThuoc, createGia, updateGia, toggleGia,
} from "../../../controllers/DanhMucThuocController";
import EmptyState from "./EmptyState";
import ThuocColumnConfigModal from "./ThuocColumnConfigModal";
import ThuocFilter from "./ThuocFilter";
import ThuocGiaModal from "./ThuocGiaModal";
import ThuocGiaTable from "./ThuocGiaTable";
import ThuocModal from "./ThuocModal";
import ThuocTable from "./ThuocTable";

export default function ThuocPage() {
  const [filters, setFilters] = useState({ idNhom: "", keyword: "", hoatDong: "", page: 1, pageSize: 12 });
  const [nhomList, setNhomList] = useState([]);
  const [thuocPaged, setThuocPaged] = useState({ items: [], page: 1, pageSize: 12, totalItems: 0 });
  const [selected, setSelected] = useState(null);
  const [giaList, setGiaList] = useState([]);
  const [loadingThuoc, setLoadingThuoc] = useState(false);
  const [loadingGia, setLoadingGia] = useState(false);
  const [openThuocModal, setOpenThuocModal] = useState(false);
  const [editingThuoc, setEditingThuoc] = useState(null);
  const [openGiaModal, setOpenGiaModal] = useState(false);
  const [editingGia, setEditingGia] = useState(null);
  const [openConfigThuoc, setOpenConfigThuoc] = useState(false);
  const [openConfigGia, setOpenConfigGia] = useState(false);
  const [columnsThuoc, setColumnsThuoc] = useState([
    { id: "stt", label: "STT", visible: true },
    { id: "ma", label: "Mã thuốc", visible: true },
    { id: "ten", label: "Tên thuốc", visible: true },
    { id: "donViTinh", label: "ĐVT", visible: true },
    { id: "nhom", label: "Nhóm thuốc", visible: true },
    { id: "trangThai", label: "Trạng thái", visible: true },
    { id: "actions", label: "Thao tác", visible: true },
  ]);
  const [columnsGia, setColumnsGia] = useState([
    { id: "stt", label: "STT", visible: true },
    { id: "donGia", label: "Đơn giá", visible: true },
    { id: "ngayApDung", label: "Ngày áp dụng", visible: true },
    { id: "trangThai", label: "Trạng thái", visible: true },
    { id: "actions", label: "Thao tác", visible: true },
  ]);

  const refreshThuoc = useCallback(async () => {
    setLoadingThuoc(true);
    try { setThuocPaged(await loadThuoc(filters)); }
    finally { setLoadingThuoc(false); }
  }, [filters]);

  const refreshGia = useCallback(async () => {
    if (!selected?.id) return setGiaList([]);
    setLoadingGia(true);
    try { setGiaList(await loadGiaByThuoc(selected.id, false)); }
    finally { setLoadingGia(false); }
  }, [selected]);

  useEffect(() => { loadFilters().then(({ nhomList: list }) => setNhomList(list)); }, []);
  useEffect(() => { refreshThuoc(); }, [refreshThuoc]);
  useEffect(() => { refreshGia(); }, [refreshGia]);

  const submitThuoc = async (values) => {
    try {
      if (editingThuoc) { await updateThuoc(editingThuoc.id, values); toast.success("Cập nhật thuốc thành công"); }
      else { await createThuoc(values); toast.success("Thêm thuốc thành công"); }
      setOpenThuocModal(false);
      await refreshThuoc();
    } catch (error) { toast.error(error?.response?.data?.message || "Không thể lưu thuốc"); }
  };

  const handleToggleThuoc = async (item) => {
    await toggleThuoc(item);
    toast.success(item.hoatDong ? "Đã vô hiệu hóa thuốc" : "Đã kích hoạt thuốc");
    if (selected?.id === item.id && item.hoatDong) setSelected(null);
    await refreshThuoc();
  };

  const submitGia = async (values) => {
    try {
      const payload = { ...values, idThuoc: selected.id };
      if (editingGia) { await updateGia(editingGia.id, payload); toast.success("Cập nhật giá thành công"); }
      else { await createGia(payload); toast.success("Thêm giá thành công"); }
      setOpenGiaModal(false);
      await refreshGia();
    } catch (error) { toast.error(error?.response?.data?.message || "Không thể lưu giá thuốc"); }
  };

  const handleToggleGia = async (item) => {
    await toggleGia(item);
    toast.success(item.hoatDong ? "Đã vô hiệu giá" : "Đã kích hoạt giá");
    await refreshGia();
  };

  const priceTitle = useMemo(() => selected ? `${selected.ten} (${selected.ma})` : "Chưa chọn thuốc", [selected]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-800">
      <ToastContainer position="top-right" autoClose={1800} />
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Pill size={21} className="text-sky-600" />Danh mục thuốc</h1>
            <p className="mt-0.5 text-sm text-slate-500">Quản lý thuốc, trạng thái sử dụng và lịch sử giá.</p>
          </div>
          <span className="whitespace-nowrap text-sm text-slate-500">Tổng: <b className="text-slate-800">{thuocPaged.totalItems}</b></span>
        </div>
        <ThuocFilter nhomList={nhomList} filters={filters} onChange={(value) => setFilters((state) => ({ ...state, ...value, page: 1 }))} onAdd={() => { setEditingThuoc(null); setOpenThuocModal(true); }} />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 p-4">
        <section className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white xl:col-span-8">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3">
            <h2 className="font-semibold text-slate-800">Danh sách thuốc</h2>
            <button type="button" onClick={() => setOpenConfigThuoc(true)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><Settings2 size={15} /> Cột</button>
          </div>
          <div className="min-h-0 flex-1">
            <ThuocTable data={thuocPaged.items} loading={loadingThuoc} page={thuocPaged.page} pageSize={thuocPaged.pageSize} total={thuocPaged.totalItems} onPageChange={(page) => setFilters((state) => ({ ...state, page }))} onSelect={setSelected} selectedId={selected?.id} onEdit={(item) => { setEditingThuoc(item); setOpenThuocModal(true); }} onToggle={handleToggleThuoc} columns={columnsThuoc.filter((column) => column.visible)} />
          </div>
        </section>

        <section className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white xl:col-span-4">
          <div className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
            <div className="min-w-0"><p className="text-xs text-slate-500">Bảng giá thuốc</p><h2 className="truncate font-semibold text-slate-800" title={priceTitle}>{priceTitle}</h2></div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" onClick={() => setOpenConfigGia(true)} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Điều chỉnh cột"><Settings2 size={16} /></button>
              <button type="button" disabled={!selected} onClick={() => { setEditingGia(null); setOpenGiaModal(true); }} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15} /> Thêm giá</button>
            </div>
          </div>
          <div className="min-h-0 flex-1">{selected ? <ThuocGiaTable data={giaList} loading={loadingGia} onEdit={(item) => { setEditingGia(item); setOpenGiaModal(true); }} onToggle={handleToggleGia} columns={columnsGia.filter((column) => column.visible)} /> : <EmptyState />}</div>
        </section>
      </div>

      {openThuocModal && <ThuocModal open onClose={() => setOpenThuocModal(false)} onSubmit={submitThuoc} nhomList={nhomList} initial={editingThuoc} />}
      {openGiaModal && <ThuocGiaModal open onClose={() => setOpenGiaModal(false)} onSubmit={submitGia} initial={editingGia} selectedThuoc={selected} />}
      {openConfigThuoc && <ThuocColumnConfigModal open onClose={() => setOpenConfigThuoc(false)} columns={columnsThuoc} setColumns={setColumnsThuoc} />}
      {openConfigGia && <ThuocColumnConfigModal open onClose={() => setOpenConfigGia(false)} columns={columnsGia} setColumns={setColumnsGia} />}
    </div>
  );
}
