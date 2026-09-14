import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateLog,
  useUpdateLog,
  useGetLog,
  useListLogs,
  useListFilaments,
  useListPrinters,
  getGetLogQueryKey,
  getListLogsQueryKey,
  getGetLogsSummaryQueryKey,
  getListFilamentsQueryKey,
} from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ArrowRight, Plus, Minus, Package, Pencil, Check, Printer, Upload, CheckCircle2, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FilamentDialog } from "@/components/filament-dialog";
import { PrinterDialog } from "@/components/printer-dialog";
import { CameraCapture } from "@/components/camera-capture";
import { SettingsFormAccordion, settingLookupKey } from "@/components/settings-accordion";
import { parseProfileJson } from "@/lib/import-profile";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_SETTINGS = [
  // ── Temperature > Nozzle ──────────────────────────────────────────────────
  { name: "Nozzle Temperature", value: "", unit: "°C", category: "Temperature", subcategory: "Nozzle", visible: false },
  { name: "Nozzle Temp (First Layer)", value: "", unit: "°C", category: "Temperature", subcategory: "Nozzle", visible: false },
  { name: "Nozzle Temp Range Low", value: "", unit: "°C", category: "Temperature", subcategory: "Nozzle", visible: false },
  { name: "Nozzle Temp Range High", value: "", unit: "°C", category: "Temperature", subcategory: "Nozzle", visible: false },
  // ── Temperature > Bed ─────────────────────────────────────────────────────
  { name: "Cool Plate Temp", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "Cool Plate Temp (First Layer)", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "Engineering Plate Temp", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "Engineering Plate Temp (First Layer)", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "High Temp Plate", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "High Temp Plate (First Layer)", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "Textured Plate Temp", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "Textured Plate Temp (First Layer)", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  // ── Temperature > Chamber ─────────────────────────────────────────────────
  { name: "Chamber Temperature", value: "", unit: "°C", category: "Temperature", subcategory: "Chamber", visible: false },
  { name: "Vitrification Temperature", value: "", unit: "°C", category: "Temperature", subcategory: "Chamber", visible: false },
  // ── Temperature > Bed (additional OrcaSlicer) ─────────────────────────────
  { name: "Textured Cool Plate Temp", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  { name: "Textured Cool Plate Temp (First Layer)", value: "", unit: "°C", category: "Temperature", subcategory: "Bed", visible: false },
  // ── Temperature > Nozzle (additional OrcaSlicer) ──────────────────────────
  { name: "Idle Temperature", value: "", unit: "°C", category: "Temperature", subcategory: "Nozzle", visible: false },

  // ── Cooling > Fan ─────────────────────────────────────────────────────────
  { name: "Disable Fan (First X Layers)", value: "", unit: "layers", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Fan Min Speed", value: "", unit: "%", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Fan Max Speed", value: "", unit: "%", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Cooling Layer Time", value: "", unit: "s", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Slow Down Layer Time", value: "", unit: "s", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Slow Down Min Speed", value: "", unit: "mm/s", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Slow Down for Layer Cooling", value: "", unit: "", category: "Cooling", subcategory: "Fan", visible: false, type: "boolean" as const },
  { name: "Pre-start Fan Time", value: "", unit: "s", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Auxiliary Fan Speed", value: "", unit: "%", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Reduce Fan Stop/Start Freq", value: "", unit: "", category: "Cooling", subcategory: "Fan", visible: false, type: "boolean" as const },
  // ── Cooling > Overhang ────────────────────────────────────────────────────
  { name: "Overhang Fan Threshold", value: "", unit: "%", category: "Cooling", subcategory: "Overhang", visible: false },
  { name: "Overhang Fan Speed", value: "", unit: "%", category: "Cooling", subcategory: "Overhang", visible: false },
  { name: "Enable Overhang Bridge Fan", value: "", unit: "", category: "Cooling", subcategory: "Overhang", visible: false, type: "boolean" as const },
  // ── Cooling > Fan (additional) ────────────────────────────────────────────
  { name: "Don't Slow Down Outer Wall", value: "", unit: "", category: "Cooling", subcategory: "Fan", visible: false, type: "boolean" as const },
  { name: "Full Fan Speed Layer", value: "", unit: "layer", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Cooling Moves", value: "", unit: "", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Cooling Initial Speed", value: "", unit: "mm/s", category: "Cooling", subcategory: "Fan", visible: false },
  { name: "Cooling Final Speed", value: "", unit: "mm/s", category: "Cooling", subcategory: "Fan", visible: false },
  // ── Cooling > Exhaust ─────────────────────────────────────────────────────
  { name: "Exhaust Fan Speed (During Print)", value: "", unit: "%", category: "Cooling", subcategory: "Exhaust", visible: false },
  { name: "Exhaust Fan Speed (After Print)", value: "", unit: "%", category: "Cooling", subcategory: "Exhaust", visible: false },
  { name: "Activate Air Filtration", value: "", unit: "", category: "Cooling", subcategory: "Exhaust", visible: false, type: "boolean" as const },

  // ── Retraction ────────────────────────────────────────────────────────────
  { name: "Retraction Length", value: "", unit: "mm", category: "Retraction", subcategory: "", visible: false },
  { name: "Retraction Speed", value: "", unit: "mm/s", category: "Retraction", subcategory: "", visible: false },
  { name: "Deretraction Speed", value: "", unit: "mm/s", category: "Retraction", subcategory: "", visible: false },
  { name: "Z Hop", value: "", unit: "mm", category: "Retraction", subcategory: "", visible: false },
  { name: "Z Hop Type", value: "", unit: "", category: "Retraction", subcategory: "", visible: false },
  { name: "Retraction Minimum Travel", value: "", unit: "mm", category: "Retraction", subcategory: "", visible: false },
  { name: "Retract Restart Extra", value: "", unit: "mm", category: "Retraction", subcategory: "", visible: false },
  // ── Retraction > Wipe ─────────────────────────────────────────────────────
  { name: "Wipe", value: "", unit: "", category: "Retraction", subcategory: "Wipe", visible: false, type: "boolean" as const },
  { name: "Wipe Distance", value: "", unit: "mm", category: "Retraction", subcategory: "Wipe", visible: false },
  { name: "Retract Before Wipe", value: "", unit: "%", category: "Retraction", subcategory: "Wipe", visible: false },
  // ── Retraction > Loading ──────────────────────────────────────────────────
  { name: "Loading Speed", value: "", unit: "mm/s", category: "Retraction", subcategory: "Loading", visible: false },
  { name: "Loading Speed Start", value: "", unit: "mm/s", category: "Retraction", subcategory: "Loading", visible: false },
  { name: "Unloading Speed", value: "", unit: "mm/s", category: "Retraction", subcategory: "Loading", visible: false },
  { name: "Unloading Speed Start", value: "", unit: "mm/s", category: "Retraction", subcategory: "Loading", visible: false },
  { name: "Minimal Purge on Wipe Tower", value: "", unit: "mm³", category: "Retraction", subcategory: "Loading", visible: false },

  // ── Filament ──────────────────────────────────────────────────────────────
  { name: "Flow Ratio", value: "", unit: "", category: "Filament", subcategory: "", visible: false },
  { name: "Max Volumetric Speed", value: "", unit: "mm³/s", category: "Filament", subcategory: "", visible: false },
  { name: "Scarf Seam Type", value: "", unit: "", category: "Filament", subcategory: "", visible: false },
  { name: "Pressure Advance", value: "", unit: "", category: "Filament", subcategory: "", visible: false },
  { name: "Enable Pressure Advance", value: "", unit: "", category: "Filament", subcategory: "", visible: false, type: "boolean" as const },
  { name: "Density", value: "", unit: "g/cm³", category: "Filament", subcategory: "", visible: false },
  { name: "Diameter", value: "", unit: "mm", category: "Filament", subcategory: "", visible: false },
  { name: "Cost", value: "", unit: "$/kg", category: "Filament", subcategory: "", visible: false },
  { name: "Filament Type", value: "", unit: "", category: "Filament", subcategory: "", visible: false },
  { name: "Vendor", value: "", unit: "", category: "Filament", subcategory: "", visible: false },

  // ── Quality > Layers ──────────────────────────────────────────────────────
  { name: "Layer Height", value: "", unit: "mm", category: "Quality", subcategory: "Layers", visible: false },
  { name: "First Layer Height", value: "", unit: "mm", category: "Quality", subcategory: "Layers", visible: false },
  { name: "Elephant Foot Compensation", value: "", unit: "mm", category: "Quality", subcategory: "Layers", visible: false },
  { name: "XY Size Compensation", value: "", unit: "mm", category: "Quality", subcategory: "Layers", visible: false },
  { name: "Arc Fitting", value: "", unit: "", category: "Quality", subcategory: "Layers", visible: false, type: "boolean" as const },
  // ── Quality > Walls ───────────────────────────────────────────────────────
  { name: "Wall Loops", value: "", unit: "", category: "Quality", subcategory: "Walls", visible: false },
  { name: "Wall Generator", value: "", unit: "", category: "Quality", subcategory: "Walls", visible: false },
  { name: "Detect Thin Wall", value: "", unit: "", category: "Quality", subcategory: "Walls", visible: false, type: "boolean" as const },
  { name: "Reduce Crossing Wall", value: "", unit: "", category: "Quality", subcategory: "Walls", visible: false, type: "boolean" as const },
  { name: "Max Travel Detour Distance", value: "", unit: "mm", category: "Quality", subcategory: "Walls", visible: false },
  // ── Quality > Top/Bottom ──────────────────────────────────────────────────
  { name: "Top Shell Layers", value: "", unit: "layers", category: "Quality", subcategory: "Top/Bottom", visible: false },
  { name: "Bottom Shell Layers", value: "", unit: "layers", category: "Quality", subcategory: "Top/Bottom", visible: false },
  { name: "Top Surface Pattern", value: "", unit: "", category: "Quality", subcategory: "Top/Bottom", visible: false },
  { name: "Bottom Surface Pattern", value: "", unit: "", category: "Quality", subcategory: "Top/Bottom", visible: false },
  { name: "Internal Solid Infill Pattern", value: "", unit: "", category: "Quality", subcategory: "Top/Bottom", visible: false },
  // ── Quality > Seam ────────────────────────────────────────────────────────
  { name: "Seam Position", value: "", unit: "", category: "Quality", subcategory: "Seam", visible: false },

  // ── Infill ────────────────────────────────────────────────────────────────
  { name: "Infill Density", value: "", unit: "%", category: "Infill", subcategory: "", visible: false },
  { name: "Infill Pattern", value: "", unit: "", category: "Infill", subcategory: "", visible: false },
  { name: "Infill/Wall Overlap", value: "", unit: "%", category: "Infill", subcategory: "", visible: false },

  // ── Speed > Print ─────────────────────────────────────────────────────────
  { name: "First Layer Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "First Layer Infill Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Outer Wall Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Inner Wall Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Infill Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Internal Solid Infill Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Top Surface Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Bridge Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Gap Fill Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Small Perimeter Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Print", visible: false },
  { name: "Small Perimeter Threshold", value: "", unit: "mm", category: "Speed", subcategory: "Print", visible: false },
  { name: "Vertical Shell Speed", value: "", unit: "%", category: "Speed", subcategory: "Print", visible: false },
  // ── Speed > Support ───────────────────────────────────────────────────────
  { name: "Support Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Support", visible: false },
  { name: "Support Interface Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Support", visible: false },
  // ── Speed > Travel ────────────────────────────────────────────────────────
  { name: "Travel Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Travel", visible: false },
  { name: "Z Travel Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Travel", visible: false },
  // ── Speed > Overhang ──────────────────────────────────────────────────────
  { name: "Enable Overhang Speed", value: "", unit: "", category: "Speed", subcategory: "Overhang", visible: false, type: "boolean" as const },
  { name: "Overhang Speed (25%)", value: "", unit: "mm/s", category: "Speed", subcategory: "Overhang", visible: false },
  { name: "Overhang Speed (50%)", value: "", unit: "mm/s", category: "Speed", subcategory: "Overhang", visible: false },
  { name: "Overhang Speed (75%)", value: "", unit: "mm/s", category: "Speed", subcategory: "Overhang", visible: false },
  { name: "Overhang Speed (100%)", value: "", unit: "mm/s", category: "Speed", subcategory: "Overhang", visible: false },
  { name: "Bridge/Overhang Speed", value: "", unit: "mm/s", category: "Speed", subcategory: "Overhang", visible: false },
  { name: "Bridge Flow", value: "", unit: "", category: "Speed", subcategory: "Overhang", visible: false },

  // ── Acceleration ──────────────────────────────────────────────────────────
  { name: "Default", value: "", unit: "mm/s²", category: "Acceleration", subcategory: "", visible: false },
  { name: "Outer Wall", value: "", unit: "mm/s²", category: "Acceleration", subcategory: "", visible: false },
  { name: "Inner Wall", value: "", unit: "mm/s²", category: "Acceleration", subcategory: "", visible: false },
  { name: "Top Surface", value: "", unit: "mm/s²", category: "Acceleration", subcategory: "", visible: false },
  { name: "Travel", value: "", unit: "mm/s²", category: "Acceleration", subcategory: "", visible: false },
  { name: "First Layer", value: "", unit: "mm/s²", category: "Acceleration", subcategory: "", visible: false },
  { name: "First Layer Travel", value: "", unit: "mm/s²", category: "Acceleration", subcategory: "", visible: false },
  { name: "Infill", value: "", unit: "%", category: "Acceleration", subcategory: "", visible: false },

  // ── Line Width ────────────────────────────────────────────────────────────
  { name: "Default", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Outer Wall", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Inner Wall", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Top Surface", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "First Layer", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Internal Solid Infill", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Infill", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Support", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Skin Infill", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
  { name: "Skeleton Infill", value: "", unit: "mm", category: "Line Width", subcategory: "", visible: false },
];

const settingSchema = z.object({
  name: z.string().min(1, "Name required"),
  value: z.string(),
  unit: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  visible: z.boolean().optional(),
  type: z.enum(["string", "number", "boolean"]).optional(),
});

const formSchema = z.object({
  filamentId: z.number({ required_error: "Select a filament" }).int().positive("Select a filament"),
  printerId: z.number().int().positive().optional(),
  notes: z.string().optional(),
  notesAfter: z.string().optional(),
  imageUrl: z.string().optional(),
  otherImages: z.array(z.object({
    url: z.string(),
    label: z.string().optional(),
  })).optional(),
  settings: z.array(settingSchema),
});

type FormValues = z.infer<typeof formSchema>;

/** Shape of a setting as stored in the jsonb column (includes fields not in the codegen'd API type). */
interface StoredSetting {
  name: string;
  value: string;
  unit?: string;
  category?: string;
  subcategory?: string;
  visible?: boolean;
  type?: "string" | "number" | "boolean";
}

interface SettingDiff {
  name: string;
  subcategory?: string;
  category?: string;
  oldValue?: string;
  newValue?: string;
  unit?: string;
  type: "changed" | "added" | "removed";
}

function computeSettingsDiff(
  baseSettings: Array<{ name: string; value: string; unit?: string; category?: string; subcategory?: string }>,
  newSettings: Array<{ name: string; value: string; unit?: string; category?: string; subcategory?: string }>
): SettingDiff[] {
  // Use compound key so duplicate names across subcategories (e.g. "Outer wall") don't collide
  const key = (s: { name: string; category?: string; subcategory?: string }) =>
    settingLookupKey(s.category ?? "", s.subcategory ?? "", s.name);

  const baseMap = new Map(baseSettings.map((s) => [key(s), s]));
  const newMap = new Map(newSettings.map((s) => [key(s), s]));
  const diffs: SettingDiff[] = [];

  for (const [k, base] of baseMap) {
    const cur = newMap.get(k);
    if (!cur) {
      diffs.push({ name: base.name, oldValue: base.value, unit: base.unit, category: base.category, subcategory: base.subcategory, type: "removed" });
    } else if (cur.value !== base.value) {
      diffs.push({ name: base.name, oldValue: base.value, newValue: cur.value, unit: cur.unit, category: cur.category, subcategory: cur.subcategory, type: "changed" });
    }
  }

  for (const [k, cur] of newMap) {
    if (!baseMap.has(k)) {
      diffs.push({ name: cur.name, newValue: cur.value, unit: cur.unit, category: cur.category, subcategory: cur.subcategory, type: "added" });
    }
  }

  return diffs;
}

interface LogFormProps {
  id?: string;
  mode: "create" | "edit";
  copyFromId?: string;
  defaultFilamentId?: string;
  defaultPrinterId?: string;
}

export default function LogForm({ id, mode, copyFromId, defaultFilamentId, defaultPrinterId }: LogFormProps) {
  const numericId = id ? parseInt(id, 10) : undefined;
  const copyFromNumericId = copyFromId ? parseInt(copyFromId, 10) : undefined;
  const defaultFilamentNumericId = defaultFilamentId ? parseInt(defaultFilamentId, 10) : undefined;
  const defaultPrinterNumericId = defaultPrinterId ? parseInt(defaultPrinterId, 10) : undefined;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const [baseSnapshot, setBaseSnapshot] = useState<Map<string, string> | undefined>(undefined);
  const [newFilamentOpen, setNewFilamentOpen] = useState(false);
  const [newPrinterOpen, setNewPrinterOpen] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(
    mode === "create" && !copyFromNumericId
  );
  const [settingsSearch, setSettingsSearch] = useState("");

  type ImportPreview = {
    profileName?: string;
    type: "filament" | "process";
    rows: Array<{ category: string; subcategory: string; name: string; value: string; matched: boolean }>;
    applyValues: () => void;
  };
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);

  const { data: filaments } = useListFilaments();
  const { data: printers } = useListPrinters();

  const { data: existingLog, isLoading: loadingLog } = useGetLog(
    numericId ?? 0,
    {
      query: {
        enabled: mode === "edit" && numericId !== undefined && !isNaN(numericId),
        queryKey: getGetLogQueryKey(numericId ?? 0),
      },
    }
  );

  const { data: copyFromLog, isLoading: loadingCopyFrom } = useGetLog(
    copyFromNumericId ?? 0,
    {
      query: {
        enabled: mode === "create" && copyFromNumericId !== undefined && !isNaN(copyFromNumericId),
        queryKey: getGetLogQueryKey(copyFromNumericId ?? 0),
      },
    }
  );

  // Fetch all logs for the same filament — used in copy-from (create) AND edit mode
  const siblingFilamentId = mode === "edit" ? existingLog?.filamentId : copyFromLog?.filamentId;
  const { data: filamentLogsData } = useListLogs(
    { filamentId: siblingFilamentId, limit: 500 },
    {
      query: {
        enabled: (mode === "create" && !!copyFromLog) || (mode === "edit" && !!existingLog),
        queryKey: getListLogsQueryKey({ filamentId: siblingFilamentId, limit: 500 }),
      },
    }
  );

  // The entry immediately before copyFromLog in chronological order (copy-from flow)
  const prevEntry = useMemo(() => {
    if (!filamentLogsData?.logs || !copyFromLog) return null;
    const sorted = [...filamentLogsData.logs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const idx = sorted.findIndex((l) => l.id === copyFromLog.id);
    return idx > 0 ? sorted[idx - 1] : null;
  }, [filamentLogsData, copyFromLog]);

  // The entry immediately before the entry being edited (edit mode)
  const prevEditEntry = useMemo(() => {
    if (mode !== "edit" || !filamentLogsData?.logs || !existingLog) return null;
    const sorted = [...filamentLogsData.logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const idx = sorted.findIndex((l) => l.id === existingLog.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  }, [filamentLogsData, existingLog, mode]);

  // Diff between prevEntry (A) and copyFromLog (B) — shown as a callout in the new entry form
  const prevToCopyDiff = useMemo(() => {
    if (!prevEntry || !copyFromLog) return [];
    const aSettings = (prevEntry.settings as unknown as StoredSetting[]).filter(
      (s) => s.visible !== false && s.value !== ""
    );
    const bSettings = (copyFromLog.settings as unknown as StoredSetting[]).filter(
      (s) => s.visible !== false && s.value !== ""
    );
    return computeSettingsDiff(aSettings, bSettings);
  }, [prevEntry, copyFromLog]);

  // Set of lookup keys for settings that changed A→B — used to highlight rows in the accordion
  const prevDiffKeys = useMemo(() => {
    if (!prevToCopyDiff.length) return undefined;
    return new Set(
      prevToCopyDiff.map((d) =>
        settingLookupKey(d.category ?? "", d.subcategory ?? "", d.name)
      )
    );
  }, [prevToCopyDiff]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filamentId: defaultFilamentNumericId ?? (undefined as unknown as number),
      printerId: defaultPrinterNumericId,
      notes: "",
      notesAfter: "",
      imageUrl: "",
      otherImages: [],
      settings: DEFAULT_SETTINGS,
    },
  });

  const { fields: otherImageFields, append: appendOtherImage, remove: removeOtherImage } = useFieldArray({
    control: form.control,
    name: "otherImages",
  });

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && existingLog) {
      const settings =
        existingLog.settings.length > 0
          ? (existingLog.settings as unknown as StoredSetting[]).map((s) => ({
              name: s.name,
              value: s.value,
              unit: s.unit ?? "",
              category: s.category ?? "",
              subcategory: s.subcategory ?? "",
              // Preserve stored visibility; for old entries without it, infer from non-empty value
              visible: s.visible ?? (s.value !== "" ? true : false),
              type: s.type,
            }))
          : DEFAULT_SETTINGS;
      form.reset({
        filamentId: existingLog.filamentId,
        printerId: existingLog.printerId ?? undefined,
        notes: existingLog.notes ?? "",
        notesAfter: existingLog.notesAfter ?? "",
        imageUrl: existingLog.imageUrl ?? "",
        otherImages: (existingLog as any).otherImages ?? [],
        settings,
      });
    }
  }, [existingLog, mode, form]);

  // In edit mode, base the "Changed only" snapshot on the PREVIOUS entry (not the current one)
  useEffect(() => {
    if (mode !== "edit" || !prevEditEntry) return;
    const prevSettings = (prevEditEntry.settings as unknown as StoredSetting[]).filter(
      (s) => s.value !== ""
    );
    setBaseSnapshot(new Map(prevSettings.map((s) => [settingLookupKey(s.category ?? "", s.subcategory ?? "", s.name), s.value])));
  }, [prevEditEntry, mode]);

  // Pre-fill from copy source
  useEffect(() => {
    if (mode === "create" && copyFromLog) {
      const settings =
        copyFromLog.settings.length > 0
          ? (copyFromLog.settings as unknown as StoredSetting[]).map((s) => ({
              name: s.name,
              value: s.value,
              unit: s.unit ?? "",
              category: s.category ?? "",
              subcategory: s.subcategory ?? "",
              // Pre-mark rows visible if the prior entry had a value in them
              visible: s.value !== "",
              type: s.type,
            }))
          : DEFAULT_SETTINGS;
      form.reset({
        filamentId: copyFromLog.filamentId,
        printerId: copyFromLog.printerId ?? undefined,
        notes: "",
        notesAfter: "",
        imageUrl: "",
        settings,
      });
      setBaseSnapshot(new Map(settings.map((s) => [settingLookupKey(s.category ?? "", s.subcategory ?? "", s.name), s.value])));
    }
  }, [copyFromLog, mode, form]);

  const createLog = useCreateLog({
    mutation: {
      onSuccess: (newLog) => {
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLogsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFilamentsQueryKey() });
        toast({ title: "Entry added!" });
        setLocation(`/filament/${newLog.filament.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create log", variant: "destructive" });
      },
    },
  });

  const updateLog = useUpdateLog({
    mutation: {
      onSuccess: (updatedLog) => {
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLogsSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFilamentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLogQueryKey(numericId ?? 0) });
        toast({ title: "Log updated!" });
        setLocation(`/filament/${updatedLog.filament.id}`);
      },
      onError: () => {
        toast({ title: "Failed to update log", variant: "destructive" });
      },
    },
  });

  const doSave = (values: FormValues) => {
    const payload = {
      filamentId: values.filamentId,
      printerId: values.printerId ?? undefined,
      date: new Date().toISOString(),
      notes: values.notes || undefined,
      notesAfter: values.notesAfter || undefined,
      imageUrl: values.imageUrl || undefined,
      otherImages: (values.otherImages ?? []).filter((img) => img.url),
      settings: values.settings.map((s) => ({
        name: s.name,
        value: s.value,
        unit: s.unit || undefined,
        category: s.category || undefined,
        subcategory: s.subcategory || undefined,
        visible: s.visible ?? false,
        ...(s.type ? { type: s.type } : {}),
      })),
    };

    if (mode === "create") {
      createLog.mutate({ data: payload });
    } else if (numericId !== undefined) {
      updateLog.mutate({ id: numericId, data: payload });
    }
  };

  const onSubmit = (values: FormValues) => {
    if (baseSnapshot && baseSnapshot.size > 0) {
      setPendingValues(values);
      setConfirmOpen(true);
    } else {
      doSave(values);
    }
  };

  const handleConfirm = () => {
    if (pendingValues) {
      setConfirmOpen(false);
      doSave(pendingValues);
    }
  };

  const isPending = createLog.isPending || updateLog.isPending;

  const importFileRef = useRef<HTMLInputElement>(null);
  const importExpectedType = useRef<"filament" | "process" | null>(null);

  const openImport = (type: "filament" | "process") => {
    importExpectedType.current = type;
    importFileRef.current?.click();
  };

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-imported
    e.target.value = "";

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const result = parseProfileJson(json);
        if (!result.ok) {
          toast({ title: "Import failed", description: result.error, variant: "destructive" });
          return;
        }

        const expected = importExpectedType.current;
        if (expected && result.type !== expected) {
          toast({
            title: "Wrong profile type",
            description: `Expected a ${expected} profile but got a ${result.type} profile. Please pick the correct file.`,
            variant: "destructive",
          });
          return;
        }

        const current = form.getValues("settings");

        // Build preview rows — one per value in the profile, flagged as matched or not
        const rows = result.values.map((v) => ({
          category: v.category,
          subcategory: v.subcategory ?? "",
          name: v.name,
          value: v.value,
          matched: current.some(
            (s) => s.category === v.category &&
                   (s.subcategory ?? "") === (v.subcategory ?? "") &&
                   s.name === v.name
          ),
        }));

        setImportPreview({
          profileName: result.profileName,
          type: result.type,
          rows,
          applyValues: () => {
            let count = 0;
            const updated = current.map((s) => {
              const match = result.values.find(
                (v) => v.category === s.category &&
                       (v.subcategory ?? "") === (s.subcategory ?? "") &&
                       v.name === s.name
              );
              if (match) { count++; return { ...s, value: match.value, visible: true, ...(match.type ? { type: match.type } : {}) }; }
              return s;
            });
            form.setValue("settings", updated, { shouldDirty: true });
            const label = result.type === "filament" ? "Filament" : "Process";
            const pName = result.profileName ? ` "${result.profileName}"` : "";
            toast({
              title: `${label} profile imported`,
              description: `${count} setting${count !== 1 ? "s" : ""} filled in from${pName}.`,
            });
          },
        });
      } catch {
        toast({ title: "Could not parse file", description: "Make sure it is a valid JSON profile.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  }, [form, toast]);

  const settingsDiff = useMemo(() => {
    if (!pendingValues || !baseSnapshot || baseSnapshot.size === 0) return [];
    // Decode compound keys (category|subcategory|name) back to structured objects
    const baseArray = Array.from(baseSnapshot.entries()).map(([compoundKey, value]) => {
      const [category, subcategory, ...nameParts] = compoundKey.split("|");
      return { name: nameParts.join("|"), value, category, subcategory };
    });
    return computeSettingsDiff(baseArray, pendingValues.settings);
  }, [pendingValues, baseSnapshot]);

  if ((mode === "edit" && loadingLog) || (mode === "create" && copyFromNumericId && loadingCopyFrom)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="px-4 py-5 space-y-4">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const changedDiffs = settingsDiff.filter((d) => d.type === "changed");
  const addedDiffs = settingsDiff.filter((d) => d.type === "added");
  const removedDiffs = settingsDiff.filter((d) => d.type === "removed");

  const selectedFilamentId = form.watch("filamentId");
  const selectedFilament = filaments?.find((f) => f.id === selectedFilamentId);
  const filamentError = form.formState.errors.filamentId;
  const filamentHex = selectedFilament?.color && /^#[0-9A-Fa-f]{6}$/.test(selectedFilament.color)
    ? selectedFilament.color : null;

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={mode === "edit" && existingLog?.filament?.id ? `/filament/${existingLog.filament.id}` : "/logs"}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          {/* Filament reference */}
          <div className="flex-1 min-w-0">
            {(defaultFilamentNumericId || mode === "edit") ? (
              /* Pre-selected or editing existing — show info, never a dropdown */
              selectedFilament ? (
                <div className="flex items-center gap-2 min-w-0">
                  {filamentHex ? (
                    <div
                      className="w-4 h-4 rounded-full ring-1 ring-black/10 flex-shrink-0"
                      style={{ backgroundColor: filamentHex }}
                    />
                  ) : (
                    <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate leading-tight">{selectedFilament.name}</p>
                    {(selectedFilament.brand || selectedFilament.type) && (
                      <p className="text-[10px] text-muted-foreground leading-tight truncate">
                        {[selectedFilament.brand, selectedFilament.type].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded-full flex-shrink-0" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              )
            ) : (
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Select
                  value={selectedFilamentId ? String(selectedFilamentId) : ""}
                  onValueChange={(v) => form.setValue("filamentId", parseInt(v, 10), { shouldValidate: true })}
                >
                  <SelectTrigger
                    className={`h-8 text-sm border-dashed flex-1 ${filamentError ? "border-destructive ring-destructive" : ""}`}
                    data-testid="select-filament"
                  >
                    <SelectValue placeholder="Select filament…" />
                  </SelectTrigger>
                  <SelectContent>
                    {filaments && filaments.length > 0 ? (
                      filaments.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                          {(f.brand || f.type) && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              {[f.brand, f.type].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No filaments yet</div>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setNewFilamentOpen(true)}
                  title="New filament"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {filamentError && (
                <p className="text-[10px] text-destructive pl-0.5">{filamentError.message}</p>
              )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            form="log-form"
            size="sm"
            disabled={isPending}
            className="flex-shrink-0"
            data-testid="button-save-log"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving...</>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form id="log-form" onSubmit={form.handleSubmit(onSubmit)} className="px-4 py-5 space-y-5 max-w-2xl mx-auto">

          {/* Previous-entry diff callout — only shown when copying from an existing entry */}
          {mode === "create" && copyFromNumericId && prevToCopyDiff.length > 0 && (() => {
            const changed = prevToCopyDiff.filter((d) => d.type === "changed");
            const added   = prevToCopyDiff.filter((d) => d.type === "added");
            const removed = prevToCopyDiff.filter((d) => d.type === "removed");
            return (
              <div
                className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 space-y-2.5"
                data-testid="callout-prev-diff"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">↩</span>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                    What changed in the last entry
                  </p>
                </div>

                <div className="space-y-1.5">
                  {changed.map((d, i) => (
                    <div key={`c-${i}`} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-medium min-w-0 flex-1 truncate">
                        {d.subcategory ? `${d.subcategory} · ` : ""}{d.name}
                      </span>
                      <span className="font-mono text-muted-foreground line-through flex-shrink-0">
                        {d.oldValue}{d.unit ? ` ${d.unit}` : ""}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-mono font-semibold text-amber-700 dark:text-amber-300 flex-shrink-0">
                        {d.newValue}{d.unit ? ` ${d.unit}` : ""}
                      </span>
                    </div>
                  ))}
                  {added.map((d, i) => (
                    <div key={`a-${i}`} className="flex items-center gap-2 text-xs">
                      <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-muted-foreground flex-1 truncate">
                        {d.subcategory ? `${d.subcategory} · ` : ""}{d.name}
                      </span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                        {d.newValue}{d.unit ? ` ${d.unit}` : ""}
                      </span>
                    </div>
                  ))}
                  {removed.map((d, i) => (
                    <div key={`r-${i}`} className="flex items-center gap-2 text-xs opacity-60">
                      <Minus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground line-through flex-1 truncate">
                        {d.subcategory ? `${d.subcategory} · ` : ""}{d.name}
                      </span>
                      <span className="font-mono text-muted-foreground line-through flex-shrink-0">
                        {d.oldValue}{d.unit ? ` ${d.unit}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Photos — stacked on desktop, print photo on top, other images below */}
          <div className="space-y-5">
            <Card>
              <CardHeader className="px-4 py-3 pb-2">
                <CardTitle className="text-sm font-semibold">Print Photo</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CameraCapture
                          value={field.value}
                          onChange={(url) => field.onChange(url)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 py-3 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Other Images</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => appendOtherImage({ url: "", label: "" })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {otherImageFields.length === 0 && (
                  <p className="text-xs text-muted-foreground/60 text-center py-2">No additional images</p>
                )}
                {otherImageFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[auto_1fr] gap-3 items-start">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0 relative">
                      <FormField
                        control={form.control}
                        name={`otherImages.${index}.url`}
                        render={({ field: urlField }) => (
                          <FormItem className="absolute inset-0">
                            <FormControl className="w-full h-full">
                              <CameraCapture
                                value={urlField.value}
                                onChange={(url) => urlField.onChange(url)}
                                compact
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <FormField
                        control={form.control}
                        name={`otherImages.${index}.label`}
                        render={({ field: labelField }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Label (e.g. Bottom layer)"
                                {...labelField}
                                className="text-xs h-8"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive self-start px-2"
                        onClick={() => removeOtherImage(index)}
                      >
                        <Minus className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Notes — full width, Before/After side by side */}
          <Card>
            <CardHeader className="px-4 py-3 pb-2">
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Before Print</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Prep notes, expectations, filament condition..."
                          rows={4}
                          {...field}
                          data-testid="input-notes"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notesAfter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">After Print</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Results, observations, issues, improvements..."
                          rows={4}
                          {...field}
                          data-testid="input-notes-after"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Printer */}
          <Card className="overflow-hidden">
            <CardContent className="px-4 py-3">
              <FormField
                control={form.control}
                name="printerId"
                render={({ field }) => {
                  const selectedPrinter = printers?.find((p) => p.id === field.value);
                  return (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1.5">
                        <Printer className="w-3.5 h-3.5" /> Printer
                      </FormLabel>
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={field.value ? String(field.value) : "none"}
                          onValueChange={(v) => field.onChange(v === "none" ? undefined : parseInt(v, 10))}
                        >
                          <FormControl>
                            <SelectTrigger className="flex-1 h-9 text-sm" data-testid="select-printer">
                              <SelectValue placeholder="No printer selected" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No printer</SelectItem>
                            {printers?.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                                {p.brand && (
                                  <span className="text-muted-foreground ml-1 text-xs">{p.brand}</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 flex-shrink-0"
                          onClick={() => setNewPrinterOpen(true)}
                          title="New printer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {selectedPrinter && (selectedPrinter.nozzleSize || selectedPrinter.nozzleType) && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 pl-0.5">
                          {[
                            selectedPrinter.nozzleSize && `${selectedPrinter.nozzleSize} mm nozzle`,
                            selectedPrinter.nozzleType,
                          ].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>

          {/* Print Settings */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground flex-shrink-0">Print Settings</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Hidden file input — shared by both import buttons */}
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => openImport("filament")}
                  title="Import a Bambu Studio filament profile JSON"
                >
                  <Upload className="w-3 h-3" />
                  Import filament
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => openImport("process")}
                  title="Import a Bambu Studio process profile JSON"
                >
                  <Upload className="w-3 h-3" />
                  Import process
                </Button>
                <Button
                  type="button"
                  variant={isEditingSettings ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setIsEditingSettings((v) => !v)}
                >
                  {isEditingSettings ? (
                    <>
                      <Check className="w-3 h-3" />
                      Done
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3 h-3" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </div>
            {/* Settings search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search settings…"
                value={settingsSearch}
                onChange={(e) => setSettingsSearch(e.target.value)}
                className="h-8 pl-8 pr-8 text-xs"
                data-testid="input-settings-search"
              />
              {settingsSearch && (
                <button
                  type="button"
                  onClick={() => setSettingsSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <SettingsFormAccordion
              control={form.control}
              fieldsName="settings"
              baseValueMap={baseSnapshot}
              isEditing={isEditingSettings}
              prevDiffKeys={prevDiffKeys}
              settingsSearch={settingsSearch}
            />
          </div>

        </form>
      </Form>

      <FilamentDialog
        open={newFilamentOpen}
        onOpenChange={setNewFilamentOpen}
        mode="create"
        onSuccess={(id) => form.setValue("filamentId", id, { shouldValidate: true })}
      />

      <PrinterDialog
        open={newPrinterOpen}
        onOpenChange={setNewPrinterOpen}
        mode="create"
        onSuccess={(id) => form.setValue("printerId", id)}
      />

      {/* Import Preview Dialog */}
      {importPreview && (() => {
        const matchedRows = importPreview.rows.filter((r) => r.matched);
        const unmatchedRows = importPreview.rows.filter((r) => !r.matched);
        const grouped = importPreview.rows.reduce<Record<string, typeof importPreview.rows>>((acc, r) => {
          const key = r.subcategory ? `${r.category} › ${r.subcategory}` : r.category;
          (acc[key] ??= []).push(r);
          return acc;
        }, {});

        return (
          <Dialog open onOpenChange={() => setImportPreview(null)}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0">
              <DialogHeader className="px-5 pt-5 pb-3 border-b">
                <DialogTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  Import preview
                  <span className="ml-1 text-xs font-normal text-muted-foreground capitalize">
                    — {importPreview.type} profile
                  </span>
                </DialogTitle>
                {importPreview.profileName && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {importPreview.profileName}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {matchedRows.length} will be applied
                  </span>
                  {unmatchedRows.length > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="w-3.5 h-3.5" />
                      {unmatchedRows.length} not in template
                    </span>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
                {Object.entries(grouped).map(([groupKey, rows]) => (
                  <div key={groupKey}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                      {groupKey}
                    </p>
                    <div className="divide-y divide-border rounded-md border overflow-hidden">
                      {rows.map((r, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-2 text-xs gap-3 ${
                            r.matched
                              ? "bg-background"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            {r.matched ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                            )}
                            <span className="truncate">{r.name}</span>
                          </span>
                          <span className="font-mono tabular-nums flex-shrink-0 text-right">
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter className="px-5 py-3 border-t flex-row gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImportPreview(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={matchedRows.length === 0}
                  onClick={() => {
                    importPreview.applyValues();
                    setImportPreview(null);
                  }}
                >
                  Apply {matchedRows.length} setting{matchedRows.length !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Confirm Changes Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">Review Changes</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-1 pr-1">
            {settingsDiff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No settings were changed.
              </p>
            ) : (
              <>
                {changedDiffs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Modified ({changedDiffs.length})
                    </p>
                    <div className="space-y-1.5">
                      {changedDiffs.map((d) => (
                        <div key={d.name} className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2">
                          <p className="text-xs font-medium text-foreground mb-1">
                            {d.name}
                            {d.subcategory && (
                              <span className="text-muted-foreground font-normal"> · {d.subcategory}</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono text-muted-foreground line-through">
                              {d.oldValue}{d.unit ? ` ${d.unit}` : ""}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                              {d.newValue}{d.unit ? ` ${d.unit}` : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {addedDiffs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Added ({addedDiffs.length})
                    </p>
                    <div className="space-y-1.5">
                      {addedDiffs.map((d) => (
                        <div key={d.name} className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 flex items-center gap-2">
                          <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="text-xs font-medium flex-1">{d.name}</span>
                          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                            {d.newValue}{d.unit ? ` ${d.unit}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {removedDiffs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Removed ({removedDiffs.length})
                    </p>
                    <div className="space-y-1.5">
                      {removedDiffs.map((d) => (
                        <div key={d.name} className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 flex items-center gap-2 opacity-75">
                          <Minus className="w-3 h-3 text-red-500 flex-shrink-0" />
                          <span className="text-xs font-medium flex-1 line-through text-muted-foreground">{d.name}</span>
                          <span className="text-xs font-mono text-muted-foreground line-through">
                            {d.oldValue}{d.unit ? ` ${d.unit}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Go Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isPending}
              data-testid="button-confirm-save"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
