// Path: src/components/PageActions.tsx
"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { Plus, RotateCcw, type LucideIcon } from "lucide-react";
import { AddMaintenanceForm } from "@/components/forms/AddMaintenanceForm";
import { AddAssignmentForm } from "@/components/forms/AddAssignmentForm";
import { ReturnAssetForm } from "@/components/forms/ReturnAssetForm";
import { AddBookingForm } from "@/components/forms/AddBookingForm";
import { useRole } from "@/lib/useRole";
import { useI18n } from "@/lib/i18n";

interface Asset {
  id: string;
  code: string;
  name: string;
  status: string;
  category: string;
}

interface CurrentAssignment {
  id: string;
  assetCode: string;
  assetName: string;
  personName: string;
}

// ── Generic button-opens-modal pattern ──
// One place to style/tune every "open form" button on list pages.

type Variant = "primary" | "ghost";

interface FormProps {
  open: boolean;
  onClose: () => void;
}

interface ActionButtonProps<P extends FormProps> {
  label: string;
  icon?: LucideIcon;
  variant?: Variant;
  FormComponent: ComponentType<P>;
  formProps: Omit<P, "open" | "onClose">;
  disabled?: boolean;
  extraButton?: ReactNode;
}

function ActionButton<P extends FormProps>({
  label, icon: Icon = Plus, variant = "primary", FormComponent, formProps, disabled,
}: ActionButtonProps<P>) {
  const [open, setOpen] = useState(false);
  const klass = variant === "primary" ? "btn-primary" : "btn-ghost";
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`${klass} text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Icon size={14} />
        <span className="truncate">{label}</span>
      </button>
      <FormComponent
        {...(formProps as unknown as P)}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Page-level groupings (thin wrappers so callers stay concise) ──

export function MaintenanceActions({ assets }: { assets: Asset[] }) {
  const { canCreate } = useRole();
  const { t } = useI18n();
  if (!canCreate) return null;
  return (
    <ActionButton
      label={t("forms.addMaint")}
      FormComponent={AddMaintenanceForm}
      formProps={{ assets }}
    />
  );
}

export function AssignmentActions({
  assets,
  currentAssignments,
}: {
  assets: Asset[];
  currentAssignments: CurrentAssignment[];
}) {
  const { canCreate } = useRole();
  const { t } = useI18n();
  if (!canCreate) return null;
  return (
    <>
      <ActionButton
        label={t("forms.assign")}
        FormComponent={AddAssignmentForm}
        formProps={{ assets }}
      />
      {currentAssignments.length > 0 && (
        <ActionButton
          label={t("forms.returnAsset")}
          icon={RotateCcw}
          variant="ghost"
          FormComponent={ReturnAssetForm}
          formProps={{ assignments: currentAssignments }}
        />
      )}
    </>
  );
}

export function BookingActions({ assets }: { assets: Asset[] }) {
  const { canCreate } = useRole();
  const { t } = useI18n();
  if (!canCreate) return null;
  return (
    <ActionButton
      label={t("forms.bookAsset")}
      FormComponent={AddBookingForm}
      formProps={{ assets }}
    />
  );
}
