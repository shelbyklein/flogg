import { useCallback } from "react";
import { Switch, Route, Router as WouterRouter, Link, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Home, List, Printer, User } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PullToRefresh } from "@/components/pull-to-refresh";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LogsList from "@/pages/logs-list";
import LogForm from "@/pages/log-form";
import FilamentTimeline from "@/pages/filament-timeline";
import PrintersList from "@/pages/printers-list";
import Landing from "@/pages/landing";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import AccountPage from "@/pages/account";
import AdminPage from "@/pages/admin";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function BottomNav() {
  const [location] = useLocation();
  const { isSignedIn } = useAuth();

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const hide =
    location.includes("/new") ||
    /^\/logs\/\d+/.test(location) ||
    location.includes("/sign-in") ||
    location.includes("/sign-up") ||
    (!isSignedIn && location === "/");

  if (hide) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex">
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${isActive("/") ? "text-primary" : "text-muted-foreground"}`}
          data-testid="nav-dashboard"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link
          href="/logs"
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${isActive("/logs") || isActive("/filament") ? "text-primary" : "text-muted-foreground"}`}
          data-testid="nav-logs"
        >
          <List className="w-5 h-5" />
          <span className="text-[10px] font-medium">Filaments</span>
        </Link>
        <Link
          href="/printers"
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${isActive("/printers") ? "text-primary" : "text-muted-foreground"}`}
          data-testid="nav-printers"
        >
          <Printer className="w-5 h-5" />
          <span className="text-[10px] font-medium">Printers</span>
        </Link>
        <Link
          href="/account"
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${isActive("/account") || isActive("/admin") ? "text-primary" : "text-muted-foreground"}`}
          data-testid="nav-account"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">Account</span>
        </Link>
      </div>
    </div>
  );
}

function NewLogRoute() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const copyFromId = params.get("copyFrom") ?? undefined;
  const filamentId = params.get("filamentId") ?? undefined;
  const printerId = params.get("printerId") ?? undefined;
  return <LogForm mode="create" copyFromId={copyFromId} defaultFilamentId={filamentId} defaultPrinterId={printerId} />;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <Dashboard /> : <Landing />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return isSignedIn ? <>{children}</> : <Redirect to="/sign-in" />;
}

function AppContent() {
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const isFormPage = location.includes("/new") || /^\/logs\/\d+/.test(location);
  const isUnauthHome = !isSignedIn && location === "/";
  const isAuthPage =
    location.includes("/sign-in") ||
    location.includes("/sign-up") ||
    isUnauthHome;

  const paddingBottom = !isFormPage && !isAuthPage ? "pb-16" : "";
  const pullDisabled = isFormPage || isAuthPage || !isSignedIn;

  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries({ type: "active" });
  }, [queryClient]);

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={pullDisabled}>
      <div className={paddingBottom}>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/logs">
            <ProtectedRoute><LogsList /></ProtectedRoute>
          </Route>
          <Route path="/logs/new">
            <ProtectedRoute><NewLogRoute /></ProtectedRoute>
          </Route>
          <Route path="/logs/:id/edit">
            {(params) => <Redirect to={`/logs/${params.id}`} />}
          </Route>
          <Route path="/logs/:id">
            {(params) => (
              <ProtectedRoute><LogForm mode="edit" id={params.id} /></ProtectedRoute>
            )}
          </Route>
          <Route path="/filament/:id">
            {(params) => (
              <ProtectedRoute><FilamentTimeline filamentId={params.id} /></ProtectedRoute>
            )}
          </Route>
          <Route path="/printers">
            <ProtectedRoute><PrintersList /></ProtectedRoute>
          </Route>
          <Route path="/account">
            <ProtectedRoute><AccountPage /></ProtectedRoute>
          </Route>
          <Route path="/admin">
            <ProtectedRoute><AdminPage /></ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
        <BottomNav />
      </div>
    </PullToRefresh>
  );
}

function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <Providers />
    </WouterRouter>
  );
}

export default App;
