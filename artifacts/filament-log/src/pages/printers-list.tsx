import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Printer, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useListPrinters, useDeletePrinter, getListPrintersQueryKey } from "@workspace/api-client-react";
import { PrinterDialog } from "@/components/printer-dialog";
import { useToast } from "@/hooks/use-toast";
import logoLight from "@/assets/flogg_light.svg";
import logoDark from "@/assets/flogg_dark.svg";
import { useTheme } from "@/hooks/use-theme";

interface PrinterCardProps {
  printer: {
    id: number;
    name: string;
    brand?: string;
    nozzleSize?: string;
    nozzleType?: string;
    notes?: string;
    isDefault: boolean;
  };
  onEdit: () => void;
  onDelete: () => void;
}

function PrinterCard({ printer, onEdit, onDelete }: PrinterCardProps) {
  return (
    <Card data-testid={`printer-card-${printer.id}`}>
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <Printer className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground leading-tight" data-testid="text-printer-name">
                {printer.name}
              </p>
              {printer.isDefault && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  Default
                </span>
              )}
            </div>
            {printer.brand && (
              <p className="text-xs text-muted-foreground mt-0.5">{printer.brand}</p>
            )}
            {(printer.nozzleSize || printer.nozzleType) && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {printer.nozzleSize && (
                  <span className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {printer.nozzleSize} mm nozzle
                  </span>
                )}
                {printer.nozzleType && (
                  <span className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {printer.nozzleType}
                  </span>
                )}
              </div>
            )}
            {printer.notes && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{printer.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              data-testid="button-edit-printer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  data-testid="button-delete-printer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete printer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{printer.name}" will be removed. Existing log entries that reference this printer will not be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onDelete}
                    data-testid="button-confirm-delete-printer"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PrintersList() {
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<{
    id: number; name: string; brand?: string; nozzleSize?: string; nozzleType?: string; notes?: string; isDefault: boolean;
  } | undefined>(undefined);

  const { data: printers, isLoading } = useListPrinters();

  const deletePrinter = useDeletePrinter({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPrintersQueryKey() });
        toast({ title: "Printer deleted" });
      },
      onError: () => toast({ title: "Failed to delete printer", variant: "destructive" }),
    },
  });

  const handleEdit = (printer: typeof editingPrinter) => {
    setEditingPrinter(printer);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingPrinter(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <img
          src={theme === "dark" ? logoDark : logoLight}
          alt="Flog"
          className="h-6"
        />
        <Button size="icon" variant="ghost" onClick={handleNew} data-testid="button-new-printer">
          <Plus className="w-5 h-5 text-primary" />
        </Button>
      </div>

      <div className="px-4 py-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Printer className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">Printers</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !printers || printers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Printer className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-muted-foreground font-medium">No printers yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Add a printer to track it with your logs</p>
            </div>
            <Button onClick={handleNew} data-testid="button-add-first-printer">
              <Plus className="w-4 h-4 mr-1" />
              Add printer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {printers.map((p) => (
              <PrinterCard
                key={p.id}
                printer={p}
                onEdit={() => handleEdit({
                  id: p.id,
                  name: p.name,
                  brand: p.brand ?? undefined,
                  nozzleSize: p.nozzleSize ?? undefined,
                  nozzleType: p.nozzleType ?? undefined,
                  notes: p.notes ?? undefined,
                  isDefault: p.isDefault,
                })}
                onDelete={() => deletePrinter.mutate({ id: p.id })}
              />
            ))}
          </div>
        )}
      </div>

      <PrinterDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPrinter(undefined);
        }}
        mode={editingPrinter ? "edit" : "create"}
        printer={editingPrinter}
      />
    </div>
  );
}
