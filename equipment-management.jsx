// Path: equipment-management.jsx
// ============================================================
// File: equipment-management.jsx (Prototype / UI Preview)
// Path: / (root artifact)
// Desc: Equipment Management System — Interactive Prototype
//       รวม QR Code, Barcode, Photo Upload/Display
// ============================================================

import { useState, useMemo, useRef, useCallback, useEffect } from "react";

// ── Code39 Barcode Generator ──
const CODE39_MAP = {
  "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn",
  "4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw",
  "8":"wnnwnnwnn","9":"nnwwnnwnn","A":"wnnnnwnnw","B":"nnwnnwnnw",
  "C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn",
  "G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn",
  "K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww",
  "O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnwww","R":"wnnnnnwwn",
  "S":"nnwnnnwwn","T":"nnnnwnwwn","U":"wwnnnnnnw","V":"nwwnnnnnw",
  "W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnnwnnnn","Z":"nwwnwnnnn",
  "-":"nwnnnnwnw"," ":"nwwnnnwnn","*":"nwnnwnwnn",".":"wwnnnnwnn",
};

function generateCode39(text) {
  const encoded = `*${text.toUpperCase()}*`;
  const bars = [];
  for (const char of encoded) {
    const pattern = CODE39_MAP[char];
    if (!pattern) continue;
    for (let i = 0; i < 9; i++) {
      bars.push({ width: pattern[i] === "w" ? 3 : 1, black: i % 2 === 0 });
    }
    bars.push({ width: 1, black: false }); // inter-char gap
  }
  return bars;
}

function Barcode({ text, height = 50, scale = 1 }) {
  const bars = generateCode39(text);
  const totalWidth = bars.reduce((s, b) => s + b.width, 0) * scale;
  return (
    <div style={{ display: "inline-block", background: "#fff", padding: "6px 10px", borderRadius: 4 }}>
      <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`}>
        {(() => {
          let x = 0;
          return bars.map((b, i) => {
            const rect = b.black ? <rect key={i} x={x} y={0} width={b.width * scale} height={height} fill="#000" /> : null;
            x += b.width * scale;
            return rect;
          });
        })()}
      </svg>
      <div style={{ textAlign: "center", fontSize: 10, fontFamily: "monospace", color: "#000", marginTop: 2 }}>{text}</div>
    </div>
  );
}

// ── QR Code Generator (Version 1, 21x21, Low ECC) ──
function generateQRMatrix(text) {
  // Simplified but visually accurate QR code generator
  // Uses hash-based fill with proper QR finder patterns + alignment
  const size = 21;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));

  // Draw finder pattern (7x7 with border)
  function drawFinder(cx, cy) {
    for (let r = -3; r <= 3; r++) {
      for (let c = -3; c <= 3; c++) {
        const y = cy + r, x = cx + c;
        if (y < 0 || y >= size || x < 0 || x >= size) continue;
        const ring = Math.max(Math.abs(r), Math.abs(c));
        matrix[y][x] = ring === 2 ? 0 : 1;
      }
    }
    // Separator
    for (let i = -4; i <= 4; i++) {
      [[cy - 4, cx + i], [cy + 4, cx + i], [cy + i, cx - 4], [cy + i, cx + 4]].forEach(([y, x]) => {
        if (y >= 0 && y < size && x >= 0 && x < size) matrix[y][x] = 0;
      });
    }
  }

  drawFinder(3, 3);   // top-left
  drawFinder(size - 4, 3); // top-right
  drawFinder(3, size - 4); // bottom-left

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Dark module
  matrix[size - 8][8] = 1;

  // Fill data area with deterministic pattern from text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  let seed = Math.abs(hash);
  const lcg = () => { seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF; return (seed >>> 16) & 1; };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Skip finder areas, timing, format
      const inFinder = (x <= 8 && y <= 8) || (x >= size - 8 && y <= 8) || (x <= 8 && y >= size - 8);
      const isTiming = x === 6 || y === 6;
      if (inFinder || isTiming) continue;
      matrix[y][x] = lcg();
    }
  }

  return matrix;
}

function QRCode({ text, cellSize = 4 }) {
  const matrix = useMemo(() => generateQRMatrix(text), [text]);
  const size = matrix.length;
  const px = cellSize * size;
  return (
    <div style={{ display: "inline-block", background: "#fff", padding: 8, borderRadius: 4 }}>
      <svg width={px} height={px} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
        {matrix.map((row, y) => row.map((cell, x) =>
          cell ? <rect key={`${y}-${x}`} x={x} y={y} width={1} height={1} fill="#000" /> : null
        ))}
      </svg>
    </div>
  );
}

// ── Equipment Sticker (Printable Label) ──
function EquipmentSticker({ asset }) {
  return (
    <div style={{ background: "#fff", color: "#000", borderRadius: 8, padding: 16, width: 320, fontFamily: "'Sarabun', sans-serif", border: "2px solid #000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{asset.id}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{asset.name}</div>
          <div style={{ fontSize: 11, color: "#666" }}>{asset.brand} {asset.model}</div>
          <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>S/N: {asset.serial}</div>
        </div>
        <QRCode text={`https://equip.app/asset/${asset.id}`} cellSize={3} />
      </div>
      <Barcode text={asset.id} height={36} scale={1.2} />
      <div style={{ fontSize: 9, color: "#999", marginTop: 4, textAlign: "center" }}>สแกนเพื่อดูข้อมูลอุปกรณ์ • EquipTrack</div>
    </div>
  );
}

// ── Mock Data ──
const CATEGORIES = ["laptop", "monitor", "vehicle", "furniture", "camera", "projector", "other"];
const STATUS_MAP = {
  active: { label: "ใช้งานอยู่", color: "#16a34a", bg: "#dcfce7" },
  available: { label: "ว่าง", color: "#2563eb", bg: "#dbeafe" },
  maintenance: { label: "ซ่อม", color: "#d97706", bg: "#fef3c7" },
  retired: { label: "เสื่อมสภาพ", color: "#dc2626", bg: "#fee2e2" },
};

const PLACEHOLDER_PHOTOS = {
  laptop: "💻", monitor: "🖥️", vehicle: "🚗", furniture: "🪑", camera: "📷", projector: "📽️", other: "📦",
};

const INITIAL_ASSETS = [
  { id: "EQ-001", name: 'MacBook Pro 14"', brand: "Apple", model: "M3 Pro", serial: "C02X1234HASH", category: "laptop", purchaseDate: "2024-01-15", price: 75900, expectedLife: 4, status: "active", assignedTo: "สมชาย", warrantyEnd: "2027-01-15", nextMaintenance: "2025-07-15", photo: null },
  { id: "EQ-002", name: 'Dell UltraSharp 27"', brand: "Dell", model: "U2723QE", serial: "DL9988776655", category: "monitor", purchaseDate: "2023-06-10", price: 18500, expectedLife: 6, status: "active", assignedTo: "สมหญิง", warrantyEnd: "2026-06-10", nextMaintenance: null, photo: null },
  { id: "EQ-003", name: "Toyota Vios", brand: "Toyota", model: "Vios 1.5", serial: "JTDKN3DU5A0", category: "vehicle", purchaseDate: "2022-03-01", price: 629000, expectedLife: 8, status: "active", assignedTo: "แผนกขาย", warrantyEnd: "2025-03-01", nextMaintenance: "2025-04-01", photo: null },
  { id: "EQ-004", name: "Canon EOS R6", brand: "Canon", model: "EOS R6 II", serial: "CN1122334455", category: "camera", purchaseDate: "2023-11-20", price: 79990, expectedLife: 5, status: "available", assignedTo: null, warrantyEnd: "2025-11-20", nextMaintenance: null, photo: null },
  { id: "EQ-005", name: "Epson Projector", brand: "Epson", model: "EB-FH52", serial: "EP5566778899", category: "projector", purchaseDate: "2021-08-05", price: 32000, expectedLife: 5, status: "maintenance", assignedTo: null, warrantyEnd: "2024-08-05", nextMaintenance: "2025-03-10", photo: null },
  { id: "EQ-006", name: "ThinkPad X1 Carbon", brand: "Lenovo", model: "Gen 11", serial: "LN4455667788", category: "laptop", purchaseDate: "2023-09-01", price: 52900, expectedLife: 4, status: "active", assignedTo: "วิชัย", warrantyEnd: "2026-09-01", nextMaintenance: "2025-09-01", photo: null },
  { id: "EQ-007", name: "Herman Miller Aeron", brand: "Herman Miller", model: "Aeron Size B", serial: "HM0011223344", category: "furniture", purchaseDate: "2022-01-10", price: 45000, expectedLife: 12, status: "active", assignedTo: "สมชาย", warrantyEnd: "2034-01-10", nextMaintenance: null, photo: null },
  { id: "EQ-008", name: 'MacBook Air 13"', brand: "Apple", model: "M2", serial: "C02Y5678ABCD", category: "laptop", purchaseDate: "2023-03-20", price: 42900, expectedLife: 4, status: "retired", assignedTo: null, warrantyEnd: "2026-03-20", nextMaintenance: null, photo: null },
];

const INITIAL_MAINTENANCE = [
  { id: "MT-001", assetId: "EQ-003", date: "2024-12-01", description: "เปลี่ยนถ่ายน้ำมันเครื่อง + เช็คสภาพ", cost: 3500, vendor: "Toyota สาขาบางนา" },
  { id: "MT-002", assetId: "EQ-005", date: "2025-02-15", description: "หลอดไฟเสีย เปลี่ยนหลอดใหม่", cost: 8900, vendor: "Epson Service Center" },
  { id: "MT-003", assetId: "EQ-003", date: "2024-06-15", description: "เปลี่ยนยาง 4 เส้น", cost: 12000, vendor: "B-Quik ลาดพร้าว" },
  { id: "MT-004", assetId: "EQ-001", date: "2024-09-10", description: "เปลี่ยนแบตเตอรี่", cost: 6500, vendor: "Apple iCare" },
  { id: "MT-005", assetId: "EQ-005", date: "2024-05-20", description: "พัดลมระบายอากาศเสีย", cost: 4200, vendor: "Epson Service Center" },
];

const INITIAL_ASSIGNMENTS = [
  { id: "AS-001", assetId: "EQ-001", person: "สมชาย", dateOut: "2024-01-20", dateIn: null, notes: "ใช้ประจำ" },
  { id: "AS-002", assetId: "EQ-002", person: "สมหญิง", dateOut: "2023-06-15", dateIn: null, notes: "" },
  { id: "AS-003", assetId: "EQ-006", person: "วิชัย", dateOut: "2023-09-05", dateIn: null, notes: "" },
  { id: "AS-004", assetId: "EQ-008", person: "สมชาย", dateOut: "2023-03-25", dateIn: "2024-11-01", notes: "คืนแล้ว เครื่องช้า" },
  { id: "AS-005", assetId: "EQ-003", person: "แผนกขาย", dateOut: "2022-03-05", dateIn: null, notes: "รถประจำแผนก" },
];

const INITIAL_BOOKINGS = [
  { id: "BK-001", assetId: "EQ-004", person: "สมหญิง", dateStart: "2025-03-10", dateEnd: "2025-03-12", purpose: "ถ่ายภาพสินค้าใหม่", conditionBefore: "ดี", conditionAfter: null },
  { id: "BK-002", assetId: "EQ-004", person: "วิชัย", dateStart: "2025-03-15", dateEnd: "2025-03-16", purpose: "ถ่ายงาน event", conditionBefore: null, conditionAfter: null },
];

// ── Helpers ──
const fmt = (n) => n?.toLocaleString("th-TH") ?? "-";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }) : "-";
const daysBetween = (a, b) => Math.ceil((new Date(b) - new Date(a)) / 86400000);
const today = "2025-03-05";

function calcDepreciation(price, purchaseDate, expectedLife) {
  const years = daysBetween(purchaseDate, today) / 365;
  const annualDep = price / expectedLife;
  const totalDep = Math.min(annualDep * years, price);
  return { currentValue: Math.max(price - totalDep, 0), totalDep, annualDep, yearsUsed: years };
}

// ── Icons (inline SVG) ──
const Icon = ({ d, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const icons = {
  assets: "M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
  assign: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  maintenance: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01",
  booking: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  report: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8",
  search: "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z",
  plus: "M12 5v14M5 12h14",
  x: "M18 6L6 18M6 6l12 12",
  camera: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  print: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6Z",
  qr: "M5 3H3v2h2V3ZM3 11h2v2H3v-2ZM11 3h2v2h-2V3ZM5 7H3v2h2V7ZM7 3h2v2H7V3ZM21 11h-2v2h2v-2ZM19 3h2v2h-2V3ZM15 3h2v4h-2V3ZM3 21h2v-2H3v2ZM7 21h2v-2H7v2ZM5 15H3v2h2v-2ZM21 3h-2v2h2V3Z",
};

// ── Style Constants ──
const FONT = "'Sarabun', 'Noto Sans Thai', system-ui, sans-serif";
const C = {
  bg: "#0f1117", surface: "#1a1d27", surfaceHover: "#22252f", border: "#2a2d3a",
  text: "#e4e4e7", textMuted: "#71717a", accent: "#f59e0b", accentDim: "#92400e",
  danger: "#ef4444", success: "#22c55e", info: "#3b82f6",
};

// ── Shared Styles ──
const baseInput = { background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: "8px 12px", borderRadius: 6, fontSize: 14, fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box" };
const baseBtn = { padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontFamily: FONT, fontWeight: 600, transition: "all .15s" };
const accentBtn = { ...baseBtn, background: C.accent, color: "#000" };
const ghostBtn = { ...baseBtn, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}` };

// ── Shared Components ──
function Badge({ status }) {
  const s = STATUS_MAP[status];
  if (!s) return null;
  return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600, color: s.color, background: s.bg }}>{s.label}</span>;
}

function StatCard({ label, value, sub, color = C.accent }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: "16px 20px", border: `1px solid ${C.border}`, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, width, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ ...ghostBtn, padding: 4, lineHeight: 1 }}><Icon d={icons.x} size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Photo Component ──
function AssetPhoto({ asset, size = 120, onPhotoChange }) {
  const fileRef = useRef(null);
  const emoji = PLACEHOLDER_PHOTOS[asset.category] || "📦";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {asset.photo ? (
        <img src={asset.photo} alt={asset.name}
          style={{ width: size, height: size, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}` }} />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: 10, border: `2px dashed ${C.border}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: C.bg, fontSize: size * 0.35, cursor: "pointer"
        }} onClick={() => fileRef.current?.click()}>
          {emoji}
          <span style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>อัพโหลดรูป</span>
        </div>
      )}
      {asset.photo && (
        <button onClick={() => onPhotoChange?.(asset.id, null)}
          style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 99, background: C.danger, border: "none", color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => onPhotoChange?.(asset.id, reader.result);
            reader.readAsDataURL(file);
          }
        }} />
      {!asset.photo && (
        <button onClick={() => fileRef.current?.click()}
          style={{ position: "absolute", bottom: -6, right: -6, width: 26, height: 26, borderRadius: 99, background: C.accent, border: "none", color: "#000", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={icons.camera} size={14} color="#000" />
        </button>
      )}
    </div>
  );
}

// ── Asset Detail Modal (with Photo + QR + Barcode) ──
function AssetDetail({ asset, onClose, maintenanceRecords, onPhotoChange }) {
  const dep = calcDepreciation(asset.price, asset.purchaseDate, asset.expectedLife);
  const totalRepairCost = maintenanceRecords.reduce((s, m) => s + m.cost, 0);
  const repairRatio = asset.price > 0 ? (totalRepairCost / asset.price * 100).toFixed(1) : 0;
  const [showSticker, setShowSticker] = useState(false);

  return (
    <Modal title={`${asset.id} — ${asset.name}`} onClose={onClose} width={680}>
      {/* Header: Photo + Info + QR */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <AssetPhoto asset={asset} size={130} onPhotoChange={onPhotoChange} />

        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{asset.name}</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{asset.brand} {asset.model}</div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: "monospace", marginTop: 4 }}>S/N: {asset.serial}</div>
          <div style={{ marginTop: 8 }}><Badge status={asset.status} /></div>
          {asset.assignedTo && <div style={{ fontSize: 13, color: C.text, marginTop: 6 }}>👤 {asset.assignedTo}</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <QRCode text={`https://equip.app/asset/${asset.id}`} cellSize={3} />
          <div style={{ transform: "scale(0.8)", transformOrigin: "top center" }}>
            <Barcode text={asset.id} height={30} scale={1} />
          </div>
          <button onClick={() => setShowSticker(true)} style={{ ...ghostBtn, padding: "4px 10px", fontSize: 11 }}>
            <Icon d={icons.print} size={12} /> พิมพ์สติกเกอร์
          </button>
        </div>
      </div>

      {/* Detail Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          ["ประเภท", asset.category],
          ["วันที่ซื้อ", fmtDate(asset.purchaseDate)],
          ["ราคาซื้อ", `฿${fmt(asset.price)}`],
          ["อายุใช้งาน", `${dep.yearsUsed.toFixed(1)} / ${asset.expectedLife} ปี`],
          ["มูลค่าปัจจุบัน", `฿${fmt(Math.round(dep.currentValue))}`],
          ["ค่าเสื่อม/ปี", `฿${fmt(Math.round(dep.annualDep))}`],
          ["ประกันหมด", fmtDate(asset.warrantyEnd)],
          ["บำรุงถัดไป", fmtDate(asset.nextMaintenance)],
          ["ค่าซ่อมรวม", `฿${fmt(totalRepairCost)}`],
        ].map(([label, val], i) => (
          <div key={i} style={{ padding: "8px 10px", background: C.bg, borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Depreciation bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>ค่าเสื่อมราคาสะสม ({(dep.totalDep / asset.price * 100).toFixed(0)}%)</div>
        <div style={{ height: 8, background: C.bg, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(dep.totalDep / asset.price * 100, 100)}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.danger})`, borderRadius: 99 }} />
        </div>
      </div>

      {/* Maintenance */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8 }}>
          ประวัติซ่อม ({maintenanceRecords.length} ครั้ง)
          {repairRatio > 50 && <span style={{ color: C.danger, fontSize: 12, marginLeft: 8 }}>⚠ ค่าซ่อม {repairRatio}% ของราคาซื้อ</span>}
        </div>
        {maintenanceRecords.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 13, padding: 16, textAlign: "center", background: C.bg, borderRadius: 6 }}>ไม่มีประวัติซ่อม</div>
        ) : maintenanceRecords.map(m => (
          <div key={m.id} style={{ padding: "8px 12px", background: C.bg, borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: C.text }}>{m.description}</span>
              <span style={{ color: C.accent, fontFamily: "monospace" }}>฿{fmt(m.cost)}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{fmtDate(m.date)} • {m.vendor}</div>
          </div>
        ))}
      </div>

      {/* Sticker Modal */}
      {showSticker && (
        <Modal title="สติกเกอร์อุปกรณ์" onClose={() => setShowSticker(false)} width={380}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <EquipmentSticker asset={asset} />
          </div>
          <div style={{ textAlign: "center", fontSize: 12, color: C.textMuted }}>
            คลิกขวา → Print เพื่อพิมพ์สติกเกอร์<br/>
            ใช้กระดาษสติกเกอร์ขนาด 80×50 มม.
          </div>
        </Modal>
      )}
    </Modal>
  );
}

// ── Add Asset Modal ──
function AddAssetModal({ onClose, onAdd, nextId }) {
  const [form, setForm] = useState({ id: nextId, name: "", brand: "", model: "", serial: "", category: "laptop", purchaseDate: "", price: "", expectedLife: 4, status: "available", assignedTo: null, warrantyEnd: "", nextMaintenance: null, photo: null });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const fileRef = useRef(null);

  return (
    <Modal title="เพิ่มอุปกรณ์ใหม่" onClose={onClose}>
      {/* Photo upload */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div style={{ textAlign: "center" }}>
          {form.photo ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img src={form.photo} alt="preview" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}` }} />
              <button onClick={() => set("photo", null)} style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 99, background: C.danger, border: "none", color: "#fff", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ) : (
            <div onClick={() => fileRef.current?.click()} style={{ width: 120, height: 120, borderRadius: 10, border: `2px dashed ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: C.bg }}>
              <Icon d={icons.camera} size={28} color={C.textMuted} />
              <span style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>ถ่ายรูปอุปกรณ์</span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => set("photo", r.result); r.readAsDataURL(f); }}} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
        <FormField label="รหัส"><input value={form.id} readOnly style={{ ...baseInput, opacity: .6 }} /></FormField>
        <FormField label="ชื่ออุปกรณ์"><input value={form.name} onChange={e => set("name", e.target.value)} style={baseInput} placeholder="เช่น MacBook Pro 14&quot;" /></FormField>
        <FormField label="ยี่ห้อ"><input value={form.brand} onChange={e => set("brand", e.target.value)} style={baseInput} /></FormField>
        <FormField label="รุ่น"><input value={form.model} onChange={e => set("model", e.target.value)} style={baseInput} /></FormField>
        <FormField label="Serial Number"><input value={form.serial} onChange={e => set("serial", e.target.value)} style={baseInput} /></FormField>
        <FormField label="ประเภท">
          <select value={form.category} onChange={e => set("category", e.target.value)} style={{ ...baseInput, cursor: "pointer" }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="วันที่ซื้อ"><input type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} style={baseInput} /></FormField>
        <FormField label="ราคา (บาท)"><input type="number" value={form.price} onChange={e => set("price", +e.target.value)} style={baseInput} /></FormField>
        <FormField label="อายุการใช้งาน (ปี)"><input type="number" value={form.expectedLife} onChange={e => set("expectedLife", +e.target.value)} style={baseInput} /></FormField>
        <FormField label="ประกันหมด"><input type="date" value={form.warrantyEnd} onChange={e => set("warrantyEnd", e.target.value)} style={baseInput} /></FormField>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={ghostBtn}>ยกเลิก</button>
        <button onClick={() => { if (form.name && form.purchaseDate && form.price) onAdd(form); }} style={accentBtn}>บันทึก</button>
      </div>
    </Modal>
  );
}

// ── Tab: Assets ──
function AssetsTab({ assets, setAssets, maintenanceRecords }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [detail, setDetail] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // table | grid

  const handlePhotoChange = useCallback((assetId, photo) => {
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, photo } : a));
    if (detail && detail.id === assetId) setDetail(d => ({ ...d, photo }));
  }, [detail, setAssets]);

  const filtered = useMemo(() => assets.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterCat !== "all" && a.category !== filterCat) return false;
    if (search && !`${a.id} ${a.name} ${a.brand} ${a.serial} ${a.assignedTo || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [assets, search, filterStatus, filterCat]);

  const totalValue = assets.reduce((s, a) => s + calcDepreciation(a.price, a.purchaseDate, a.expectedLife).currentValue, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard label="อุปกรณ์ทั้งหมด" value={assets.length} sub={`ใช้งาน ${assets.filter(a => a.status === "active").length} | ว่าง ${assets.filter(a => a.status === "available").length}`} />
        <StatCard label="มูลค่าปัจจุบันรวม" value={`฿${fmt(Math.round(totalValue))}`} sub="หลังหักค่าเสื่อม" color={C.success} />
        <StatCard label="กำลังซ่อม" value={assets.filter(a => a.status === "maintenance").length} color={C.danger} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <input placeholder="ค้นหา รหัส / ชื่อ / ยี่ห้อ / serial..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...baseInput, paddingLeft: 36 }} />
          <span style={{ position: "absolute", left: 10, top: 9, color: C.textMuted }}><Icon d={icons.search} size={16} /></span>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...baseInput, width: "auto", cursor: "pointer" }}>
          <option value="all">ทุกสถานะ</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...baseInput, width: "auto", cursor: "pointer" }}>
          <option value="all">ทุกประเภท</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* View toggle */}
        <div style={{ display: "flex", borderRadius: 6, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {[["table", "☰"], ["grid", "⊞"]].map(([m, icon]) => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ ...baseBtn, borderRadius: 0, padding: "6px 12px", background: viewMode === m ? C.accent : "transparent", color: viewMode === m ? "#000" : C.textMuted, border: "none" }}>
              {icon}
            </button>
          ))}
        </div>

        <button onClick={() => setShowAdd(true)} style={accentBtn}><Icon d={icons.plus} size={14} /> เพิ่มอุปกรณ์</button>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {filtered.map(a => {
            const dep = calcDepreciation(a.price, a.purchaseDate, a.expectedLife);
            const emoji = PLACEHOLDER_PHOTOS[a.category] || "📦";
            return (
              <div key={a.id} onClick={() => setDetail(a)} style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, cursor: "pointer", overflow: "hidden", transition: "border-color .15s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                {/* Photo area */}
                <div style={{ height: 120, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {a.photo ? (
                    <img src={a.photo} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 48 }}>{emoji}</span>
                  )}
                  <div style={{ position: "absolute", top: 8, right: 8 }}><Badge status={a.status} /></div>
                  <div style={{ position: "absolute", bottom: 8, right: 8, transform: "scale(0.5)", transformOrigin: "bottom right" }}>
                    <QRCode text={a.id} cellSize={3} />
                  </div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontFamily: "monospace", color: C.accent, fontSize: 11, fontWeight: 600 }}>{a.id}</div>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>{a.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{a.brand} {a.model}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                    <span style={{ color: C.textMuted }}>{a.assignedTo || "ว่าง"}</span>
                    <span style={{ fontFamily: "monospace", color: dep.currentValue < a.price * 0.2 ? C.danger : C.success }}>฿{fmt(Math.round(dep.currentValue))}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["", "รหัส", "ชื่อ", "ประเภท", "สถานะ", "ผู้ใช้", "ราคาซื้อ", "มูลค่าปัจจุบัน"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 8px", color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: .5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const dep = calcDepreciation(a.price, a.purchaseDate, a.expectedLife);
                const emoji = PLACEHOLDER_PHOTOS[a.category] || "📦";
                return (
                  <tr key={a.id} onClick={() => setDetail(a)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "6px 8px", width: 44 }}>
                      {a.photo ? (
                        <img src={a.photo} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: 6, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{emoji}</div>
                      )}
                    </td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", color: C.accent, fontWeight: 600 }}>{a.id}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <div style={{ fontWeight: 600, color: C.text }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{a.brand} {a.model}</div>
                    </td>
                    <td style={{ padding: "10px 8px", color: C.textMuted }}>{a.category}</td>
                    <td style={{ padding: "10px 8px" }}><Badge status={a.status} /></td>
                    <td style={{ padding: "10px 8px", color: a.assignedTo ? C.text : C.textMuted }}>{a.assignedTo || "-"}</td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>฿{fmt(a.price)}</td>
                    <td style={{ padding: "10px 8px", fontFamily: "monospace", color: dep.currentValue < a.price * 0.2 ? C.danger : C.success }}>฿{fmt(Math.round(dep.currentValue))}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: C.textMuted }}>ไม่พบอุปกรณ์</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {detail && <AssetDetail asset={detail} onClose={() => setDetail(null)} maintenanceRecords={maintenanceRecords.filter(m => m.assetId === detail.id)} onPhotoChange={handlePhotoChange} />}
      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onAdd={a => { setAssets(prev => [...prev, a]); setShowAdd(false); }} nextId={`EQ-${String(assets.length + 1).padStart(3, "0")}`} />}
    </div>
  );
}

// ── Tab: Assignments ──
function AssignmentsTab({ assignments, assets }) {
  const current = assignments.filter(a => !a.dateIn);
  const history = assignments.filter(a => a.dateIn);

  return (
    <div>
      <h3 style={{ fontSize: 16, color: C.text, marginBottom: 12 }}>การมอบหมายปัจจุบัน ({current.length})</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 28 }}>
        {current.map(a => {
          const asset = assets.find(x => x.id === a.assetId);
          const emoji = asset ? (PLACEHOLDER_PHOTOS[asset.category] || "📦") : "📦";
          return (
            <div key={a.id} style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, display: "flex", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {asset?.photo ? <img src={asset.photo} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} /> : <span style={{ fontSize: 24 }}>{emoji}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", color: C.accent, fontSize: 12, fontWeight: 600 }}>{a.assetId}</span>
                  <Badge status="active" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{asset?.name || a.assetId}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>👤 {a.person}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>รับเมื่อ {fmtDate(a.dateOut)} ({daysBetween(a.dateOut, today)} วัน)</div>
              </div>
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 16, color: C.text, marginBottom: 12 }}>ประวัติ ({history.length})</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {["อุปกรณ์", "ผู้ใช้", "วันรับ", "วันคืน", "ระยะเวลา", "หมายเหตุ"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.textMuted, fontWeight: 600, fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.map(a => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.accent }}>{a.assetId}</td>
              <td style={{ padding: "8px 12px", color: C.text }}>{a.person}</td>
              <td style={{ padding: "8px 12px", color: C.textMuted }}>{fmtDate(a.dateOut)}</td>
              <td style={{ padding: "8px 12px", color: C.textMuted }}>{fmtDate(a.dateIn)}</td>
              <td style={{ padding: "8px 12px", color: C.textMuted }}>{daysBetween(a.dateOut, a.dateIn)} วัน</td>
              <td style={{ padding: "8px 12px", color: C.textMuted, fontStyle: "italic" }}>{a.notes || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Maintenance ──
function MaintenanceTab({ records, assets }) {
  const byAsset = {};
  records.forEach(r => { (byAsset[r.assetId] = byAsset[r.assetId] || []).push(r); });

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <StatCard label="ซ่อมทั้งหมด" value={`${records.length} ครั้ง`} />
        <StatCard label="ค่าซ่อมรวม" value={`฿${fmt(records.reduce((s, r) => s + r.cost, 0))}`} color={C.danger} />
        <StatCard label="รอซ่อมถัดไป" value={assets.filter(a => a.nextMaintenance && a.nextMaintenance <= "2025-04-05").length} sub="ภายใน 30 วัน" color={C.info} />
      </div>

      {Object.entries(byAsset).map(([assetId, recs]) => {
        const asset = assets.find(a => a.id === assetId);
        const total = recs.reduce((s, r) => s + r.cost, 0);
        const ratio = asset ? (total / asset.price * 100).toFixed(0) : 0;
        return (
          <div key={assetId} style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span style={{ fontFamily: "monospace", color: C.accent, fontSize: 12 }}>{assetId}</span>
                <span style={{ marginLeft: 8, fontWeight: 600, color: C.text }}>{asset?.name}</span>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: C.textMuted }}>ค่าซ่อมรวม </span>
                <span style={{ color: ratio > 50 ? C.danger : C.text, fontWeight: 600, fontFamily: "monospace" }}>฿{fmt(total)}</span>
                <span style={{ color: ratio > 50 ? C.danger : C.textMuted, fontSize: 11, marginLeft: 4 }}>({ratio}%)</span>
              </div>
            </div>
            {recs.sort((a, b) => b.date.localeCompare(a.date)).map(r => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
                <div>
                  <span style={{ color: C.text }}>{r.description}</span>
                  <span style={{ color: C.textMuted, marginLeft: 8, fontSize: 11 }}>{r.vendor}</span>
                </div>
                <div style={{ whiteSpace: "nowrap" }}>
                  <span style={{ color: C.textMuted, marginRight: 12 }}>{fmtDate(r.date)}</span>
                  <span style={{ color: C.accent, fontFamily: "monospace" }}>฿{fmt(r.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Alerts ──
function AlertsTab({ assets }) {
  const alerts = [];
  assets.forEach(a => {
    if (a.warrantyEnd && a.warrantyEnd <= "2025-06-05") {
      const days = daysBetween(today, a.warrantyEnd);
      alerts.push({ type: days < 0 ? "danger" : "warning", asset: a, msg: days < 0 ? `ประกันหมดแล้ว ${Math.abs(days)} วัน` : `ประกันจะหมดใน ${days} วัน`, sort: days });
    }
    if (a.nextMaintenance && a.nextMaintenance <= "2025-04-05") {
      const days = daysBetween(today, a.nextMaintenance);
      alerts.push({ type: days < 0 ? "danger" : "info", asset: a, msg: days < 0 ? `เลยกำหนดบำรุงรักษา ${Math.abs(days)} วัน` : `ถึงกำหนดบำรุงรักษาใน ${days} วัน`, sort: days });
    }
    const dep = calcDepreciation(a.price, a.purchaseDate, a.expectedLife);
    if (dep.yearsUsed >= a.expectedLife * 0.9 && a.status !== "retired") {
      alerts.push({ type: "warning", asset: a, msg: `ใกล้หมดอายุการใช้งาน (${dep.yearsUsed.toFixed(1)}/${a.expectedLife} ปี)`, sort: 100 });
    }
  });
  alerts.sort((a, b) => a.sort - b.sort);
  const colorMap = { danger: { bg: "#2d1215", border: "#7f1d1d", text: C.danger }, warning: { bg: "#2d2305", border: "#713f12", text: C.accent }, info: { bg: "#0c1929", border: "#1e3a5f", text: C.info } };

  return (
    <div>
      <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>แจ้งเตือน {alerts.length} รายการ</div>
      {alerts.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>ไม่มีแจ้งเตือน</div>}
      {alerts.map((a, i) => {
        const c = colorMap[a.type];
        return (
          <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontFamily: "monospace", color: C.accent, fontSize: 12, marginRight: 8 }}>{a.asset.id}</span>
              <span style={{ color: C.text, fontWeight: 500 }}>{a.asset.name}</span>
              <span style={{ color: c.text, marginLeft: 12, fontSize: 13 }}>{a.msg}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Booking ──
function BookingTab({ bookings, assets }) {
  return (
    <div>
      <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>อุปกรณ์กลาง {assets.filter(a => ["camera", "projector", "vehicle"].includes(a.category)).length} รายการ • การจอง {bookings.length} รายการ</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {bookings.map(b => {
          const asset = assets.find(a => a.id === b.assetId);
          const isPast = b.dateEnd < today;
          const isCurrent = b.dateStart <= today && b.dateEnd >= today;
          return (
            <div key={b.id} style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${isCurrent ? C.accent : C.border}`, opacity: isPast ? .6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: C.text }}>{asset?.name}</span>
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 99, background: isCurrent ? C.accentDim : isPast ? C.bg : "#1e3a5f", color: isCurrent ? C.accent : isPast ? C.textMuted : C.info }}>
                  {isCurrent ? "กำลังยืม" : isPast ? "คืนแล้ว" : "จองไว้"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: C.textMuted }}>👤 {b.person}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>📅 {fmtDate(b.dateStart)} — {fmtDate(b.dateEnd)}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>📝 {b.purpose}</div>
              {b.conditionBefore && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>สภาพก่อนยืม: {b.conditionBefore} {b.conditionAfter ? `→ หลังคืน: ${b.conditionAfter}` : ""}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Reports ──
function ReportsTab({ assets, maintenanceRecords }) {
  const totalOriginal = assets.reduce((s, a) => s + a.price, 0);
  const totalCurrent = assets.reduce((s, a) => s + calcDepreciation(a.price, a.purchaseDate, a.expectedLife).currentValue, 0);
  const totalRepair = maintenanceRecords.reduce((s, r) => s + r.cost, 0);

  const repairByAsset = {};
  maintenanceRecords.forEach(r => { repairByAsset[r.assetId] = (repairByAsset[r.assetId] || 0) + r.cost; });
  const highRepair = Object.entries(repairByAsset)
    .map(([id, cost]) => { const a = assets.find(x => x.id === id); return a ? { ...a, repairCost: cost, ratio: cost / a.price } : null; })
    .filter(a => a && a.ratio > 0.3)
    .sort((a, b) => b.ratio - a.ratio);

  const unused = assets.filter(a => a.status === "available");
  const byCat = {};
  assets.forEach(a => { byCat[a.category] = (byCat[a.category] || 0) + 1; });

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="มูลค่าราคาซื้อรวม" value={`฿${fmt(totalOriginal)}`} />
        <StatCard label="มูลค่าปัจจุบันรวม" value={`฿${fmt(Math.round(totalCurrent))}`} color={C.success} />
        <StatCard label="ค่าเสื่อมสะสม" value={`฿${fmt(Math.round(totalOriginal - totalCurrent))}`} color={C.danger} />
        <StatCard label="ค่าซ่อมรวม" value={`฿${fmt(totalRepair)}`} color={C.accent} />
      </div>

      <div style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, color: C.text }}>จำนวนตามประเภท</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(byCat).map(([cat, count]) => (
            <div key={cat} style={{ background: C.bg, borderRadius: 6, padding: "8px 16px", fontSize: 13 }}>
              <span style={{ color: C.textMuted }}>{cat}</span>
              <span style={{ marginLeft: 8, fontWeight: 700, color: C.accent }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {highRepair.length > 0 && (
        <div style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, color: C.danger }}>⚠ ค่าซ่อมสูงผิดปกติ — ควรพิจารณาทิ้ง</h4>
          {highRepair.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <div>
                <span style={{ fontFamily: "monospace", color: C.accent }}>{a.id}</span>
                <span style={{ marginLeft: 8, color: C.text }}>{a.name}</span>
              </div>
              <div>
                <span style={{ color: C.textMuted }}>ซ่อม ฿{fmt(a.repairCost)} / ซื้อ ฿{fmt(a.price)}</span>
                <span style={{ color: C.danger, fontWeight: 700, marginLeft: 8 }}>({(a.ratio * 100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: C.surface, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, color: C.info }}>อุปกรณ์ที่ไม่มีคนใช้ ({unused.length})</h4>
        {unused.length === 0 ? <div style={{ color: C.textMuted, fontSize: 13 }}>ไม่มี</div> : unused.map(a => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
            <div>
              <span style={{ fontFamily: "monospace", color: C.accent }}>{a.id}</span>
              <span style={{ marginLeft: 8, color: C.text }}>{a.name}</span>
            </div>
            <span style={{ color: C.textMuted }}>฿{fmt(Math.round(calcDepreciation(a.price, a.purchaseDate, a.expectedLife).currentValue))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ──
const TABS = [
  { key: "assets", label: "ทะเบียนอุปกรณ์", icon: icons.assets },
  { key: "assign", label: "การมอบหมาย", icon: icons.assign },
  { key: "maintenance", label: "ซ่อมบำรุง", icon: icons.maintenance },
  { key: "alerts", label: "แจ้งเตือน", icon: icons.alert },
  { key: "booking", label: "ยืม-คืน", icon: icons.booking },
  { key: "reports", label: "รายงาน", icon: icons.report },
];

export default function App() {
  const [tab, setTab] = useState("assets");
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const alertCount = useMemo(() => {
    let c = 0;
    assets.forEach(a => {
      if (a.warrantyEnd && a.warrantyEnd <= "2025-06-05") c++;
      if (a.nextMaintenance && a.nextMaintenance <= "2025-04-05") c++;
      const dep = calcDepreciation(a.price, a.purchaseDate, a.expectedLife);
      if (dep.yearsUsed >= a.expectedLife * 0.9 && a.status !== "retired") c++;
    });
    return c;
  }, [assets]);

  return (
    <div style={{ fontFamily: FONT, background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <nav style={{ width: sidebarOpen ? 220 : 56, background: C.surface, borderRight: `1px solid ${C.border}`, padding: "16px 0", display: "flex", flexDirection: "column", transition: "width .2s", flexShrink: 0, overflow: "hidden" }}>
        <div style={{ padding: "0 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000", fontSize: 14, flexShrink: 0 }}>E</div>
          {sidebarOpen && <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap" }}>EquipTrack</span>}
        </div>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: tab === t.key ? C.surfaceHover : "transparent", border: "none", color: tab === t.key ? C.accent : C.textMuted, cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: tab === t.key ? 600 : 400, width: "100%", textAlign: "left", borderLeft: tab === t.key ? `3px solid ${C.accent}` : "3px solid transparent", transition: "all .15s", position: "relative" }}>
            <Icon d={t.icon} size={18} color={tab === t.key ? C.accent : C.textMuted} />
            {sidebarOpen && <span style={{ whiteSpace: "nowrap" }}>{t.label}</span>}
            {t.key === "alerts" && alertCount > 0 && (
              <span style={{ position: sidebarOpen ? "relative" : "absolute", right: sidebarOpen ? 0 : 4, top: sidebarOpen ? 0 : 4, background: C.danger, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 99, minWidth: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{alertCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "24px 28px", overflow: "auto" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: C.text }}>
          {TABS.find(t => t.key === tab)?.label}
        </h2>
        {tab === "assets" && <AssetsTab assets={assets} setAssets={setAssets} maintenanceRecords={INITIAL_MAINTENANCE} />}
        {tab === "assign" && <AssignmentsTab assignments={INITIAL_ASSIGNMENTS} assets={assets} />}
        {tab === "maintenance" && <MaintenanceTab records={INITIAL_MAINTENANCE} assets={assets} />}
        {tab === "alerts" && <AlertsTab assets={assets} />}
        {tab === "booking" && <BookingTab bookings={INITIAL_BOOKINGS} assets={assets} />}
        {tab === "reports" && <ReportsTab assets={assets} maintenanceRecords={INITIAL_MAINTENANCE} />}
      </main>
    </div>
  );
}
