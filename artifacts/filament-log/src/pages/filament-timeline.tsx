import { useListLogs, getListLogsQueryKey, useDeleteLog, useDeleteFilament, useUpdateLog, getListFilamentsQueryKey, getGetLogsSummaryQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, Plus, Package, ChevronRight, Trash2, Edit,
  TrendingUp, TrendingDown, Minus, Calendar, Camera, Pencil, Printer,
  ThumbsUp, ThumbsDown, PenLine, Download,
} from "lucide-react";
import { FilamentDialog } from "@/components/filament-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { CameraCapture } from "@/components/camera-capture";
import { buildExportJson, downloadJson, exportFilename, type ExportFormat } from "@/lib/export-profile";

const FILAMENT_TYPE_COLORS: Record<string, string> = {
  PLA: "bg-emerald-100 text-emerald-800",
  PETG: "bg-blue-100 text-blue-800",
  ABS: "bg-orange-100 text-orange-800",
  ASA: "bg-purple-100 text-purple-800",
  TPU: "bg-pink-100 text-pink-800",
  Nylon: "bg-indigo-100 text-indigo-800",
  Resin: "bg-red-100 text-red-800",
  Other: "bg-gray-100 text-gray-800",
};

interface PrintSetting {
  name: string;
  value: string;
  unit?: string;
  category?: string;
  subcategory?: string;
}

interface DiffItem {
  type: "changed" | "added" | "removed";
  name: string;
  category?: string;
  subcategory?: string;
  currentValue?: string;
  previousValue?: string;
  unit?: string;
}

function computeDiff(prev: PrintSetting[], curr: PrintSetting[]): DiffItem[] {
  const key = (s: PrintSetting) => s.name + (s.category ? `|${s.category}` : "") + (s.subcategory ? `|${s.subcategory}` : "");
  const prevMap = new Map(prev.map((s) => [key(s), s]));
  const currMap = new Map(curr.map((s) => [key(s), s]));
  const diffs: DiffItem[] = [];

  for (const [k, cs] of currMap) {
    const ps = prevMap.get(k);
    if (!ps) {
      diffs.push({ type: "added", name: cs.name, category: cs.category, subcategory: cs.subcategory, currentValue: cs.value, unit: cs.unit });
    } else if (ps.value !== cs.value) {
      diffs.push({ type: "changed", name: cs.name, category: cs.category, subcategory: cs.subcategory, currentValue: cs.value, previousValue: ps.value, unit: cs.unit });
    }
  }

  for (const [k, ps] of prevMap) {
    if (!currMap.has(k)) {
      diffs.push({ type: "removed", name: ps.name, category: ps.category, subcategory: ps.subcategory, previousValue: ps.value, unit: ps.unit });
    }
  }

  return diffs;
}

function DiffBadge({ diff }: { diff: DiffItem }) {
  if (diff.type === "changed") {
    return (
      <div className="flex items-start gap-1.5 py-1 text-xs">
        <Minus className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
        <div className="min-w-0">
          <span className="font-medium text-foreground">{diff.name}</span>
          {diff.category && (
            <span className="text-muted-foreground ml-1">({diff.subcategory || diff.category})</span>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="line-through text-muted-foreground font-mono">{diff.previousValue}{diff.unit && <span className="font-sans"> {diff.unit}</span>}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-400 font-mono font-semibold">{diff.currentValue}{diff.unit && <span className="font-sans"> {diff.unit}</span>}</span>
          </div>
        </div>
      </div>
    );
  }
  if (diff.type === "added") {
    return (
      <div className="flex items-start gap-1.5 py-1 text-xs">
        <TrendingUp className="w-3 h-3 mt-0.5 text-emerald-500 flex-shrink-0" />
        <div className="min-w-0">
          <span className="font-medium text-foreground">{diff.name}</span>
          {diff.category && (
            <span className="text-muted-foreground ml-1">({diff.subcategory || diff.category})</span>
          )}
          <span className="text-emerald-700 dark:text-emerald-400 font-mono ml-1.5">{diff.currentValue}{diff.unit && <span className="font-sans"> {diff.unit}</span>}</span>
          <span className="text-emerald-600 text-[10px] ml-1">new</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-1.5 py-1 text-xs">
      <TrendingDown className="w-3 h-3 mt-0.5 text-red-400 flex-shrink-0" />
      <div className="min-w-0">
        <span className="font-medium text-foreground line-through text-muted-foreground">{diff.name}</span>
        {diff.category && (
          <span className="text-muted-foreground ml-1">({diff.subcategory || diff.category})</span>
        )}
        <span className="text-red-500 text-[10px] ml-1">removed</span>
      </div>
    </div>
  );
}

interface LogEntry {
  id: number;
  date: Date | string;
  createdAt: Date | string;
  imageUrl?: string;
  imageUrl2?: string;
  imageUrl2Label?: string;
  otherImages?: { url: string; label?: string }[];
  rating?: number | null;
  notes?: string;
  notesAfter?: string;
  settings: PrintSetting[];
  filament: { id: number; name: string; brand?: string; type?: string; color?: string };
}

function TimelineCard({
  entry,
  previousEntry,
  isFirst,
  isLast,
  entryNumber,
  onDelete,
  onUpdateImage,
  onRatingChange,
  onNotesAfterEdit,
  onCreatedAtEdit,
}: {
  entry: LogEntry;
  previousEntry?: LogEntry;
  isFirst: boolean;
  isLast: boolean;
  entryNumber: number;
  onDelete: (id: number) => void;
  onUpdateImage: (id: number, imageUrl: string | undefined) => void;
  onRatingChange: (id: number, rating: number | null) => void;
  onNotesAfterEdit: (id: number, notesAfter: string) => void;
  onCreatedAtEdit: (id: number, createdAt: string) => void;
}) {
  const [showFullDiff, setShowFullDiff] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [stagedUrl, setStagedUrl] = useState<string | undefined>(entry.imageUrl);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [notesAfterOpen, setNotesAfterOpen] = useState(false);
  const [notesAfterDraft, setNotesAfterDraft] = useState("");
  const [viewingImage, setViewingImage] = useState<{ url: string; label?: string } | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [datedraft, setDateDraft] = useState("");

  const diffs = previousEntry ? computeDiff(previousEntry.settings as PrintSetting[], entry.settings as PrintSetting[]) : [];
  const visibleDiffs = showFullDiff ? diffs : diffs.slice(0, 5);

  const handleExport = (fmt: ExportFormat) => {
    const data = buildExportJson(entry.settings, fmt, entry.filament, entry.date);
    const filename = exportFilename(entry.filament, entry.date, fmt);
    downloadJson(data, filename);
  };

  const handleOpenPhoto = () => {
    setStagedUrl(entry.imageUrl);
    setPhotoOpen(true);
  };

  const handleSavePhoto = () => {
    onUpdateImage(entry.id, stagedUrl || undefined);
    setPhotoOpen(false);
  };

  return (
    <div className="flex flex-col">
      {/* Horizontal timeline rail */}
      <div className="flex items-center py-2">
        <div className="flex-1 h-px bg-border" />
        <div className={cn(
          "w-6 h-6 rounded-full border-2 mx-2 flex-shrink-0 flex items-center justify-center text-[10px] font-bold tabular-nums leading-none",
          isFirst
            ? "border-yellow-400 bg-yellow-400 text-yellow-900"
            : "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300"
        )}>
          {entryNumber}
        </div>
        <div className={cn("flex-1 h-px", isLast ? "bg-transparent" : "bg-border")} />
      </div>

      {/* Card */}
      <div className="flex-1 pb-4 min-w-0">
        {/* Date header */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            {editingDate ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="datetime-local"
                  className="text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
                  value={datedraft}
                  onChange={(e) => setDateDraft(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="text-xs text-primary font-medium hover:underline"
                  onClick={() => {
                    if (datedraft) {
                      onCreatedAtEdit(entry.id, new Date(datedraft).toISOString());
                    }
                    setEditingDate(false);
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setEditingDate(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  const d = new Date(entry.createdAt);
                  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                  setDateDraft(local);
                  setEditingDate(true);
                }}
                title="Edit date"
              >
                {format(new Date(entry.createdAt), "MMMM d, yyyy · h:mm a")}
              </button>
            )}
          </div>
          {(entry as any).printer && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Printer className="w-3 h-3" />
              <span>{(entry as any).printer.name}</span>
              {(entry as any).printer.nozzleSize && (
                <span className="opacity-60">{(entry as any).printer.nozzleSize} mm</span>
              )}
            </div>
          )}
          {isFirst && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              Latest
            </span>
          )}
        </div>

        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          {/* Full-width image */}
          <div
            className="block w-full aspect-square bg-muted relative group cursor-pointer focus:outline-none"
            role="button"
            tabIndex={0}
            onClick={handleOpenPhoto}
            aria-label="Update photo"
            data-testid={`thumb-${entry.id}`}
          >
            {entry.imageUrl ? (
              <img
                src={entry.imageUrl}
                alt={entry.filament.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                <Camera className="w-7 h-7 text-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground/50">Tap to add photo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            {/* Secondary photo thumbnails */}
            {(() => {
              const imgs = (entry as any).otherImages as { url: string; label?: string }[] | undefined;
              if (!imgs || imgs.length === 0) return null;
              return (
                <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                  {imgs.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-10 h-10 rounded-md overflow-hidden border-2 border-white/80 shadow-md cursor-pointer hover:border-white transition-colors"
                      title={img.label || "Other image"}
                      onClick={(e) => { e.stopPropagation(); setViewingImage(img); }}
                    >
                      <img src={img.url} alt={img.label || "Other image"} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="p-3 space-y-3">
            {/* Top row: thumbs + edit/delete */}
            <div className="flex items-start gap-3">
              {/* Actions: thumbs + edit/delete */}
              <div className="flex-1 flex items-center justify-between min-w-0">
                {/* Thumbs up / down */}
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 transition-colors",
                      entry.rating === 1
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                        : "text-muted-foreground hover:text-emerald-600"
                    )}
                    onClick={() => onRatingChange(entry.id, entry.rating === 1 ? null : 1)}
                    aria-label="Thumbs up"
                    data-testid={`rating-up-${entry.id}`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 transition-colors",
                      entry.rating === -1
                        ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100"
                        : "text-muted-foreground hover:text-rose-600"
                    )}
                    onClick={() => onRatingChange(entry.id, entry.rating === -1 ? null : -1)}
                    aria-label="Thumbs down"
                    data-testid={`rating-down-${entry.id}`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* Edit + export + delete */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/logs/${entry.id}`}>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label="Export profile">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Export profile</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExport("filament")}>
                        <Download className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">Filament profile</div>
                          <div className="text-xs text-muted-foreground">Temp, cooling, retraction</div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("process")}>
                        <Download className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">Process profile</div>
                          <div className="text-xs text-muted-foreground">Speed, quality, infill</div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleExport("combined")}>
                        <Download className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium">Combined</div>
                          <div className="text-xs text-muted-foreground">All settings in one file</div>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the entry from {format(new Date(entry.createdAt), "MMM d, yyyy")}.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(entry.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">After Print</p>
                {entry.notesAfter ? (
                  <div className="flex items-start gap-1 group">
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{entry.notesAfter}</p>
                    <button
                      type="button"
                      onClick={() => { setNotesAfterDraft(entry.notesAfter ?? ""); setNotesAfterOpen(true); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Edit after-print note"
                    >
                      <PenLine className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setNotesAfterDraft(""); setNotesAfterOpen(true); }}
                    className="text-xs text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1"
                    data-testid={`add-notes-after-${entry.id}`}
                  >
                    <PenLine className="w-3 h-3" />
                    <span>Add after-print note</span>
                  </button>
                )}
              </div>
              {entry.notes && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Before Print</p>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{entry.notes}</p>
                </div>
              )}
            </div>

            {/* After-print note dialog */}
            <Dialog open={notesAfterOpen} onOpenChange={setNotesAfterOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>After Print Note</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={notesAfterDraft}
                  onChange={(e) => setNotesAfterDraft(e.target.value)}
                  placeholder="Results, observations, issues, improvements..."
                  rows={5}
                  className="resize-none"
                  autoFocus
                />
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setNotesAfterOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => {
                      onNotesAfterEdit(entry.id, notesAfterDraft);
                      setNotesAfterOpen(false);
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Changes from previous */}
            {previousEntry && diffs.length > 0 && (
              <div className="border-t border-border pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Changes from previous ({diffs.length})
                </p>
                <div className="space-y-0">
                  {visibleDiffs.map((d, i) => (
                    <DiffBadge key={i} diff={d} />
                  ))}
                  {diffs.length > 5 && (
                    <button
                      onClick={() => setShowFullDiff((v) => !v)}
                      className="text-[10px] text-primary font-medium mt-1 hover:underline"
                    >
                      {showFullDiff ? "Show less" : `+${diffs.length - 5} more changes`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* No changes */}
            {previousEntry && diffs.length === 0 && (
              <div className="border-t border-border pt-2">
                <p className="text-[10px] text-muted-foreground">No changes from previous entry</p>
              </div>
            )}

            {/* First entry */}
            {!previousEntry && (
              <div className="border-t border-border pt-2">
                <p className="text-[10px] text-muted-foreground italic">Initial entry — {entry.settings.length} settings recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo update dialog */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Photo</DialogTitle>
          </DialogHeader>
          <CameraCapture
            value={stagedUrl}
            onChange={setStagedUrl}
            onUploadingChange={setIsPhotoUploading}
          />
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setPhotoOpen(false)} disabled={isPhotoUploading}>
              Cancel
            </Button>
            <Button onClick={handleSavePhoto} disabled={isPhotoUploading}>
              {isPhotoUploading ? "Uploading…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image viewer modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => { if (!open) setViewingImage(null); }}>
        <DialogContent className="max-w-md p-2" aria-describedby={undefined}>
          {viewingImage && (
            <>
              <DialogHeader className="px-2 pt-2 pb-0">
                <DialogTitle className="text-sm">{viewingImage.label || "Image"}</DialogTitle>
              </DialogHeader>
              <div className="w-full overflow-hidden rounded-lg">
                <img
                  src={viewingImage.url}
                  alt={viewingImage.label || "Image"}
                  className="w-full h-auto object-contain max-h-[70vh]"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface FilamentTimelineProps {
  filamentId: string;
}

export default function FilamentTimeline({ filamentId }: FilamentTimelineProps) {
  const numericId = parseInt(filamentId, 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editFilamentOpen, setEditFilamentOpen] = useState(false);

  const { data, isLoading } = useListLogs(
    { limit: 500, filamentId: numericId },
    {
      query: {
        enabled: !isNaN(numericId),
        queryKey: getListLogsQueryKey({ limit: 500, filamentId: numericId }),
      },
    }
  );

  const deleteLog = useDeleteLog({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLogsSummaryQueryKey() });
        toast({ title: "Entry deleted" });
      },
      onError: () => {
        toast({ title: "Failed to delete entry", variant: "destructive" });
      },
    },
  });

  const deleteFilament = useDeleteFilament({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFilamentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLogsSummaryQueryKey() });
        toast({ title: "Filament deleted" });
        setLocation("/logs");
      },
      onError: () => {
        toast({ title: "Failed to delete filament", variant: "destructive" });
      },
    },
  });

  const entries = data?.logs
    ? [...data.logs].sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return dateDiff !== 0 ? dateDiff : b.id - a.id;
      })
    : [];

  const latestEntry = entries[0];
  const filament = latestEntry?.filament;

  const updateLog = useUpdateLog({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey({ limit: 500, filamentId: numericId }) });
        queryClient.invalidateQueries({ queryKey: getListFilamentsQueryKey() });
        toast({ title: "Photo updated" });
      },
      onError: () => {
        toast({ title: "Failed to update photo", variant: "destructive" });
      },
    },
  });

  const handleDelete = (id: number) => {
    deleteLog.mutate({ id });
  };

  const handleUpdateImage = (id: number, imageUrl: string | undefined) => {
    updateLog.mutate({ id, data: { imageUrl } });
  };

  const handleRatingChange = (id: number, rating: number | null) => {
    updateLog.mutate(
      { id, data: { rating } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLogsQueryKey({ limit: 500, filamentId: numericId }) });
        },
      }
    );
  };

  const handleNotesAfterEdit = (id: number, notesAfter: string) => {
    updateLog.mutate(
      { id, data: { notesAfter: notesAfter || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLogsQueryKey({ limit: 500, filamentId: numericId }) });
          toast({ title: "After-print note saved" });
        },
        onError: () => {
          toast({ title: "Failed to save note", variant: "destructive" });
        },
      }
    );
  };

  const handleCreatedAtEdit = (id: number, createdAt: string) => {
    updateLog.mutate(
      { id, data: { createdAt } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLogsQueryKey({ limit: 500, filamentId: numericId }) });
          queryClient.invalidateQueries({ queryKey: getGetLogsSummaryQueryKey() });
          toast({ title: "Date updated" });
        },
        onError: () => {
          toast({ title: "Failed to update date", variant: "destructive" });
        },
      }
    );
  };

  const handleAddEntry = () => {
    if (latestEntry) {
      const printerParam = (latestEntry as any).printerId ? `&printerId=${(latestEntry as any).printerId}` : "";
      setLocation(`/logs/new?copyFrom=${latestEntry.id}&filamentId=${latestEntry.filament.id}${printerParam}`);
    } else {
      setLocation(`/logs/new?filamentId=${numericId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="px-4 py-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0 || !filament) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No entries yet for this filament</p>
        <div className="flex items-center gap-2 mt-3">
          <Link href="/logs">
            <Button variant="outline" size="sm">Back</Button>
          </Link>
          <Button size="sm" onClick={() => setLocation(`/logs/new?filamentId=${numericId}`)}>
            <Plus className="w-4 h-4 mr-1" />
            Add first entry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/logs" className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          {(() => {
            const hex = filament.color && /^#[0-9A-Fa-f]{6}$/.test(filament.color) ? filament.color : null;
            return hex ? (
              <div
                className="w-7 h-7 rounded-full ring-1 ring-black/10 shadow-sm flex-shrink-0"
                style={{ backgroundColor: hex }}
              />
            ) : null;
          })()}
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-foreground truncate">{filament.name}</h1>
            <p className="text-xs text-muted-foreground">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
              {filament.brand && ` · ${filament.brand}`}
            </p>
          </div>
          {filament.type && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${FILAMENT_TYPE_COLORS[filament.type] ?? "bg-gray-100 text-gray-800"}`}>
              {filament.type}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={() => setEditFilamentOpen(true)}
            data-testid="button-edit-filament"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <AlertDialog>

            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" data-testid="button-delete-filament">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {filament.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {entries.length} {entries.length === 1 ? "entry" : "entries"} for this filament. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteFilament.mutate({ id: numericId })}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete all entries
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleAddEntry}
            data-testid="button-add-entry"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timeline — horizontal scroll */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 px-4 pt-1 pb-6" style={{ width: "max-content", minWidth: "100%" }}>
          {/* Add new entry */}
          <div className="flex-shrink-0 flex flex-col">
            <div className="flex items-center py-2">
              <div className="flex-1 h-px bg-transparent" />
              <button
                type="button"
                onClick={handleAddEntry}
                aria-label="Add new entry"
                className="w-7 h-7 rounded-full bg-green-500 hover:bg-green-400 active:bg-green-600 flex items-center justify-center flex-shrink-0 mx-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 shadow-sm"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              <div className="flex-1 h-px bg-border" />
            </div>
          </div>

          {entries.map((entry, idx) => (
            <div key={entry.id} className="w-[calc(100vw-72px)] max-w-[420px] flex-shrink-0">
              <TimelineCard
                entry={entry as LogEntry}
                previousEntry={entries[idx + 1] as LogEntry | undefined}
                isFirst={idx === 0}
                isLast={idx === entries.length - 1}
                entryNumber={entries.length - idx}
                onDelete={handleDelete}
                onUpdateImage={handleUpdateImage}
                onRatingChange={handleRatingChange}
                onNotesAfterEdit={handleNotesAfterEdit}
                onCreatedAtEdit={handleCreatedAtEdit}
              />
            </div>
          ))}
        </div>
      </div>

      <FilamentDialog
        open={editFilamentOpen}
        onOpenChange={setEditFilamentOpen}
        mode="edit"
        filament={filament ? { id: numericId, name: filament.name, brand: filament.brand, type: filament.type, color: filament.color } : undefined}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: getListLogsQueryKey({ limit: 500, filamentId: numericId }) })}
      />
    </div>
  );
}
