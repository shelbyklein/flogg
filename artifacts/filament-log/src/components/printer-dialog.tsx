import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  useCreatePrinter,
  useUpdatePrinter,
  getListPrintersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const NOZZLE_SIZES = ["0.2", "0.4", "0.6", "0.8"] as const;
export const NOZZLE_TYPES = ["Hardened Steel", "Stainless Steel"] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  nozzleSize: z.string().optional(),
  nozzleType: z.string().optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface PrinterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  printer?: {
    id: number;
    name: string;
    brand?: string;
    nozzleSize?: string;
    nozzleType?: string;
    notes?: string;
    isDefault: boolean;
  };
  onSuccess?: (id: number) => void;
}

export function PrinterDialog({ open, onOpenChange, mode, printer, onSuccess }: PrinterDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", brand: "", nozzleSize: "", nozzleType: "", notes: "", isDefault: false },
  });

  useEffect(() => {
    if (open) {
      if (mode === "edit" && printer) {
        form.reset({
          name: printer.name,
          brand: printer.brand ?? "",
          nozzleSize: printer.nozzleSize ?? "",
          nozzleType: printer.nozzleType ?? "",
          notes: printer.notes ?? "",
          isDefault: printer.isDefault,
        });
      } else {
        form.reset({ name: "", brand: "", nozzleSize: "", nozzleType: "", notes: "", isDefault: false });
      }
    }
  }, [open, mode, printer, form]);

  const createPrinter = useCreatePrinter({
    mutation: {
      onSuccess: (p) => {
        queryClient.invalidateQueries({ queryKey: getListPrintersQueryKey() });
        toast({ title: `${p.name} added!` });
        onOpenChange(false);
        onSuccess?.(p.id);
      },
      onError: () => toast({ title: "Failed to create printer", variant: "destructive" }),
    },
  });

  const updatePrinter = useUpdatePrinter({
    mutation: {
      onSuccess: (p) => {
        queryClient.invalidateQueries({ queryKey: getListPrintersQueryKey() });
        toast({ title: "Printer updated" });
        onOpenChange(false);
        onSuccess?.(p.id);
      },
      onError: () => toast({ title: "Failed to update printer", variant: "destructive" }),
    },
  });

  const isPending = createPrinter.isPending || updatePrinter.isPending;

  const onSubmit = (values: FormValues) => {
    const data = {
      name: values.name,
      brand: values.brand || undefined,
      nozzleSize: values.nozzleSize || undefined,
      nozzleType: values.nozzleType || undefined,
      notes: values.notes || undefined,
      isDefault: values.isDefault ?? false,
    };
    if (mode === "create") {
      createPrinter.mutate({ data });
    } else if (printer) {
      updatePrinter.mutate({ id: printer.id, data });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New printer" : "Edit printer"}</DialogTitle>
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
                    <Input placeholder="e.g. Bambu Lab P1S" {...field} data-testid="input-printer-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Brand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Bambu Lab" {...field} data-testid="input-printer-brand" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nozzleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Nozzle size (mm)</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-nozzle-size">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NOZZLE_SIZES.map((s) => (
                          <SelectItem key={s} value={s}>{s} mm</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nozzleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Nozzle type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-nozzle-type">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NOZZLE_TYPES.map((t) => (
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes about this printer..."
                      className="resize-none text-sm"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <FormLabel className="text-xs font-medium">Set as default</FormLabel>
                    <p className="text-[11px] text-muted-foreground">Auto-select this printer when logging</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-default"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-printer">
                {isPending ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{mode === "create" ? "Adding..." : "Saving..."}</>
                ) : (
                  mode === "create" ? "Add printer" : "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
