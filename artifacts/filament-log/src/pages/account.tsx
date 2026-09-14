import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { LogOut, Shield, Sun, Moon, ChevronRight, User, Database } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

async function fetchOrphanedCount(): Promise<{ total: number; filaments: number; printers: number; logs: number }> {
  const res = await fetch("/api/admin/orphaned-count", { credentials: "include" });
  if (!res.ok) return { total: 0, filaments: 0, printers: 0, logs: 0 };
  return res.json();
}

async function migrateOrphans(): Promise<{ migrated: { filaments: number; printers: number; logs: number } }> {
  const res = await fetch("/api/admin/migrate-orphans", { method: "POST", credentials: "include" });
  if (!res.ok) throw new Error("Migration failed");
  return res.json();
}

export default function AccountPage() {
  const { user, isAdmin, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orphaned } = useQuery({
    queryKey: ["orphaned-count"],
    queryFn: fetchOrphanedCount,
  });

  const migrateMutation = useMutation({
    mutationFn: migrateOrphans,
    onSuccess: (data) => {
      const { filaments, printers, logs } = data.migrated;
      toast({
        title: "Data claimed!",
        description: `${filaments} filament${filaments !== 1 ? "s" : ""}, ${printers} printer${printers !== 1 ? "s" : ""}, ${logs} log${logs !== 1 ? "s" : ""} are now yours.`,
      });
      queryClient.invalidateQueries({ queryKey: ["orphaned-count"] });
      queryClient.invalidateQueries({ queryKey: ["filaments"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
    onError: () => toast({ title: "Migration failed", variant: "destructive" }),
  });

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  const hasOrphans = (orphaned?.total ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-8 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
      </div>

      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <User className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base truncate">
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email ?? ""}
            </p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                <Shield className="w-3 h-3" />
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {hasOrphans && (
        <div className="px-4 mb-4">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex gap-3 items-start">
              <Database className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold">Unclaimed data found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {orphaned!.filaments > 0 && `${orphaned!.filaments} filament${orphaned!.filaments !== 1 ? "s" : ""}`}
                  {orphaned!.filaments > 0 && orphaned!.printers > 0 && ", "}
                  {orphaned!.printers > 0 && `${orphaned!.printers} printer${orphaned!.printers !== 1 ? "s" : ""}`}
                  {(orphaned!.filaments > 0 || orphaned!.printers > 0) && orphaned!.logs > 0 && ", "}
                  {orphaned!.logs > 0 && `${orphaned!.logs} log${orphaned!.logs !== 1 ? "s" : ""}`}
                  {" "}exist with no owner. Claim them to add them to your account.
                </p>
                <button
                  onClick={() => migrateMutation.mutate()}
                  disabled={migrateMutation.isPending}
                  className="mt-3 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {migrateMutation.isPending ? "Claiming…" : "Claim existing data"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-2">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            onClick={toggle}
            className="w-full flex items-center px-4 py-3.5 gap-3 hover:bg-muted/50 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            ) : (
              <Moon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className="flex-1 text-left text-sm font-medium">
              {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            </span>
          </button>
        </div>

        {isAdmin && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setLocation("/admin")}
              className="w-full flex items-center px-4 py-3.5 gap-3 hover:bg-muted/50 transition-colors"
            >
              <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-left text-sm font-medium">Admin panel</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-4 py-3.5 gap-3 hover:bg-muted/50 transition-colors text-destructive"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1 text-left text-sm font-medium">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
