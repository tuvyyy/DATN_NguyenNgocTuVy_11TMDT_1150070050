import React, { useEffect, useId, useRef, useState } from "react";

export const count = (value, digits = 0) => value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: digits });
export const monthName = (value) => /^\d{4}-\d{2}$/.test(value || "") ? `${value.slice(5)}/${value.slice(0, 4)}` : value || "—";

export function Disclosure({ title, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className={`vr-disclosure${open ? " vr-disclosure-open" : ""}`}>
    <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <span>{title}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div id={id} className="vr-disclosure-body">{children}</div>}
  </section>;
}

export function SeriesChart({
  labels, series, title, zeroLine = false, valueDigits = 0, futureStart,
  formatLabel = monthName, emptyMessage = "Chưa có số liệu theo tháng.",
}) {
  const [selected, setSelected] = useState(null);
  const [width, setWidth] = useState(930);
  const container = useRef(null);
  const gradientId = useId().replace(/:/g, "");
  const signature = labels.join(",");
  const hasData = labels.length > 0;
  useEffect(() => setSelected(null), [signature]);
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, Math.round(entries[0].contentRect.width))));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [hasData]);
  if (!labels.length) return <p className="vr-empty">{emptyMessage}</p>;
  const values = series.flatMap((item) => item.values.filter(Number.isFinite));
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const roughStep = (maximum - minimum) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = Math.max(10 ** -valueDigits, [1, 2, 5, 10].find(value => value * magnitude >= roughStep) * magnitude);
  const low = Math.floor(minimum / step) * step;
  const high = Math.ceil(maximum / step) * step;
  const span = high - low || 1;
  const height = width < 500 ? 270 : 300;
  const left = 56;
  const right = width - (formatLabel === monthName ? 24 : 36);
  const bottom = height - 36;
  const x = (i) => labels.length === 1 ? (left + right) / 2 : left + i * (right - left) / (labels.length - 1);
  const tickStep = Math.max(1, Math.ceil(labels.length / (width < 500 ? 3 : width < 800 ? 5 : 7)));
  const tickIndexes = labels.map((_, i) => i).filter(i => i === labels.length - 1 || (i % tickStep === 0 && x(labels.length - 1) - x(i) >= 64));
  const y = (v) => bottom - (v - low) / span * (bottom - 42);
  const futureLeft = futureStart == null ? null : (x(futureStart) + x(Math.max(0, futureStart - 1))) / 2;
  const active = selected != null && selected < labels.length ? selected : Math.max(0, (futureStart ?? labels.length) - 1);
  const path = (items, connectFrom) => {
    let connected = false;
    return items.map((v, i) => {
      if (!Number.isFinite(v)) { connected = false; return ""; }
      const start = !connected && connectFrom && i === connectFrom.index + 1
        ? `M${x(connectFrom.index)},${y(connectFrom.value)}L` : connected ? "L" : "M";
      const point = `${start}${x(i)},${y(v)}`;
      connected = true;
      return point;
    }).join(" ");
  };
  return <div className="vr-chart">
    <div className="vr-chart-legend">{series.map((item) => <span key={item.name}>
      <i style={{ borderColor: item.color, borderTopStyle: item.lineStyle || (item.dashed ? "dashed" : "solid") }} aria-hidden="true" />{item.name}
    </span>)}</div>
    <div className="vr-chart-scroll" ref={container}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <title>{title}</title>
        <defs>{series.filter(item => item.area).map((item, i) => <linearGradient key={item.name} id={`${gradientId}-${i}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={item.color} stopOpacity="0.12" /><stop offset="100%" stopColor={item.color} stopOpacity="0" /></linearGradient>)}</defs>
        <text x={left} y="19" fontSize="11" fill="#94a1bb">Lượt khám</text>
        {futureStart != null && futureStart < labels.length && <g>
          <rect x={futureLeft} y="32" width={right + 8 - futureLeft} height={bottom - 32} fill="#f3f5ff" />
          <line x1={futureLeft} x2={futureLeft} y1="32" y2={bottom} stroke="#c7d0f3" strokeDasharray="4 5" />
          <text x={Math.min(futureLeft + 10, right - 45)} y="22" fontSize="11" fill="#7081d0">Dự báo</text>
        </g>}
        {Array.from({ length: Math.round(span / step) + 1 }, (_, i) => low + step * i).map((v, i) => <g key={i}>
          <line x1={left} x2={right} y1={y(v)} y2={y(v)} stroke="#edf1f9" />
          <text x={left - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a1bb">{count(v, valueDigits)}</text>
        </g>)}
        {zeroLine && <line x1={left} x2={right} y1={y(0)} y2={y(0)} stroke="#64748b" strokeDasharray="5 4"><title>Không chênh lệch</title></line>}
        {tickIndexes.map(i => <text key={labels[i]} x={x(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="#94a1bb">{formatLabel(labels[i])}</text>)}
        {selected != null && selected < labels.length && <line x1={x(selected)} x2={x(selected)} y1="35" y2={bottom} stroke="#b2bfdc" strokeDasharray="4 4" />}
        {series.map((item) => <g key={item.name}>
          {item.area && (() => { const first = item.values.findIndex(Number.isFinite); const last = item.values.findLastIndex(Number.isFinite); return first < 0 ? null : <path d={`${path(item.values)} L${x(last)},${y(0)} L${x(first)},${y(0)} Z`} fill={`url(#${gradientId}-${series.filter(s => s.area).indexOf(item)})`} />; })()}
          <path d={path(item.values, item.connectFrom)} fill="none" stroke={item.color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={item.lineStyle === "dotted" ? "2 5" : item.dashed ? "7 5" : undefined} />
          {item.showPoints !== false && item.values.map((value, i) => !Number.isFinite(value) ? null : <circle key={i} cx={x(i)} cy={y(value)} r={selected === i ? 5 : 3.5}
            fill={item.color} stroke="white" strokeWidth="2" tabIndex="0" aria-label={`${formatLabel(labels[i])}, ${item.name}: ${count(value, item.valueDigits ?? valueDigits)} lượt`}
            onMouseEnter={() => setSelected(i)} onFocus={() => setSelected(i)} onClick={() => setSelected(i)}>
            <title>{`${formatLabel(labels[i])} · ${item.name}: ${count(value, item.valueDigits ?? valueDigits)} lượt`}</title>
          </circle>)}
        </g>)}
      </svg>
    </div>
    <div className="vr-chart-readout" aria-live="polite"><strong>{formatLabel(labels[active])}</strong>
      {series.filter((item) => Number.isFinite(item.values[active])).map((item) => <span key={item.name}>{item.name}: <strong>{count(item.values[active], item.valueDigits ?? valueDigits)} lượt</strong></span>)}
    </div>
  </div>;
}

export function CountList({ rows, empty = "Chưa có số liệu." }) {
  const [showAll, setShowAll] = useState(false);
  const maximum = Math.max(1, ...rows.map((row) => row.count));
  const visible = showAll ? rows : rows.slice(0, 5);
  return <>
    {!rows.length && <p className="vr-empty">{empty}</p>}
    <ol className="vr-count-list">{visible.map((row) => <li key={row.label}>
      <div><span>{row.label.replace(/\s*\(#\d+\)$/, "")}</span><strong>{count(row.count)} <small>lượt</small></strong></div>
      <div className="vr-bar" aria-hidden="true"><span style={{ width: `${row.count / maximum * 100}%` }} /></div>
    </li>)}</ol>
    {rows.length > 5 && <button className="vr-text-button" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Thu gọn" : `Xem đủ ${rows.length} mục`}</button>}
  </>;
}
