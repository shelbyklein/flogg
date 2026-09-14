import { Link } from "wouter";
import { BarChart2, Camera, GitCompareArrows, Layers, Sun, Moon } from "lucide-react";
import floggDark from "@/assets/flogg_dark.svg";
import floggLight from "@/assets/flogg_light.svg";
import appIcon from "@/assets/icon.svg";
import { useTheme } from "@/hooks/use-theme";

export default function Landing() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Theme toggle — top right */}
      <button
        onClick={toggle}
        className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-6">
          <img
            src={appIcon}
            alt="flogg"
            className="w-16 h-16 mx-auto mb-5"
          />
          <img
            src={theme === "dark" ? floggDark : floggLight}
            alt="flogg"
            className="h-9 w-auto mx-auto mb-3"
          />
          <p className="text-muted-foreground text-lg max-w-xs mx-auto">
            The filament print settings logger for 3D printing enthusiasts
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10 text-left">
          <div className="rounded-xl border border-border bg-card p-4">
            <BarChart2 className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-medium">Track settings</p>
            <p className="text-xs text-muted-foreground mt-0.5">Log every print with full settings detail</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <GitCompareArrows className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-medium">Compare diffs</p>
            <p className="text-xs text-muted-foreground mt-0.5">See exactly what changed between prints</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Camera className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-medium">Photo uploads</p>
            <p className="text-xs text-muted-foreground mt-0.5">Attach photos to each print log</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <Layers className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm font-medium">By filament</p>
            <p className="text-xs text-muted-foreground mt-0.5">Browse your history per filament spool</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/sign-up"
            className="w-full rounded-xl bg-primary text-primary-foreground font-semibold py-3 text-center text-sm hover:opacity-90 transition-opacity"
          >
            Create account
          </Link>
          <Link
            href="/sign-in"
            className="w-full rounded-xl border border-border bg-card font-semibold py-3 text-center text-sm hover:bg-muted transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground py-4">
        Your data stays private to your account
      </p>
    </div>
  );
}
