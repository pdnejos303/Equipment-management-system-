// Path: src/app/(features)/migrate/MigrateClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { Upload, ArrowRight, CheckCircle2, FileJson, Database, Eye, Play, HardDrive, FolderInput } from "lucide-react";
import { showError, showSuccess } from "@/lib/swal";
import { BackupClient } from "./BackupClient";

type DataType = "assets" | "assignments" | "maintenance" | "bookings";

interface SchemaInfo {
  required: string[];
  optional: string[];
}

const SCHEMA: Record<DataType, SchemaInfo> = {
  assets: {
    required: ["code", "name"],
    optional: ["brand", "model", "serialNumber", "category", "status", "purchaseDate", "purchasePrice", "expectedLife", "warrantyEnd", "nextMaintenance", "location", "notes"],
  },
  assignments: {
    required: ["assetCode", "personName"],
    optional: ["department", "dateOut", "dateIn", "notes"],
  },
  maintenance: {
    required: ["assetCode", "description"],
    optional: ["date", "cost", "vendor", "type", "notes"],
  },
  bookings: {
    required: ["assetCode", "personName", "dateStart", "dateEnd"],
    optional: ["purpose", "status"],
  },
};

interface MigrateResult {
  success: boolean;
  type: string;
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  preview?: any[];
}

type Tab = "import" | "backup";

export function MigrateClient() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("import");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dataType, setDataType] = useState<DataType>("assets");
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [previewResult, setPreviewResult] = useState<MigrateResult | null>(null);
  const [importResult, setImportResult] = useState<MigrateResult | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Step 1: Upload File ──

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      let parsed: Record<string, any>[];

      if (file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        parsed = Array.isArray(json) ? json : json.data || json.items || json.records || [json];
      } else if (file.name.endsWith(".csv")) {
        parsed = parseCSV(text);
      } else {
        showError("Supported formats: .json, .csv");
        return;
      }

      if (parsed.length === 0) {
        showError("No data found in file");
        return;
      }

      setRawData(parsed);
      const fields = Object.keys(parsed[0]);
      setSourceFields(fields);

      // Auto-map fields by fuzzy matching
      const schema = SCHEMA[dataType];
      const allTargetFields = [...schema.required, ...schema.optional];
      const autoMap: Record<string, string> = {};

      for (const target of allTargetFields) {
        const match = fields.find((f) => {
          const fLower = f.toLowerCase().replace(/[_\s-]/g, "");
          const tLower = target.toLowerCase();
          return fLower === tLower || fLower.includes(tLower) || tLower.includes(fLower);
        });
        if (match) autoMap[target] = match;
      }

      setFieldMap(autoMap);
      setStep(2);
    } catch (err: any) {
      showError("Parse error", err.message);
    }
  }, [dataType]);

  // ── Step 2 → 3: Preview ──

  const handlePreview = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: dataType,
          data: rawData,
          fieldMap,
          options: { skipDuplicates, dryRun: true },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setPreviewResult(result);
      setStep(3);
    } catch (err: any) {
      showError("Preview Error", err.message);
    }
    setLoading(false);
  };

  // ── Step 3 → 4: Import ──

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: dataType,
          data: rawData,
          fieldMap,
          options: { skipDuplicates, dryRun: false },
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setImportResult(result);
      setStep(4);
      showSuccess(t("migrate.complete"), `นำเข้า ${result.imported} รายการสำเร็จ`);
    } catch (err: any) {
      showError("Import Error", err.message);
    }
    setLoading(false);
  };

  const reset = () => {
    setStep(1);
    setRawData([]);
    setSourceFields([]);
    setFieldMap({});
    setPreviewResult(null);
    setImportResult(null);
  };

  const schema = SCHEMA[dataType];
  const allTargetFields = [...schema.required, ...schema.optional];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("migrate.pageTitle")}</h1>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6 p-1 bg-surface-dark rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("import")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "import"
              ? "bg-brand-500/10 text-brand-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <FolderInput size={15} />
          {t("migrate.tabImport")}
        </button>
        <button
          onClick={() => setActiveTab("backup")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "backup"
              ? "bg-brand-500/10 text-brand-500"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          <HardDrive size={15} />
          {t("migrate.tabBackup")}
        </button>
      </div>

      {/* Backup tab */}
      {activeTab === "backup" && <BackupClient />}

      {/* Import tab */}
      {activeTab === "import" && <>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: t("migrate.step1") },
          { n: 2, label: t("migrate.step2") },
          { n: 3, label: t("migrate.step3") },
          { n: 4, label: t("migrate.step4") },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && <ArrowRight size={14} className="text-gray-600" />}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              step === s.n ? "bg-brand-500 text-black" :
              step > s.n ? "bg-green-500/10 text-green-400" :
              "bg-surface-dark text-gray-500"
            }`}>
              {step > s.n ? <CheckCircle2 size={12} /> : <span>{s.n}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-default)" }}>
            <Database size={18} /> {t("migrate.selectType")}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {(["assets", "assignments", "maintenance", "bookings"] as DataType[]).map((dt) => (
              <button
                key={dt}
                onClick={() => setDataType(dt)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition border ${
                  dataType === dt
                    ? "border-brand-500 bg-brand-500/10 text-brand-500"
                    : "border-border text-gray-400 hover:border-gray-600"
                }`}
              >
                {t(`migrate.type_${dt}`)}
              </button>
            ))}
          </div>

          <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-default)" }}>
            <FileJson size={18} /> {t("migrate.uploadFile")}
          </h2>
          <p className="text-xs text-gray-500 mb-4">{t("migrate.uploadHint")}</p>

          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-brand-500 transition">
            <Upload size={32} className="text-gray-500 mb-2" />
            <span className="text-sm text-gray-400">{t("migrate.dropFile")}</span>
            <span className="text-xs text-gray-600 mt-1">JSON / CSV</span>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          {/* SQL Export Help */}
          <div className="mt-6 p-4 bg-surface-dark rounded-lg">
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-muted)" }}>{t("migrate.sqlHelp")}</h3>
            <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre">{`-- SQL Server (C# app)
SELECT
  AssetCode as code,
  AssetName as name,
  Brand as brand,
  Model as model,
  SerialNo as serialNumber,
  Category as category,
  Status as status,
  PurchaseDate as purchaseDate,
  Price as purchasePrice,
  LifeYears as expectedLife,
  WarrantyDate as warrantyEnd,
  Location as location,
  Remark as notes
FROM Equipment
FOR JSON PATH`}</pre>
          </div>
        </div>
      )}

      {/* ── Step 2: Field Mapping ── */}
      {step === 2 && (
        <div className="card">
          <h2 className="font-semibold mb-2" style={{ color: "var(--text-default)" }}>{t("migrate.mapFields")}</h2>
          <p className="text-xs text-gray-500 mb-4">
            {t("migrate.foundRows", rawData.length)} • {t("migrate.foundFields", sourceFields.length)}
          </p>

          <div className="space-y-2 mb-6">
            {allTargetFields.map((target) => {
              const isRequired = schema.required.includes(target);
              return (
                <div key={target} className="flex items-center gap-3">
                  <div className="w-40 text-right">
                    <span className={`text-sm ${isRequired ? "text-brand-500 font-semibold" : "text-gray-400"}`}>
                      {target}
                      {isRequired && <span className="text-red-400 ml-1">*</span>}
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-gray-600" />
                  <select
                    value={fieldMap[target] || ""}
                    onChange={(e) => setFieldMap((prev) => ({ ...prev, [target]: e.target.value }))}
                    className="input w-auto min-w-[200px]"
                  >
                    <option value="">— {t("migrate.skip")} —</option>
                    {sourceFields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 mb-6 p-3 bg-surface-dark rounded-lg">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="rounded"
              />
              {t("migrate.skipDuplicates")}
            </label>
          </div>

          {/* Sample data */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">{t("migrate.sampleData")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 text-gray-500">#</th>
                    {sourceFields.slice(0, 8).map((f) => (
                      <th key={f} className="text-left py-1 px-2 text-gray-500">{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="py-1 px-2 text-gray-600">{i + 1}</td>
                      {sourceFields.slice(0, 8).map((f) => (
                        <td key={f} className="py-1 px-2 text-gray-400 max-w-[150px] truncate">{String(row[f] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-ghost">{t("migrate.back")}</button>
            <button
              onClick={handlePreview}
              disabled={loading || schema.required.some((r) => !fieldMap[r])}
              className="btn-primary flex items-center gap-2"
            >
              <Eye size={16} />
              {loading ? t("migrate.processing") : t("migrate.preview")}
            </button>
          </div>

          {schema.required.some((r) => !fieldMap[r]) && (
            <p className="text-xs text-red-400 mt-2">
              {t("migrate.requiredMissing")}: {schema.required.filter((r) => !fieldMap[r]).join(", ")}
            </p>
          )}
        </div>
      )}

      {/* ── Step 3: Preview ── */}
      {step === 3 && previewResult && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-default)" }}>
            <Eye size={18} /> {t("migrate.previewTitle")}
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface-dark rounded-lg p-3">
              <p className="text-xs text-gray-500">{t("migrate.totalRows")}</p>
              <p className="text-xl font-bold text-brand-500">{previewResult.total}</p>
            </div>
            <div className="bg-surface-dark rounded-lg p-3">
              <p className="text-xs text-gray-500">{t("migrate.willImport")}</p>
              <p className="text-xl font-bold text-green-500">{previewResult.imported}</p>
            </div>
            <div className="bg-surface-dark rounded-lg p-3">
              <p className="text-xs text-gray-500">{t("migrate.willSkip")}</p>
              <p className="text-xl font-bold text-amber-500">{previewResult.skipped}</p>
            </div>
          </div>

          {previewResult.errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-500/10 rounded-lg">
              <p className="text-sm text-red-400 font-semibold mb-2">{t("migrate.errors")} ({previewResult.errors.length})</p>
              {previewResult.errors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-red-300">Row {e.row}: {e.message}</p>
              ))}
            </div>
          )}

          {previewResult.preview && previewResult.preview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">{t("migrate.mappedPreview")}</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {previewResult.preview.map((p: any, i: number) => (
                  <div key={i} className="bg-surface-dark rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Row {p.row}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(p.mapped).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-500">{key}:</span>
                          <span className="font-mono" style={{ color: "var(--text-muted)" }}>{String(val ?? "-")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-ghost">{t("migrate.back")}</button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Play size={16} />
              {loading ? t("migrate.importing") : t("migrate.startImport")}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Result ── */}
      {step === 4 && importResult && (
        <div className="card">
          <div className="text-center py-6">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-default)" }}>{t("migrate.complete")}</h2>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface-dark rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{t("migrate.totalRows")}</p>
              <p className="text-2xl font-bold text-brand-500">{importResult.total}</p>
            </div>
            <div className="bg-surface-dark rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{t("migrate.imported")}</p>
              <p className="text-2xl font-bold text-green-500">{importResult.imported}</p>
            </div>
            <div className="bg-surface-dark rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{t("migrate.skipped")}</p>
              <p className="text-2xl font-bold text-amber-500">{importResult.skipped}</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-6 p-3 bg-red-500/10 rounded-lg max-h-[300px] overflow-y-auto">
              <p className="text-sm text-red-400 font-semibold mb-2">{t("migrate.errors")} ({importResult.errors.length})</p>
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-300">Row {e.row}: {e.message}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-primary">{t("migrate.importMore")}</button>
            <a href="/assets" className="btn-ghost">{t("migrate.viewAssets")}</a>
          </div>
        </div>
      )}

      </>}
    </div>
  );
}

// ── CSV Parser ──

function parseCSV(text: string): Record<string, any>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim() ?? "";
    });
    return obj;
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
