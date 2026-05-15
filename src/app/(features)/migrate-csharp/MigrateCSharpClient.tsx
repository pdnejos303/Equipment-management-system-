// Path: src/app/(features)/migrate-csharp/MigrateCSharpClient.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { showSuccess } from "@/lib/swal";
import {
  FileCode2, Database, ArrowRight, CheckCircle2, AlertTriangle,
  Upload, FolderOpen, Sparkles, Eye, Play, Loader2, Lock, KeyRound, Link2,
  Table2, Layers, Filter, Calculator, RefreshCw, Info, Type as TypeIcon, Hash,
  Calendar as CalendarIcon, ToggleLeft,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;
type Conversion = "string" | "number" | "date" | "boolean" | "fk-lookup" | "computed" | "filter";

interface Column {
  name: string;
  type: string;
  isPK?: boolean;
  fk?: string;
  nullable?: boolean;
}

interface FieldMap {
  source: string;
  target: string | null;
  conversion: Conversion;
  note?: string;
  required?: boolean;
}

interface MockTable {
  name: string;
  description: string;
  rowCount: number;
  targetTable: string;
  isLookup?: boolean;
  columns: Column[];
  sampleRows: Record<string, any>[];
  fieldMappings: FieldMap[];
}

// ────────────────────────────────────────────────────────────
// Mock C# Legacy Schema
// ────────────────────────────────────────────────────────────

// Schema source: TaeAuthenticationTest C# project (ApplicationDbContextModelSnapshot.cs)
// EF Core 7.0.19 + ASP.NET Identity + custom Items table

const MOCK_TABLES: MockTable[] = [
  {
    name: "Items",
    description: "Main asset table (TaeAuthenticationTest schema)",
    rowCount: 50,
    targetTable: "Asset",
    columns: [
      { name: "Id", type: "INT IDENTITY", isPK: true },
      { name: "AssetCode", type: "NVARCHAR(MAX)", nullable: true },
      { name: "Brand", type: "NVARCHAR(MAX)", nullable: true },
      { name: "Catagory", type: "NVARCHAR(MAX)", nullable: true },
      { name: "CreateAt", type: "DATETIME2", nullable: true },
      { name: "ImageData", type: "VARBINARY(MAX)", nullable: true },
      { name: "Name", type: "NVARCHAR(MAX)", nullable: true },
      { name: "Price", type: "INT" },
      { name: "SerialNumber", type: "NVARCHAR(MAX)", nullable: true },
      { name: "Status", type: "NVARCHAR(MAX)", nullable: true },
      { name: "Unit", type: "INT" },
      { name: "address", type: "NVARCHAR(MAX)", nullable: true },
      { name: "detail", type: "NVARCHAR(MAX)", nullable: true },
      { name: "expire", type: "DATETIME2", nullable: true },
    ],
    sampleRows: [
      { Id: 1, AssetCode: "AS-001", Brand: "Dell", Catagory: "Computer", CreateAt: "2023-06-15T10:30:00", ImageData: "<binary 245 KB>", Name: "Dell Latitude 5520", Price: 35000, SerialNumber: "DL5520-001", Status: "Active", Unit: 1, address: "ห้องบัญชี ชั้น 3", detail: "โน๊ตบุ๊กพนักงาน", expire: "2026-06-15T00:00:00" },
      { Id: 2, AssetCode: "AS-002", Brand: "Canon", Catagory: "Camera", CreateAt: "2022-11-20T14:00:00", ImageData: "<binary 312 KB>", Name: "Canon EOS 90D", Price: 52000, SerialNumber: "CN90D-2022", Status: "Active", Unit: 1, address: "ห้องถ่ายภาพ", detail: "กล้องสำหรับงาน event", expire: null },
      { Id: 3, AssetCode: "AS-003", Brand: "Toyota", Catagory: "Vehicle", CreateAt: "2020-03-10T09:00:00", ImageData: null, Name: "Toyota Vios", Price: 580000, SerialNumber: "MR053-VIOS", Status: "Available", Unit: 1, address: "ลานจอดรถ", detail: "รถบริษัท", expire: "2025-03-10T00:00:00" },
      { Id: 4, AssetCode: "AS-004", Brand: "HP", Catagory: "Printer", CreateAt: "2021-09-05T11:30:00", ImageData: "<binary 89 KB>", Name: "HP LaserJet M404", Price: 8500, SerialNumber: "HPLJ-404-12", Status: "Maintenance", Unit: 2, address: "สำนักงาน", detail: "เครื่องพิมพ์เอกสาร", expire: null },
      { Id: 5, AssetCode: "AS-005", Brand: "Dell", Catagory: "Monitor", CreateAt: "2023-01-18T16:00:00", ImageData: "<binary 156 KB>", Name: "Dell U2722D", Price: 18500, SerialNumber: "DLU27-005", Status: "Active", Unit: 1, address: "ห้อง Design", detail: null, expire: "2026-01-18T00:00:00" },
    ],
    fieldMappings: [
      { source: "Id", target: null, conversion: "filter", note: "Auto-generated cuid in new system" },
      { source: "AssetCode", target: "code", conversion: "string", required: true },
      { source: "Brand", target: "brand", conversion: "string" },
      { source: "Catagory", target: "category", conversion: "fk-lookup", note: "[typo source] String → enum: Computer→LAPTOP, Camera→CAMERA, Vehicle→VEHICLE, Monitor→MONITOR, Printer→PRINTER, ..." },
      { source: "CreateAt", target: null, conversion: "filter", note: "Auto-set on insert" },
      { source: "ImageData", target: "AssetPhoto.url", conversion: "computed", note: "varbinary(max) → base64 → upload to Supabase Storage → save URL" },
      { source: "Name", target: "name", conversion: "string", required: true },
      { source: "Price", target: "purchasePrice", conversion: "number" },
      { source: "SerialNumber", target: "serialNumber", conversion: "string" },
      { source: "Status", target: "status", conversion: "fk-lookup", note: "String → enum: Active→ACTIVE, Available→AVAILABLE, Maintenance→MAINTENANCE, Retired→RETIRED" },
      { source: "Unit", target: "notes", conversion: "computed", note: "If Unit > 1, append 'จำนวน N ชิ้น' to notes (no Unit field in new schema)" },
      { source: "address", target: "location", conversion: "string", note: "lowercase field name in C#" },
      { source: "detail", target: "notes", conversion: "string", note: "lowercase field name in C#" },
      { source: "expire", target: "warrantyEnd", conversion: "date", note: "lowercase field name in C# (DATETIME2 → ISO date)" },
    ],
  },
  {
    name: "AspNetUsers",
    description: "ASP.NET Identity users — optional migration (passwords need reset)",
    rowCount: 12,
    targetTable: "User",
    columns: [
      { name: "Id", type: "NVARCHAR(450)", isPK: true },
      { name: "Email", type: "NVARCHAR(256)", nullable: true },
      { name: "UserName", type: "NVARCHAR(256)", nullable: true },
      { name: "PasswordHash", type: "NVARCHAR(MAX)", nullable: true },
      { name: "EmailConfirmed", type: "BIT" },
      { name: "PhoneNumber", type: "NVARCHAR(MAX)", nullable: true },
      { name: "LockoutEnabled", type: "BIT" },
      { name: "AccessFailedCount", type: "INT" },
    ],
    sampleRows: [
      { Id: "a1b2c3d4-e5f6-7890-abcd-...", Email: "admin@company.com", UserName: "admin", PasswordHash: "AQAAAAEAACcQAAAAEK...", EmailConfirmed: true, PhoneNumber: null, LockoutEnabled: true, AccessFailedCount: 0 },
      { Id: "b2c3d4e5-f6g7-8901-bcde-...", Email: "manager@company.com", UserName: "manager", PasswordHash: "AQAAAAEAACcQAAAAEM...", EmailConfirmed: true, PhoneNumber: "0812345678", LockoutEnabled: true, AccessFailedCount: 0 },
      { Id: "c3d4e5f6-g7h8-9012-cdef-...", Email: "staff@company.com", UserName: "staff", PasswordHash: "AQAAAAEAACcQAAAAEN...", EmailConfirmed: false, PhoneNumber: null, LockoutEnabled: true, AccessFailedCount: 1 },
    ],
    fieldMappings: [
      { source: "Id", target: null, conversion: "filter", note: "Use new cuid (different ID format)" },
      { source: "Email", target: "email", conversion: "string", required: true },
      { source: "UserName", target: "name", conversion: "string", required: true },
      { source: "PasswordHash", target: null, conversion: "filter", note: "ASP.NET Identity (PBKDF2) incompatible with bcrypt — users must reset password via email" },
      { source: "EmailConfirmed", target: null, conversion: "filter", note: "Not stored in new system" },
      { source: "PhoneNumber", target: null, conversion: "filter", note: "Not stored in new system" },
      { source: "LockoutEnabled", target: null, conversion: "filter", note: "Not used in new system" },
      { source: "AccessFailedCount", target: null, conversion: "filter", note: "Not used in new system" },
    ],
  },
];

// Validation checks for step 3 — reflects real Items + AspNetUsers schema
const VALIDATION_CHECKS = [
  { id: "schema", labelKey: "checkSchema", status: "passed" as const, count: 2, detail: "Items + AspNetUsers detected (TaeAuthenticationTest, EF Core 7.0.19)" },
  { id: "fk", labelKey: "checkFK", status: "passed" as const, count: 0, detail: "No FK relations — flat schema (Status/Catagory stored as strings)" },
  { id: "types", labelKey: "checkTypes", status: "warning" as const, count: 2, detail: "ImageData binary → base64 upload (~12 MB total). 'Catagory' typo normalized." },
  { id: "duplicates", labelKey: "checkDuplicates", status: "passed" as const, count: 0, detail: "AssetCode values appear unique" },
  { id: "required", labelKey: "checkRequired", status: "warning" as const, count: 3, detail: "3 rows have NULL AssetCode/Name → will skip. Passwords cannot migrate (PBKDF2 ≠ bcrypt)" },
];

// ────────────────────────────────────────────────────────────
// Helper components
// ────────────────────────────────────────────────────────────

function MockBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
      <Sparkles size={10} />
      {label}
    </span>
  );
}

function ConversionPill({ kind }: { kind: Conversion }) {
  const cfg: Record<Conversion, { label: string; cls: string; Icon: any }> = {
    string:      { label: "string",   cls: "bg-blue-500/10 text-blue-300 border-blue-500/20",    Icon: TypeIcon },
    number:      { label: "number",   cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", Icon: Hash },
    date:        { label: "date",     cls: "bg-violet-500/10 text-violet-300 border-violet-500/20", Icon: CalendarIcon },
    boolean:     { label: "boolean",  cls: "bg-orange-500/10 text-orange-300 border-orange-500/20", Icon: ToggleLeft },
    "fk-lookup": { label: "FK lookup", cls: "bg-amber-500/10 text-amber-300 border-amber-500/30",  Icon: Link2 },
    computed:    { label: "computed", cls: "bg-pink-500/10 text-pink-300 border-pink-500/20",     Icon: Calculator },
    filter:      { label: "filter",   cls: "bg-gray-500/10 text-gray-400 border-gray-500/20",     Icon: Filter },
  };
  const c = cfg[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border", c.cls)}>
      <c.Icon size={9} />
      {c.label}
    </span>
  );
}

function ColumnTypePill({ type }: { type: string }) {
  return (
    <span className="font-mono text-[10px] text-[var(--text-subtle)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">
      {type}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────

export function MigrateCSharpClient() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("Items");
  const [migrating, setMigrating] = useState(false);
  const [migrateProgress, setMigrateProgress] = useState(0);
  const [migrateDone, setMigrateDone] = useState(false);
  const [currentTableIdx, setCurrentTableIdx] = useState(0);

  const totalRows = MOCK_TABLES.reduce((s, tbl) => s + tbl.rowCount, 0);
  const willSkip = 1; // mock: IsDeleted=true rows
  const willMigrate = totalRows - willSkip;
  const failedChecks = VALIDATION_CHECKS.filter((c) => c.status === "warning").length;
  const passedChecks = VALIDATION_CHECKS.filter((c) => c.status === "passed").length;
  const errorChecks = 0;

  const activeTable = MOCK_TABLES.find((tbl) => tbl.name === selectedTable)!;

  const loadSample = async () => {
    setLoadingSample(true);
    await new Promise((r) => setTimeout(r, 700));
    setSampleLoaded(true);
    setLoadingSample(false);
  };

  const startMigration = async () => {
    setMigrating(true);
    setMigrateProgress(0);
    setCurrentTableIdx(0);
    const totalSteps = MOCK_TABLES.length;
    for (let ti = 0; ti < totalSteps; ti++) {
      setCurrentTableIdx(ti);
      for (let p = 0; p <= 100; p += 10) {
        await new Promise((r) => setTimeout(r, 60));
        const overall = Math.round(((ti + p / 100) / totalSteps) * 100);
        setMigrateProgress(overall);
      }
    }
    setMigrateProgress(100);
    setMigrating(false);
    setMigrateDone(true);
    showSuccess(t("migrateCS.migrateDone"), t("migrateCS.importedRecords", willMigrate));
  };

  const resetAll = () => {
    setStep(1);
    setSampleLoaded(false);
    setSelectedTable("Items");
    setMigrating(false);
    setMigrateProgress(0);
    setMigrateDone(false);
    setCurrentTableIdx(0);
  };

  // ─────────── Render ───────────
  return (
    <div className="page-enter pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
            <FileCode2 size={22} className="text-brand-500" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{t("migrateCS.pageTitle")}</h1>
              <MockBadge label={t("migrateCS.mockBadge")} />
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">{t("migrateCS.subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Mock notice banner */}
      <div className="flex items-start gap-2.5 p-3 mb-6 rounded-xl bg-amber-500/5 border border-amber-500/20 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <Info size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-200/80">{t("migrateCS.mockNotice")}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        {[
          { n: 1, label: t("migrateCS.step1") },
          { n: 2, label: t("migrateCS.step2") },
          { n: 3, label: t("migrateCS.step3") },
          { n: 4, label: t("migrateCS.step4") },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && <ArrowRight size={14} className="text-[var(--text-subtle)]" />}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              step === s.n && "bg-brand-500 text-black",
              step > s.n && "bg-green-500/10 text-green-400",
              step < s.n && "bg-[var(--surface-raised)] text-[var(--text-subtle)]"
            )}>
              {step > s.n ? <CheckCircle2 size={12} /> : <span>{s.n}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─────────── STEP 1: Source ─────────── */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Database size={16} className="text-brand-500" />
              <h2 className="font-semibold text-base">{t("migrateCS.sourceTitle")}</h2>
            </div>
            <p className="text-xs text-[var(--text-subtle)] mb-5">{t("migrateCS.sourceDesc")}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Upload SQL Dump (locked) */}
              <SourceCard
                Icon={Upload}
                title={t("migrateCS.sourceUpload")}
                desc={t("migrateCS.sourceUploadDesc")}
                locked
                lockedLabel={t("migrateCS.sourcePending")}
              />
              {/* Upload Folder (locked) */}
              <SourceCard
                Icon={FolderOpen}
                title={t("migrateCS.sourceFolder")}
                desc={t("migrateCS.sourceFolderDesc")}
                locked
                lockedLabel={t("migrateCS.sourcePending")}
              />
              {/* Use Sample Data */}
              <SourceCard
                Icon={Sparkles}
                title={t("migrateCS.sourceSample")}
                desc={t("migrateCS.sourceSampleDesc")}
                active={sampleLoaded}
                loading={loadingSample}
                onAction={loadSample}
                actionLabel={sampleLoaded ? t("migrateCS.loaded") : t("migrateCS.loadSample")}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setStep(2)}
                disabled={!sampleLoaded}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("migrateCS.next")}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* "How this differs" info card */}
          <DiffCard t={t} />
        </div>
      )}

      {/* ─────────── STEP 2: Schema + Mapping ─────────── */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 animate-fade-in">
          {/* Left: Tables list */}
          <div className="card p-3 space-y-1 lg:max-h-[700px] lg:overflow-y-auto">
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <Layers size={14} className="text-brand-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t("migrateCS.schemaTitle")}
              </h3>
              <span className="ml-auto text-xs text-[var(--text-subtle)]">{MOCK_TABLES.length}</span>
            </div>
            {MOCK_TABLES.map((tbl) => (
              <button
                key={tbl.name}
                onClick={() => setSelectedTable(tbl.name)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-all border",
                  selectedTable === tbl.name
                    ? "bg-brand-500/10 border-brand-500/30"
                    : "border-transparent hover:bg-[var(--surface-hover)]"
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Table2 size={13} className={selectedTable === tbl.name ? "text-brand-500" : "text-[var(--text-subtle)]"} />
                  <p className={cn("text-sm font-medium font-mono", selectedTable === tbl.name && "text-brand-500")}>
                    {tbl.name}
                  </p>
                  {tbl.isLookup && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
                      lookup
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-subtle)] mb-1.5 truncate">{tbl.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-[var(--text-subtle)]">
                  <span>{tbl.rowCount} {t("migrateCS.schemaRows")}</span>
                  <span>·</span>
                  <span>{tbl.columns.length} {t("migrateCS.schemaCols")}</span>
                </div>
                <div className="text-[10px] text-[var(--text-subtle)] mt-0.5 truncate">
                  {t("migrateCS.targetTable", tbl.targetTable)}
                </div>
              </button>
            ))}
          </div>

          {/* Right: Selected table detail */}
          <div className="space-y-4">
            {/* Schema columns */}
            <div className="card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Table2 size={15} className="text-brand-500" />
                  <h3 className="font-mono font-semibold">{activeTable.name}</h3>
                  <ArrowRight size={12} className="text-[var(--text-subtle)]" />
                  <span className="text-sm text-brand-500 font-mono">{activeTable.targetTable}</span>
                </div>
                <span className="text-xs text-[var(--text-subtle)]">
                  {activeTable.rowCount} {t("migrateCS.schemaRows")}
                </span>
              </div>

              {/* Columns */}
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--surface-raised)]">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">Column</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">SQL Type</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">Key</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">Sample</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTable.columns.map((col) => (
                      <tr key={col.name} className="border-t border-[var(--border)] hover:bg-[var(--surface-hover)]/40">
                        <td className="py-1.5 px-3 font-mono">
                          {col.name}
                          {col.nullable && <span className="text-[var(--text-subtle)] ml-1">?</span>}
                        </td>
                        <td className="py-1.5 px-3"><ColumnTypePill type={col.type} /></td>
                        <td className="py-1.5 px-3">
                          {col.isPK && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-brand-500 bg-brand-500/10 px-1.5 py-0.5 rounded">
                              <KeyRound size={9} /> {t("migrateCS.schemaPrimary")}
                            </span>
                          )}
                          {col.fk && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded">
                              <Link2 size={9} /> {t("migrateCS.schemaForeign", col.fk)}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-[var(--text-subtle)] font-mono max-w-[180px] truncate">
                          {String(activeTable.sampleRows[0]?.[col.name] ?? "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Field mapping */}
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight size={15} className="text-brand-500" />
                <h3 className="font-semibold text-sm">{t("migrateCS.mappingTitle", activeTable.name)}</h3>
              </div>
              <p className="text-xs text-[var(--text-subtle)] mb-4">{t("migrateCS.mappingDesc")}</p>

              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--surface-raised)]">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">{t("migrateCS.mapSource")}</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">{t("migrateCS.mapTarget")}</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">{t("migrateCS.mapType")}</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--text-subtle)] uppercase tracking-wider text-[10px]">{t("migrateCS.mapNote")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTable.fieldMappings.map((m) => (
                      <tr key={m.source} className={cn(
                        "border-t border-[var(--border)] hover:bg-[var(--surface-hover)]/40",
                        m.target === null && "opacity-50"
                      )}>
                        <td className="py-1.5 px-3 font-mono">
                          {m.source}
                          {m.required && <span className="text-red-400 ml-1">*</span>}
                        </td>
                        <td className="py-1.5 px-3">
                          {m.target === null ? (
                            <span className="text-[var(--text-subtle)] italic">{t("migrateCS.mapSkip")}</span>
                          ) : (
                            <span className="font-mono text-brand-500">{m.target}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3"><ConversionPill kind={m.conversion} /></td>
                        <td className="py-1.5 px-3 text-[var(--text-subtle)] max-w-[300px]">
                          {m.note || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between gap-2">
              <button onClick={() => setStep(1)} className="btn-ghost flex items-center gap-2">
                <ArrowRight size={14} className="rotate-180" />
                {t("migrateCS.back")}
              </button>
              <button onClick={() => setStep(3)} className="btn-primary flex items-center gap-2">
                {t("migrateCS.next")}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── STEP 3: Pre-flight + Preview ─────────── */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label={t("migrateCS.willMigrate")} value={willMigrate} accent="green" />
            <StatCard label={t("migrateCS.willSkip")} value={willSkip} accent="amber" />
            <StatCard label={t("migrateCS.willError")} value={errorChecks} accent="red" />
            <StatCard label={t("migrateCS.validationPassed", passedChecks)} value={`${passedChecks}/${VALIDATION_CHECKS.length}`} accent="brand" />
          </div>

          {/* Validation checks */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={15} className="text-brand-500" />
              <h3 className="font-semibold">{t("migrateCS.previewTitle")}</h3>
            </div>
            <p className="text-xs text-[var(--text-subtle)] mb-4">{t("migrateCS.previewDesc")}</p>

            <div className="space-y-2">
              {VALIDATION_CHECKS.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    c.status === "passed" && "bg-green-500/5 border-green-500/20",
                    c.status === "warning" && "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  {c.status === "passed" ? (
                    <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t(`migrateCS.${c.labelKey}`)}</p>
                    <p className="text-xs text-[var(--text-subtle)] mt-0.5">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sample preview */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Database size={15} className="text-brand-500" />
              <h3 className="font-semibold text-sm">{t("migrateCS.samplePreview")}</h3>
              <span className="ml-2 text-xs text-[var(--text-subtle)] font-mono">→ Asset</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead className="bg-[var(--surface-raised)]">
                  <tr>
                    {["code", "name", "category", "status", "brand", "purchasePrice"].map((h) => (
                      <th key={h} className="text-left py-2 px-3 font-mono text-[10px] text-brand-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: "AS-001", name: "Dell Latitude 5520", category: "LAPTOP", status: "ACTIVE", brand: "Dell", purchasePrice: 35000 },
                    { code: "AS-002", name: "Canon EOS 90D", category: "CAMERA", status: "ACTIVE", brand: "Canon", purchasePrice: 52000 },
                    { code: "AS-003", name: "Toyota Vios", category: "VEHICLE", status: "AVAILABLE", brand: "Toyota", purchasePrice: 580000 },
                    { code: "AS-004", name: "HP LaserJet M404", category: "PRINTER", status: "MAINTENANCE", brand: "HP", purchasePrice: 8500 },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      {["code", "name", "category", "status", "brand", "purchasePrice"].map((k) => (
                        <td key={k} className="py-1.5 px-3 font-mono text-[var(--text-default)]">
                          {String(row[k as keyof typeof row])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <button onClick={() => setStep(2)} className="btn-ghost flex items-center gap-2">
              <ArrowRight size={14} className="rotate-180" />
              {t("migrateCS.back")}
            </button>
            <button onClick={() => setStep(4)} className="btn-primary flex items-center gap-2">
              {t("migrateCS.next")}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─────────── STEP 4: Migrate ─────────── */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <Play size={16} className="text-brand-500" />
              <h3 className="font-semibold">{t("migrateCS.migrateTitle")}</h3>
            </div>

            {!migrating && !migrateDone && (
              <>
                <p className="text-xs text-[var(--text-subtle)] mb-5">{t("migrateCS.migrateConfirm")}</p>
                <div className="flex justify-between gap-2">
                  <button onClick={() => setStep(3)} className="btn-ghost flex items-center gap-2">
                    <ArrowRight size={14} className="rotate-180" />
                    {t("migrateCS.back")}
                  </button>
                  <button onClick={startMigration} className="btn-primary flex items-center gap-2">
                    <Play size={14} />
                    {t("migrateCS.startMigration")}
                  </button>
                </div>
              </>
            )}

            {migrating && (
              <>
                <p className="text-xs text-[var(--text-subtle)] mb-4">{t("migrateCS.migrateRunning")}</p>
                <ProgressBar value={migrateProgress} />
                <div className="mt-4 space-y-2">
                  {MOCK_TABLES.map((tbl, i) => (
                    <div key={tbl.name} className="flex items-center gap-2 text-xs">
                      {i < currentTableIdx ? (
                        <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                      ) : i === currentTableIdx ? (
                        <Loader2 size={13} className="text-brand-500 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-[13px] h-[13px] rounded-full border border-[var(--border-strong)] flex-shrink-0" />
                      )}
                      <span className={cn(
                        "font-mono",
                        i < currentTableIdx ? "text-[var(--text-default)]" :
                        i === currentTableIdx ? "text-brand-500" :
                        "text-[var(--text-subtle)]"
                      )}>
                        {tbl.name}
                      </span>
                      <span className="text-[var(--text-subtle)] ml-auto">
                        {i < currentTableIdx ? `${tbl.rowCount}/${tbl.rowCount}` : i === currentTableIdx ? "..." : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {migrateDone && (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("migrateCS.migrateDone")}</h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  {t("migrateCS.importedRecords", willMigrate)}
                </p>

                <div className="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">
                  <StatCard label={t("migrateCS.willMigrate")} value={willMigrate} accent="green" />
                  <StatCard label={t("migrateCS.willSkip")} value={willSkip} accent="amber" />
                  <StatCard label={t("migrateCS.willError")} value={0} accent="brand" />
                </div>

                <div className="flex gap-2 justify-center flex-wrap">
                  <button onClick={resetAll} className="btn-ghost flex items-center gap-2">
                    <RefreshCw size={14} />
                    {t("migrateCS.reset")}
                  </button>
                  <Link href="/assets" className="btn-primary flex items-center gap-2">
                    <Database size={14} />
                    {t("migrateCS.finishViewAssets")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SourceCard({
  Icon, title, desc, locked, lockedLabel, active, loading, onAction, actionLabel,
}: {
  Icon: any;
  title: string;
  desc: string;
  locked?: boolean;
  lockedLabel?: string;
  active?: boolean;
  loading?: boolean;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className={cn(
      "relative p-4 rounded-xl border transition-all",
      locked
        ? "border-[var(--border)] bg-[var(--surface-raised)]/40 opacity-60"
        : active
        ? "border-green-500/40 bg-green-500/5"
        : "border-[var(--border)] hover:border-brand-500/40 hover:bg-[var(--surface-hover)]"
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          locked ? "bg-[var(--surface-raised)]" : active ? "bg-green-500/10" : "bg-brand-500/10"
        )}>
          {locked ? <Lock size={16} className="text-[var(--text-subtle)]" /> :
           active ? <CheckCircle2 size={16} className="text-green-500" /> :
           <Icon size={16} className="text-brand-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold mb-0.5">{title}</p>
          <p className="text-[11px] text-[var(--text-subtle)] leading-relaxed">{desc}</p>
        </div>
      </div>

      {locked ? (
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-subtle)] bg-[var(--surface-raised)] px-2 py-1.5 rounded">
          <Lock size={10} />
          {lockedLabel}
        </div>
      ) : (
        <button
          onClick={onAction}
          disabled={loading || active}
          className={cn(
            "w-full text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5",
            active
              ? "bg-green-500/10 text-green-400 cursor-default"
              : "bg-brand-500/10 text-brand-500 hover:bg-brand-500/20"
          )}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : active ? <CheckCircle2 size={12} /> : <Sparkles size={12} />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function StatCard({
  label, value, accent,
}: {
  label: string;
  value: string | number;
  accent: "green" | "amber" | "red" | "brand";
}) {
  const colorMap = {
    green: "text-green-500",
    amber: "text-amber-400",
    red: "text-red-400",
    brand: "text-brand-500",
  };
  return (
    <div className="bg-[var(--surface-raised)] rounded-lg p-3 border border-[var(--border)]">
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-1">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", colorMap[accent])}>{value}</p>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)] font-medium">Progress</span>
        <span className="font-mono text-brand-500">{value}%</span>
      </div>
      <div className="h-2 bg-[var(--surface-raised)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-amber-300 transition-all duration-200"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function DiffCard({ t }: { t: (key: string, ...args: any[]) => string }) {
  return (
    <div className="card border-l-2 border-l-brand-500/40">
      <div className="flex items-center gap-2 mb-3">
        <Info size={15} className="text-brand-500" />
        <h3 className="font-semibold text-sm">{t("migrateCS.diffTitle")}</h3>
      </div>
      <ul className="space-y-2">
        {[t("migrateCS.diffPoint1"), t("migrateCS.diffPoint2"), t("migrateCS.diffPoint3"), t("migrateCS.diffPoint4")].map((point) => (
          <li key={point} className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
            <CheckCircle2 size={12} className="text-brand-500 mt-0.5 flex-shrink-0" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
