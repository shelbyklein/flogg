import { useState } from "react";
import { useListFilaments, useDeleteFilament, getListFilamentsQueryKey, getListLogsQueryKey, getGetLogsSummaryQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Plus, Search, Package, ChevronRight, Layers, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilamentDialog } from "@/components/filament-dialog";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FILAMENT_TYPE_COLORS: Record<string, string> = {
  PLA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  PETG: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ABS: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  ASA: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  TPU: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  Nylon: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Resin: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function isValidHex(str?: string | null): str is string {
  return !!str && /^#[0-9A-Fa-f]{6}$/.test(str);
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface FilamentToDelete {
  id: number;
  name: string;
  entryCount: number;
}

export default function LogsList() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FilamentToDelete | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: filaments, isLoading } = useListFilaments();

  const deleteFilament = useDeleteFilament({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilamentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLogsSummaryQueryKey() });
        toast({ title: "Filament deleted" });
        setDeleteTarget(null);
      },
      onError: () => {
        toast({ title: "Failed to delete filament", variant: "destructive" });
        setDeleteTarget(null);
      },
    },
  });

  const filtered = filaments
    ? filaments.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.brand ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">Filaments</h1>
          <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="button-new-filament">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search filament or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="px-4 py-4 flex flex-wrap gap-3 justify-start">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-full max-w-[420px]">
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 w-full">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No filaments match your search" : "No filaments yet"}
            </p>
            {!search && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setDialogOpen(true)}
                data-testid="button-add-filament"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add first filament
              </Button>
            )}
          </div>
        ) : (
          filtered.map((filament) => {
            const hex = isValidHex(filament.color) ? filament.color : null;
            return (
              <div key={filament.id} className="w-full max-w-[420px] relative group">
                <Link
                  href={`/filament/${filament.id}`}
                  data-testid={`card-filament-${filament.id}`}
                >
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer active:scale-[0.98] pr-12"
                    style={{
                      backgroundColor: hex ? hexToRgba(hex, 0.08) : undefined,
                      borderColor: hex ? hexToRgba(hex, 0.3) : undefined,
                    }}
                  >
                    {/* Color swatch / fallback icon */}
                    <div
                      className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center border"
                      style={{
                        backgroundColor: hex ? hexToRgba(hex, 0.15) : undefined,
                        borderColor: hex ? hexToRgba(hex, 0.3) : undefined,
                      }}
                    >
                      {hex ? (
                        <div
                          className="w-7 h-7 rounded-full shadow-sm ring-1 ring-black/10"
                          style={{ backgroundColor: hex }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground/40" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground truncate">{filament.name}</span>
                        {filament.type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FILAMENT_TYPE_COLORS[filament.type] ?? "bg-gray-100 text-gray-800"}`}>
                            {filament.type}
                          </span>
                        )}
                      </div>
                      {filament.brand && (
                        <p className="text-xs text-muted-foreground mt-0.5">{filament.brand}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {filament.lastDate ? `Last: ${format(new Date(filament.lastDate), "MMM d, yyyy")}` : "No entries yet"}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Layers className="w-3 h-3" />
                          <span>{filament.entryCount} {filament.entryCount === 1 ? "entry" : "entries"}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>

                {/* Delete button — floats over the right edge of the card */}
                <button
                  type="button"
                  aria-label={`Delete ${filament.name}`}
                  data-testid={`btn-delete-filament-${filament.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteTarget({ id: filament.id, name: filament.name, entryCount: filament.entryCount });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <FilamentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="create"
        onSuccess={(id) => setLocation(`/filament/${id}`)}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the filament
              {deleteTarget && deleteTarget.entryCount > 0
                ? ` and all ${deleteTarget.entryCount} ${deleteTarget.entryCount === 1 ? "entry" : "entries"} associated with it`
                : ""}.
              {" "}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteFilament.mutate({ id: deleteTarget.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTarget && deleteTarget.entryCount > 0 ? "Delete filament & entries" : "Delete filament"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
