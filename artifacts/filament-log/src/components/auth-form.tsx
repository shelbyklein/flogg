import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import appIcon from "@/assets/icon.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { signIn, signUp, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [signupsAllowed, setSignupsAllowed] = useState(true);

  useEffect(() => {
    if (isSignedIn) setLocation("/", { replace: true });
  }, [isSignedIn, setLocation]);

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((d) => setSignupsAllowed(d.signupsAllowed !== false))
      .catch(() => {});
  }, []);

  const isSignUp = mode === "sign-up";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (isSignUp) {
        await signUp({ email, password, firstName, lastName });
      } else {
        await signIn(email, password);
      }
      setLocation("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="text-center mb-6">
          <img src={appIcon} alt="flogg" className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-xl font-bold">{isSignUp ? "Create your account" : "Sign in to flogg"}</h1>
          {isSignUp && !signupsAllowed && (
            <p className="text-sm text-muted-foreground mt-1">Sign-ups are disabled on this server.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={isSignUp ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {isSignUp && <p className="text-xs text-muted-foreground">At least 8 characters</p>}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary font-medium hover:underline">Sign in</Link>
            </>
          ) : (
            <>
              No account yet?{" "}
              <Link href="/sign-up" className="text-primary font-medium hover:underline">Create one</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
