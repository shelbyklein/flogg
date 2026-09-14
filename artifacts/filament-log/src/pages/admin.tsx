import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, Ban, CheckCircle, Crown, User, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  banned: boolean;
  role: string;
  createdAt: number;
  lastSignInAt: number | null;
}

async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function banUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/ban`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to ban user");
}

async function unbanUser(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/unban`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to unban user");
}

async function setRole(userId: string, role: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("Failed to set role");
}

async function checkBootstrapAvailable(): Promise<boolean> {
  const res = await fetch("/api/admin/bootstrap-available", { credentials: "include" });
  if (!res.ok) return false;
  const data = await res.json();
  return data.available;
}

async function claimAdmin(): Promise<void> {
  const res = await fetch("/api/admin/bootstrap", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to claim admin");
  }
}

export default function AdminPage() {
  const { user, isAdmin, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bootstrapAvailable } = useQuery({
    queryKey: ["admin", "bootstrap-available"],
    queryFn: checkBootstrapAvailable,
    enabled: !isAdmin,
  });

  const bootstrapMutation = useMutation({
    mutationFn: claimAdmin,
    onSuccess: async () => {
      toast({ title: "You're now an admin!" });
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: fetchAdminUsers,
    enabled: isAdmin,
  });

  const banMutation = useMutation({
    mutationFn: ({ userId, banned }: { userId: string; banned: boolean }) =>
      banned ? unbanUser(userId) : banUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User updated" });
    },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => setRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Role updated" });
    },
    onError: () => toast({ title: "Failed to update role", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-border bg-background/95 sticky top-0 z-10 backdrop-blur">
        <button
          onClick={() => setLocation("/account")}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Admin Panel</h1>
      </div>

      <div className="px-4 pt-4">
        {/* Not admin — show bootstrap or access denied */}
        {!isAdmin && (
          <>
            {bootstrapAvailable === true && (
              <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">First-time setup</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No admin exists yet. Claim admin access to manage user accounts.
                  </p>
                </div>
                <Button
                  className="w-full"
                  disabled={bootstrapMutation.isPending}
                  onClick={() => bootstrapMutation.mutate()}
                >
                  <Crown className="w-4 h-4 mr-1.5" />
                  Claim admin access
                </Button>
              </div>
            )}

            {bootstrapAvailable === false && (
              <div className="flex flex-col items-center text-center gap-3 py-12">
                <Shield className="w-10 h-10 text-muted-foreground" />
                <p className="font-semibold">Admin access required</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  An admin already exists. Ask them to grant you access from the admin panel.
                </p>
                <Button variant="ghost" onClick={() => setLocation("/")}>
                  Go home
                </Button>
              </div>
            )}
          </>
        )}

        {/* Admin view */}
        {isAdmin && (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              Manage user accounts. Changes take effect immediately.
            </p>

            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Failed to load users. Please try again.
              </div>
            )}

            {users && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {users.length} user{users.length !== 1 ? "s" : ""}
                </p>
                {users.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-3">
                      {u.imageUrl ? (
                        <img
                          src={u.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm">
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                          </p>
                          {u.banned && (
                            <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">
                              Banned
                            </span>
                          )}
                          {u.role === "admin" && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" />Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        {u.lastSignInAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Last seen {new Date(u.lastSignInAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {u.id !== user?.id && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Button
                          size="sm"
                          variant={u.banned ? "default" : "outline"}
                          className="h-7 text-xs gap-1"
                          disabled={banMutation.isPending}
                          onClick={() => banMutation.mutate({ userId: u.id, banned: u.banned })}
                        >
                          {u.banned ? (
                            <><CheckCircle className="w-3.5 h-3.5" />Unban</>
                          ) : (
                            <><Ban className="w-3.5 h-3.5" />Ban</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={roleMutation.isPending}
                          onClick={() =>
                            roleMutation.mutate({
                              userId: u.id,
                              role: u.role === "admin" ? "user" : "admin",
                            })
                          }
                        >
                          <Crown className="w-3.5 h-3.5" />
                          {u.role === "admin" ? "Remove admin" : "Make admin"}
                        </Button>
                      </div>
                    )}
                    {u.id === user?.id && (
                      <p className="text-xs text-muted-foreground mt-2 italic">That's you</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
