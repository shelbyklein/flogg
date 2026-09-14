import { useState } from "react";
import { useGetLogsSummary, useListFilaments, useListPrinters } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, ChevronRight, Package, Printer, Spool } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FilamentDialog } from "@/components/filament-dialog";
import { PrinterDialog } from "@/components/printer-dialog";
import floggDark from "@/assets/flogg_dark.svg";
import floggLight from "@/assets/flogg_light.svg";
import { useTheme } from "@/hooks/use-theme";

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

export default function Dashboard() {
  const summary = useGetLogsSummary();
  const filaments = useListFilaments();
  const printers = useListPrinters();
  const [filamentDialogOpen, setFilamentDialogOpen] = useState(false);
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header — wordmark centered */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-center">
        <img
          src={theme === "dark" ? floggDark : floggLight}
          alt="flogg"
          className="h-7 w-auto"
        />
      </div>

      <div className="px-4 py-5 space-y-6 max-w-2xl mx-auto">

        {/* Filaments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Spool className="w-4 h-4 text-primary" />
              Filaments
            </h2>
            <Link href="/filaments" className="text-xs text-primary font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {filaments.isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(filaments.data ?? []).map((fil) => {
                const hex = isValidHex(fil.color) ? fil.color : null;
                return (
                  <Link key={fil.id} href={`/filament/${fil.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform h-full">
                      <CardContent className="p-3 flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center border"
                          style={hex ? { backgroundColor: `${hex}22`, borderColor: `${hex}55` } : undefined}
                        >
                          {hex ? (
                            <div className="w-4.5 h-4.5 rounded-full ring-1 ring-black/10 shadow-sm" style={{ backgroundColor: hex }} />
                          ) : (
                            <Package className="w-4 h-4 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate leading-tight">{fil.name}</p>
                          {fil.brand && (
                            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{fil.brand}</p>
                          )}
                          {fil.type && (
                            <span className={`inline-block text-[10px] px-1.5 py-px rounded-full font-medium mt-0.5 ${FILAMENT_TYPE_COLORS[fil.type] ?? "bg-gray-100 text-gray-800"}`}>
                              {fil.type}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              {/* Add filament card */}
              <button
                type="button"
                onClick={() => setFilamentDialogOpen(true)}
                className="text-left w-full h-full"
                data-testid="button-add-filament"
              >
                <Card className="border-dashed hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform h-full">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center border border-dashed border-muted-foreground/30">
                      <Plus className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Add filament</p>
                  </CardContent>
                </Card>
              </button>
            </div>
          )}
        </div>

        {/* Printers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" />
              Printers
            </h2>
            <Link href="/printers" className="text-xs text-primary font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {printers.isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(printers.data ?? []).map((printer) => (
                <Link key={printer.id} href="/printers">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform h-full">
                    <CardContent className="p-3 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center bg-muted border border-border">
                        <Printer className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate leading-tight">{printer.name}</p>
                        {printer.brand && (
                          <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{printer.brand}</p>
                        )}
                        {(printer.nozzleSize || printer.nozzleType) && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
                            {[printer.nozzleSize ? `⌀${printer.nozzleSize}mm` : null, printer.nozzleType].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {/* Add printer card */}
              <button
                type="button"
                onClick={() => setPrinterDialogOpen(true)}
                className="text-left w-full h-full"
                data-testid="button-add-printer"
              >
                <Card className="border-dashed hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform h-full">
                  <CardContent className="p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center border border-dashed border-muted-foreground/30">
                      <Plus className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Add printer</p>
                  </CardContent>
                </Card>
              </button>
            </div>
          )}
        </div>

        {/* Stats — bottom summary */}
        <div className="grid grid-cols-3 gap-3">
          {summary.isLoading ? (
            <>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </>
          ) : (
            <>
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="stat-total-logs">
                    {summary.data?.totalLogs ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Total Logs</div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="stat-unique-filaments">
                    {summary.data?.uniqueFilaments ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Filaments</div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="stat-unique-brands">
                    {summary.data?.uniqueBrands ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Brands</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

      </div>

      <FilamentDialog
        open={filamentDialogOpen}
        onOpenChange={setFilamentDialogOpen}
        mode="create"
      />
      <PrinterDialog
        open={printerDialogOpen}
        onOpenChange={setPrinterDialogOpen}
        mode="create"
      />
    </div>
  );
}
