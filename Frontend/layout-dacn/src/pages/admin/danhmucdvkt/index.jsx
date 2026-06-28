import React, { useEffect, useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import {
  alertError, alertSuccess, createDVKT, createGiaDVKT, loadDVKT,
  loadGiaDVKT, loadNhomDVKT, toggleDVKT, updateDVKT, updateGiaDVKT,
} from "../../../controllers/DanhMucDVKTController";
import DVKTFilter from "./DVKTFilter";
import DVKTModal from "./DVKTModal";
import DVKTTable from "./DVKTTable";
import EmptyState from "./EmptyState";
import GiaDVKTModal from "./GiaDVKTModal";
import GiaDVKTTable from "./GiaDVKTTable";

export default function DanhMucDVKTPage() {
  const [nhomList, setNhomList] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [filters, setFilters] = useState({ idNhom: "", keyword: "" });
  const [selected, setSelected] = useState(null);
  const [giaList, setGiaList] = useState([]);
  const [loadingDVKT, setLoadingDVKT] = useState(false);
  const [loadingGia, setLoadingGia] = useState(false);
  const [openDVKTModal, setOpenDVKTModal] = useState(false);
  const [openGiaModal, setOpenGiaModal] = useState(false);
  const [editingDVKT, setEditingDVKT] = useState(null);
  const [editingGia, setEditingGia] = useState(null);

  const filteredItems = useMemo(() => {
    const keyword = filters.keyword.trim().toLocaleLowerCase("vi-VN");
    return allItems.filter((item) => {
      const matchesGroup = !filters.idNhom || String(item.idNhom) === String(filters.idNhom);
      const matchesKeyword = !keyword || item.tenDvkt?.toLocaleLowerCase("vi-VN").includes(keyword) || item.maDvkt?.toLocaleLowerCase("vi-VN").includes(keyword);
      return matchesGroup && matchesKeyword;
    });
  }, [allItems, filters]);

  const fetchDVKT = async () => {
    setLoadingDVKT(true);
    try { setAllItems(await loadDVKT()); }
    finally { setLoadingDVKT(false); }
  };

  const fetchGia = async (id) => {
    if (!id) return setGiaList([]);
    setLoadingGia(true);
    try { setGiaList(await loadGiaDVKT(id)); }
    finally { setLoadingGia(false); }
  };

  useEffect(() => { loadNhomDVKT().then(setNhomList); fetchDVKT(); }, []);
  useEffect(() => { fetchGia(selected?.id); }, [selected]);

  const handleToggle = async (item) => {
    try {
      await toggleDVKT(item.id);
      alertSuccess(item.hoatDong ? "Đã khóa DVKT" : "Đã mở khóa DVKT");
      await fetchDVKT();
    } catch { alertError("Không thể cập nhật trạng thái DVKT"); }
  };

  const submitDVKT = async (values) => {
    try {
      if (editingDVKT) { await updateDVKT(editingDVKT.id, values); alertSuccess("Cập nhật DVKT thành công"); }
      else { await createDVKT(values); alertSuccess("Thêm DVKT thành công"); }
      setOpenDVKTModal(false);
      await fetchDVKT();
    } catch { alertError("Không thể lưu DVKT"); }
  };

  const submitGia = async (values) => {
    try {
      if (editingGia) {
        await updateGiaDVKT(editingGia.id, { donGia: values.donGia, denNgay: values.denNgay || null, ghiChu: values.ghiChu || "" });
        alertSuccess("Cập nhật giá thành công");
      } else {
        await createGiaDVKT({ idDVKT: selected.id, donGia: values.donGia, tuNgay: values.tuNgay, ghiChu: values.ghiChu || "" });
        alertSuccess("Thêm giá thành công");
      }
      setOpenGiaModal(false);
      await fetchGia(selected.id);
    } catch { alertError("Không thể lưu giá DVKT"); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><ClipboardList size={21} className="text-sky-600" />Danh mục DVKT</h1>
            <p className="mt-0.5 text-sm text-slate-500">Quản lý dịch vụ kỹ thuật, nhóm dịch vụ và lịch sử giá.</p>
          </div>
          <span className="whitespace-nowrap text-sm text-slate-500">Tổng: <b className="text-slate-800">{filteredItems.length}</b></span>
        </div>
        <DVKTFilter nhomList={nhomList} filters={filters} onAdd={() => { setEditingDVKT(null); setOpenDVKTModal(true); }} onChange={(value) => setFilters((state) => ({ ...state, ...value }))} />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 p-4">
        <section className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white xl:col-span-8">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-3"><h2 className="font-semibold text-slate-800">Danh sách dịch vụ kỹ thuật</h2><span className="text-sm text-slate-500">Chọn một dòng để xem giá</span></div>
          <div className="min-h-0 flex-1"><DVKTTable data={filteredItems} loading={loadingDVKT} onSelect={setSelected} selectedId={selected?.id} onEdit={(item) => { setEditingDVKT(item); setOpenDVKTModal(true); }} onToggle={handleToggle} /></div>
        </section>
        <section className="col-span-12 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white xl:col-span-4">
          {selected ? <GiaDVKTTable data={giaList} loading={loadingGia} dvkt={selected} onAdd={() => { setEditingGia(null); setOpenGiaModal(true); }} onEdit={(item) => { setEditingGia(item); setOpenGiaModal(true); }} /> : <EmptyState />}
        </section>
      </div>

      {openDVKTModal && <DVKTModal open onClose={() => setOpenDVKTModal(false)} onSubmit={submitDVKT} initial={editingDVKT} nhomList={nhomList} />}
      {openGiaModal && <GiaDVKTModal open onClose={() => setOpenGiaModal(false)} onSubmit={submitGia} initial={editingGia} dvkt={selected} />}
    </div>
  );
}
