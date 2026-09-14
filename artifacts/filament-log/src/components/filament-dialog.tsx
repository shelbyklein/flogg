import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, Upload, X, FileJson, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  useCreateFilament,
  useUpdateFilament,
  useCreateLog,
  getListFilamentsQueryKey,
  getListLogsQueryKey,
  getGetLogsSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { parseProfileJson, type ImportedValue } from "@/lib/import-profile";

const FILAMENT_TYPES = ["PLA", "PETG", "ABS", "ASA", "TPU", "Nylon", "Resin", "Other"];

export const PRESET_COLORS = [
  { name: "White",       hex: "#FFFFFF" },
  { name: "Light Gray",  hex: "#E0E0E0" },
  { name: "Gray",        hex: "#9E9E9E" },
  { name: "Dark Gray",   hex: "#616161" },
  { name: "Black",       hex: "#212121" },
  { name: "Pink",        hex: "#F48FB1" },
  { name: "Hot Pink",    hex: "#E91E63" },
  { name: "Red",         hex: "#F44336" },
  { name: "Dark Red",    hex: "#B71C1C" },
  { name: "Orange",      hex: "#FF9800" },
  { name: "Amber",       hex: "#FFC107" },
  { name: "Yellow",      hex: "#FFEB3B" },
  { name: "Lime",        hex: "#CDDC39" },
  { name: "Light Green", hex: "#8BC34A" },
  { name: "Green",       hex: "#4CAF50" },
  { name: "Dark Green",  hex: "#2E7D32" },
  { name: "Teal",        hex: "#009688" },
  { name: "Cyan",        hex: "#00BCD4" },
  { name: "Light Blue",  hex: "#03A9F4" },
  { name: "Blue",        hex: "#2196F3" },
  { name: "Dark Blue",   hex: "#1565C0" },
  { name: "Purple",      hex: "#9C27B0" },
  { name: "Deep Purple", hex: "#673AB7" },
  { name: "Brown",       hex: "#795548" },
];

function isValidHex(str: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(str);
}

function ColorPicker({ value, onChange }: { value?: string; onChange: (val: string) => void }) {
  const [hexInput, setHexInput] = useState(
    value && isValidHex(value) ? value.replace("#", "") : ""
  );

  useEffect(() => {
    if (value && isValidHex(value)) {
      setHexInput(value.replace("#", ""));
    }
  }, [value]);

  const handleSwatchClick = (hex: string) => {
    setHexInput(hex.replace("#", ""));
    onChange(hex);
  };

  const handleHexInput = (raw: string) => {
    const cleaned = raw.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
    setHexInput(cleaned);
    const full = `#${cleaned}`;
    if (cleaned.length === 6 && isValidHex(full)) {
      onChange(full);
    }
  };

  const previewColor = value && isValidHex(value) ? value : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-1.5">
        {PRESET_COLORS.map((c) => {
          const selected = value?.toUpperCase() === c.hex.toUpperCase();
          const isLight = ["#FFFFFF", "#E0E0E0", "#FFEB3B", "#CDDC39", "#F48FB1"].includes(c.hex);
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => handleSwatchClick(c.hex)}
              title={c.name}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center",
                "hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected ? "border-primary scale-110 shadow-md" : "border-transparent"
              )}
              style={{ backgroundColor: c.hex }}
            >
              {selected && (
                <Check
                  className={cn("w-3 h-3", isLight ? "text-gray-800" : "text-white")}
                  strokeWidth={3}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full border border-border flex-shrink-0 transition-colors"
          style={{ backgroundColor: previewColor ?? "transparent" }}
        />
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
            #
          </span>
          <Input
            value={hexInput.toUpperCase()}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="e.g. FF5733"
            className="pl-7 font-mono text-sm tracking-wider"
            maxLength={6}
            data-testid="input-filament-color"
          />
        </div>
      </div>
    </div>
  );
}

type ParsedProfile = {
  fileName: string;
  values: ImportedValue[];
  profileName?: string;
};

type ProfileSlot = {
  label: string;
  parsed: ParsedProfile | null;
  error: string | null;
};

function ProfileUploadSlot({
  label,
  slot,
  onFile,
  onClear,
  testId,
}: {
  label: string;
  slot: ProfileSlot;
  onFile: (file: File) => void;
  onClear: () => void;
  testId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      {slot.parsed ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <FileJson className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {slot.parsed.profileName ?? slot.parsed.fileName}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {slot.parsed.values.length} settings imported
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : slot.error ? (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-destructive">{slot.error}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          data-testid={testId}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-accent/40 transition-all text-muted-foreground"
        >
          <Upload className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-xs">Upload .json</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  type: z.string().optional(),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface FilamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  filament?: {
    id: number;
    name: string;
    brand?: string;
    type?: string;
    color?: string;
  };
  onSuccess?: (id: number) => void;
}

const emptySlot = (): ProfileSlot => ({ label: "", parsed: null, error: null });

export function FilamentDialog({ open, onOpenChange, mode, filament, onSuccess }: FilamentDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [processSlot, setProcessSlot] = useState<ProfileSlot>(emptySlot());
  const [filamentSlot, setFilamentSlot] = useState<ProfileSlot>(emptySlot());

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", brand: "", type: "", color: "" },
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && filament) {
        form.reset({
          name: filament.name,
          brand: filament.brand ?? "",
          type: filament.type ?? "",
          color: filament.color ?? "",
        });
      } else {
        form.reset({ name: "", brand: "", type: "", color: "" });
        setProcessSlot(emptySlot());
        setFilamentSlot(emptySlot());
      }
    }
  }, [open, mode, filament, form]);

  function readFile(file: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          resolve(JSON.parse(e.target?.result as string));
        } catch {
          reject(new Error("Not valid JSON"));
        }
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsText(file);
    });
  }

  async function handleFileForSlot(
    file: File,
    setSlot: React.Dispatch<React.SetStateAction<ProfileSlot>>,
  ) {
    try {
      const json = await readFile(file);
      const result = parseProfileJson(json);
      if (!result.ok) {
        setSlot({ label: "", parsed: null, error: result.error });
      } else {
        setSlot({
          label: "",
          parsed: { fileName: file.name, values: result.values, profileName: result.profileName },
          error: null,
        });
      }
    } catch (e: unknown) {
      setSlot({ label: "", parsed: null, error: (e as Error).message ?? "Failed to parse file" });
    }
  }

  const createLog = useCreateLog({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLogsSummaryQueryKey() });
      },
    },
  });

  const createFilament = useCreateFilament({
    mutation: {
      onSuccess: async (f) => {
        queryClient.invalidateQueries({ queryKey: getListFilamentsQueryKey() });

        const allValues: ImportedValue[] = [
          ...(processSlot.parsed?.values ?? []),
          ...(filamentSlot.parsed?.values ?? []),
        ];

        if (allValues.length > 0) {
          const settings = allValues.map((v) => ({
            name: v.name,
            value: v.value,
            category: v.category,
            subcategory: v.subcategory,
            visible: true,
            ...(v.type ? { type: v.type } : {}),
          }));

          await createLog.mutateAsync({
            data: {
              filamentId: f.id,
              date: new Date(),
              notes: "Imported from profile files",
              settings,
            },
          });

          toast({ title: `${f.name} added with ${allValues.length} starter settings!` });
        } else {
          toast({ title: `${f.name} added!` });
        }

        onOpenChange(false);
        onSuccess?.(f.id);
      },
      onError: () => toast({ title: "Failed to create filament", variant: "destructive" }),
    },
  });

  const updateFilament = useUpdateFilament({
    mutation: {
      onSuccess: (f) => {
        queryClient.invalidateQueries({ queryKey: getListFilamentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
        toast({ title: "Filament updated" });
        onOpenChange(false);
        onSuccess?.(f.id);
      },
      onError: () => toast({ title: "Failed to update filament", variant: "destructive" }),
    },
  });

  const isPending = createFilament.isPending || updateFilament.isPending || createLog.isPending;

  const onSubmit = (values: FormValues) => {
    const data = {
      name: values.name,
      brand: values.brand || undefined,
      type: values.type || undefined,
      color: values.color || undefined,
    };
    if (mode === "create") {
      createFilament.mutate({ data });
    } else if (filament) {
      updateFilament.mutate({ id: filament.id, data });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New filament" : "Edit filament"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. eSUN PLA+ White"
                      {...field}
                      data-testid="input-filament-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. eSUN" {...field} data-testid="input-filament-brand" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-filament-type">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FILAMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Color</FormLabel>
                  <FormControl>
                    <ColorPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {mode === "create" && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Starter profiles <span className="normal-case">(optional)</span>
                  </p>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Upload a process and/or filament profile JSON exported from your slicer. The settings will be saved as the first log entry for this filament.
                </p>
                <ProfileUploadSlot
                  label="Process profile"
                  slot={processSlot}
                  onFile={(f) => handleFileForSlot(f, setProcessSlot)}
                  onClear={() => setProcessSlot(emptySlot())}
                  testId="upload-process-profile"
                />
                <ProfileUploadSlot
                  label="Filament profile"
                  slot={filamentSlot}
                  onFile={(f) => handleFileForSlot(f, setFilamentSlot)}
                  onClear={() => setFilamentSlot(emptySlot())}
                  testId="upload-filament-profile"
                />
              </div>
            )}

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-filament">
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{mode === "create" ? "Adding..." : "Saving..."}</>
                ) : (
                  mode === "create" ? "Add filament" : "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
