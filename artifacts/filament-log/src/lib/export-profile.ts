import { FILAMENT_MAP, PROCESS_MAP } from "./import-profile";
import { format } from "date-fns";

interface PrintSetting {
  name: string;
  value: string;
  unit?: string;
  category?: string;
  subcategory?: string;
}

interface FilamentInfo {
  name: string;
  brand?: string;
  type?: string;
}

export type ExportFormat = "filament" | "process" | "combined";

function buildInverseMap(
  map: typeof FILAMENT_MAP
): Map<string, { orcaKey: string; boolean?: true; stripPercent?: boolean }> {
  const inv = new Map<string, { orcaKey: string; boolean?: true; stripPercent?: boolean }>();
  for (const [orcaKey, meta] of Object.entries(map)) {
    const lookup = `${meta.name}|${meta.category}|${meta.subcategory ?? ""}`;
    inv.set(lookup, { orcaKey, boolean: meta.boolean, stripPercent: meta.stripPercent });
  }
  return inv;
}

const FILAMENT_INV = buildInverseMap(FILAMENT_MAP);
const PROCESS_INV = buildInverseMap(PROCESS_MAP);

function settingsToOrcaKeys(
  settings: PrintSetting[],
  inv: Map<string, { orcaKey: string; boolean?: true; stripPercent?: boolean }>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of settings) {
    const lookup = `${s.name}|${s.category ?? ""}|${s.subcategory ?? ""}`;
    const meta = inv.get(lookup);
    if (!meta) continue;

    if (meta.boolean) {
      const truthy = s.value === "1" || s.value === "true";
      out[meta.orcaKey] = truthy ? "1" : "0";
    } else {
      out[meta.orcaKey] = [s.value];
    }
  }
  return out;
}

function profileName(filament: FilamentInfo, date: string | Date, suffix?: string): string {
  const dateStr = format(new Date(date), "yyyy-MM-dd");
  const base = filament.brand ? `${filament.brand} ${filament.name}` : filament.name;
  return suffix ? `${base} (${suffix}) ${dateStr}` : `${base} ${dateStr}`;
}

export function buildExportJson(
  settings: PrintSetting[],
  format_: ExportFormat,
  filament: FilamentInfo,
  date: string | Date
): unknown {
  if (format_ === "filament") {
    const keys = settingsToOrcaKeys(settings, FILAMENT_INV);
    return {
      type: "filament",
      name: profileName(filament, date),
      from: "User",
      instantiation: "true",
      ...keys,
    };
  }

  if (format_ === "process") {
    const keys = settingsToOrcaKeys(settings, PROCESS_INV);
    return {
      type: "process",
      name: profileName(filament, date),
      from: "User",
      ...keys,
    };
  }

  const filamentKeys = settingsToOrcaKeys(settings, FILAMENT_INV);
  const processKeys = settingsToOrcaKeys(settings, PROCESS_INV);
  return {
    type: "combined",
    name: profileName(filament, date),
    from: "flogg",
    filament_type: filament.type ?? "",
    ...filamentKeys,
    ...processKeys,
  };
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFilename(filament: FilamentInfo, date: string | Date, format_: ExportFormat): string {
  const dateStr = format(new Date(date), "yyyy-MM-dd");
  const base = (filament.brand ? `${filament.brand}_${filament.name}` : filament.name)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
  return `${base}_${format_}_${dateStr}.json`;
}
