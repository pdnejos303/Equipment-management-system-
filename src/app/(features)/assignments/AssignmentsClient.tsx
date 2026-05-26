// Path: src/app/(features)/assignments/AssignmentsClient.tsx
"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { AssignmentActions } from "@/components/PageActions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  category: string;
}

interface Assignment {
  id: string;
  personName: string;
  department: string | null;
  dateOut: string;
  dateIn: string | null;
  notes: string | null;
  asset: { id: string; code: string; name: string };
}

interface CurrentAssignment {
  id: string;
  assetCode: string;
  assetName: string;
  personName: string;
}

interface AssignmentsData {
  active: Assignment[];
  returned: Assignment[];
  total: number;
  assets: Asset[];
  currentAssignments: CurrentAssignment[];
}

export function AssignmentsClient({ data }: { data: AssignmentsData }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { active, returned, total, assets, currentAssignments } = data;
  const { items: pagedActive, total: activeTotal } = usePagination(active, 15, "page_active");
  const { items: pagedReturned, total: returnedTotal } = usePagination(returned, 15, "page_returned");
  const [activeOpen, setActiveOpen] = useState(true);
  const [returnedOpen, setReturnedOpen] = useState(false);

  return (
    <div className="page-enter">
      <PageHeader
        title={t("assignPage.title")}
        actions={<AssignmentActions assets={assets} currentAssignments={currentAssignments} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-stagger">
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("assignPage.active")}</p>
          <p className="text-2xl font-bold text-green-400">{active.length}</p>
        </div>
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("assignPage.returned")}</p>
          <p className="text-2xl font-bold text-blue-400">{returned.length}</p>
        </div>
        <div className="card stat-card">
          <p className="text-xs text-gray-500 uppercase">{t("assignPage.total")}</p>
          <p className="text-2xl font-bold text-brand-500">{total}</p>
        </div>
      </div>

      {active.length > 0 && (
        <div className={`mb-6 animate-fade-in-up border border-border rounded-xl bg-surface transition-all duration-200 ${activeOpen ? "p-5" : "px-4 py-3"}`}>
          <button
            onClick={() => setActiveOpen(o => !o)}
            className="w-full flex items-center gap-2 text-left hover:opacity-80 transition-opacity mb-1"
          >
            {activeOpen
              ? <ChevronDown size={15} className="text-green-500 flex-shrink-0" />
              : <ChevronRight size={15} className="text-green-500 flex-shrink-0" />
            }
            <h2 className="font-semibold text-green-400">{t("assignPage.activeTitle")}</h2>
            <span className="text-xs text-gray-600 ml-1">({active.length})</span>
          </button>
          {activeOpen && <div className="table-container mt-3">
            <table className="table table-row-hover animate-table-rows">
              <thead>
                <tr>
                  <th>{t("assignPage.code")}</th>
                  <th>{t("assignPage.equipment")}</th>
                  <th>{t("assignPage.person")}</th>
                  <th>{t("assignPage.dept")}</th>
                  <th>{t("assignPage.dateOut")}</th>
                  <th>{t("assignPage.notes")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagedActive.map((a) => (
                  <tr key={a.id} className="cursor-pointer" onClick={() => router.push(`/assets/${a.asset.id}?from=${encodeURIComponent("/assignments")}`)} onMouseEnter={() => router.prefetch(`/assets/${a.asset.id}`)}>
                    <td><span className="font-mono text-brand-500">{a.asset.code}</span></td>
                    <td style={{ color: "var(--text-default)" }}>{a.asset.name}</td>
                    <td className="font-semibold">{a.personName}</td>
                    <td>{a.department || "-"}</td>
                    <td>{formatDate(a.dateOut, locale)}</td>
                    <td className="text-xs max-w-[180px] truncate">{a.notes || "-"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/calendar?date=${new Date(a.dateOut).toISOString().slice(0, 10)}`}
                        title={t("common.viewInCalendar")}
                        className="btn-icon"
                      >
                        <Calendar size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination total={activeTotal} pageSize={15} paramKey="page_active" />
          </div>}
        </div>
      )}

      {returned.length > 0 && (
        <div className={`animate-fade-in-up border border-border rounded-xl bg-surface transition-all duration-200 ${returnedOpen ? "p-5" : "px-4 py-3"}`} style={{ animationDelay: "0.1s" }}>
          <button
            onClick={() => setReturnedOpen(o => !o)}
            className="w-full flex items-center gap-2 text-left hover:opacity-80 transition-opacity mb-1"
          >
            {returnedOpen
              ? <ChevronDown size={15} className="text-gray-500 flex-shrink-0" />
              : <ChevronRight size={15} className="text-gray-500 flex-shrink-0" />
            }
            <h2 className="font-semibold text-gray-400">{t("assignPage.returnHistory")}</h2>
            <span className="text-xs text-gray-600 ml-1">({returned.length})</span>
          </button>
          {returnedOpen && (
            <div className="table-container mt-3">
              <table className="table table-row-hover animate-table-rows">
                <thead>
                  <tr>
                    <th>{t("assignPage.code")}</th>
                    <th>{t("assignPage.equipment")}</th>
                    <th>{t("assignPage.person")}</th>
                    <th>{t("assignPage.dateOut")}</th>
                    <th>{t("assignPage.dateIn")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pagedReturned.map((a) => (
                    <tr key={a.id} className="cursor-pointer" onClick={() => router.push(`/assets/${a.asset.id}?from=${encodeURIComponent("/assignments")}`)} onMouseEnter={() => router.prefetch(`/assets/${a.asset.id}`)}>
                      <td className="font-mono text-brand-500">{a.asset.code}</td>
                      <td>{a.asset.name}</td>
                      <td>{a.personName}</td>
                      <td>{formatDate(a.dateOut, locale)}</td>
                      <td>{formatDate(a.dateIn, locale)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/calendar?date=${new Date(a.dateOut).toISOString().slice(0, 10)}`}
                          title={t("common.viewInCalendar")}
                          className="btn-icon"
                        >
                          <Calendar size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination total={returnedTotal} pageSize={15} paramKey="page_returned" />
            </div>
          )}
        </div>
      )}

      {total === 0 && (
        <p className="text-gray-500 text-center py-12">{t("assignPage.noHistory")}</p>
      )}
    </div>
  );
}
