import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { ENV } from "@/lib/env";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  BugIcon,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const PASSWORD_MAX_LENGTH = 128;
const REDIRECT_SECONDS = 5;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Why: mirrors backend `validatePassword()` (utils/validation.php) so users see every rule
 * before submitting instead of getting a generic rejection from the API.
 */
const PASSWORD_RULES: { id: string; label: string; test: (value: string) => boolean }[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (v) => /[a-z]/.test(v) },
  { id: "number", label: "One number (0–9)", test: (v) => /\d/.test(v) },
  {
    id: "charset",
    label: "Only letters, numbers and @ $ ! % * ? &",
    test: (v) => v.length > 0 && /^[a-zA-Z\d@$!%*?&]+$/.test(v),
  },
];

const STRENGTH_LEVELS = [
  { label: "Too weak", bar: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  { label: "Weak", bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-600 dark:text-lime-400" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
];

async function postJson(path: string, body: unknown, signal: AbortSignal) {
  const response = await fetch(`${ENV.API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  return response.json();
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] [background-size:20px_20px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)]" />
      <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/10" />
      <div className="pointer-events-none fixed -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-600/10" />
      <main className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          {children}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} BugRicer · Secure account recovery
          </p>
        </div>
      </main>
    </div>
  );
}

function StatusCard({
  icon,
  tone,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  tone: "info" | "success" | "error";
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  const toneClasses = {
    info: "from-blue-600 to-indigo-600 shadow-blue-500/30",
    success: "from-emerald-500 to-green-600 shadow-emerald-500/30",
    error: "from-rose-500 to-red-600 shadow-rose-500/30",
  }[tone];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 p-6 text-center shadow-xl backdrop-blur-xl sm:p-8">
      <div
        className={cn(
          "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
          toneClasses,
        )}
      >
        {icon}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>
      {children && <div className="mt-6 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  invalid,
  describedBy,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, PASSWORD_MAX_LENGTH))}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required
          className={cn(
            "h-12 rounded-xl pl-10 pr-12 text-base sm:text-sm",
            invalid && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const submitControllerRef = useRef<AbortController | null>(null);

  const [token] = useState(() => searchParams.get("token"));

  useEffect(() => {
    if (!token) {
      setError("This reset link is missing its security token.");
      setIsValidating(false);
      return;
    }

    const controller = new AbortController();
    let timedOut = false;
    let unmounted = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    postJson("/auth/verify_reset_token.php", { token }, controller.signal)
      .then((data) => {
        if (data.success) setIsValidToken(true);
        else setError(data.message || "This reset link is invalid or has expired.");
      })
      .catch(() => {
        if (unmounted) return;
        setError(
          timedOut
            ? "Validating the link took too long. Check your connection and try again."
            : "We couldn't validate this reset link. Check your connection and try again.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!unmounted) setIsValidating(false);
      });

    return () => {
      unmounted = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [token]);

  useEffect(() => () => submitControllerRef.current?.abort("unmount"), []);

  useEffect(() => {
    if (!isSuccess) return;
    if (countdown <= 0) {
      navigate("/login", { replace: true });
      return;
    }
    const id = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [isSuccess, countdown, navigate]);

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(password) })),
    [password],
  );
  const passedCount = ruleResults.filter((r) => r.passed).length;
  const allRulesPassed = passedCount === PASSWORD_RULES.length;
  const strength = password.length === 0 ? null : STRENGTH_LEVELS[Math.min(passedCount, 5) - 1] ?? STRENGTH_LEVELS[0];
  const strengthSegments = password.length === 0 ? 0 : Math.max(1, Math.round((passedCount / PASSWORD_RULES.length) * 4));
  const confirmTouched = confirmPassword.length > 0;
  const passwordsMatch = confirmTouched && password === confirmPassword;
  const canSubmit = allRulesPassed && passwordsMatch && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsLoading(true);
    setError("");

    const controller = new AbortController();
    submitControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const data = await postJson(
        "/auth/reset_password.php",
        { token, password, confirm_password: confirmPassword },
        controller.signal,
      );

      if (data.success) {
        setPassword("");
        setConfirmPassword("");
        setIsSuccess(true);
        toast({
          title: "Password updated",
          description: "You can now sign in with your new password.",
        });
      } else {
        setError(data.message || "We couldn't reset your password. Please try again.");
      }
    } catch (err: unknown) {
      if (controller.signal.reason === "unmount") return;
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "The request timed out. Check your connection and try again."
          : "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      window.clearTimeout(timeoutId);
      if (submitControllerRef.current === controller) submitControllerRef.current = null;
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <AuthShell>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8" aria-busy="true">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-muted" />
            <div className="h-6 w-48 animate-pulse rounded-xl bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="mt-8 flex flex-col gap-4">
            <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying your reset link…
          </p>
        </div>
      </AuthShell>
    );
  }

  if (isSuccess) {
    return (
      <AuthShell>
        <StatusCard
          tone="success"
          icon={<CheckCircle2 className="h-8 w-8" />}
          title="Password updated"
          description={
            <>
              Your password has been changed successfully. For your security, sign in again with your new password.
              <span className="mt-3 block text-xs" aria-live="polite">
                Redirecting to sign in in <span className="font-semibold text-foreground">{countdown}s</span>
              </span>
            </>
          }
        >
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-1000 ease-linear"
              style={{ width: `${((REDIRECT_SECONDS - countdown) / REDIRECT_SECONDS) * 100}%` }}
            />
          </div>
          <Button
            onClick={() => navigate("/login", { replace: true })}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-700"
          >
            Sign in now
          </Button>
        </StatusCard>
      </AuthShell>
    );
  }

  if (!isValidToken) {
    return (
      <AuthShell>
        <StatusCard
          tone="error"
          icon={<AlertCircle className="h-8 w-8" />}
          title="Link expired or invalid"
          description={
            <>
              {error || "This password reset link is invalid or has expired."}
              <span className="mt-2 block">
                Reset links work once and expire for your security. Use{" "}
                <span className="font-medium text-foreground">Forgot password</span> on the sign-in page to get a new one.
              </span>
            </>
          }
        >
          <Button
            onClick={() => navigate("/login", { replace: true })}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to sign in
          </Button>
        </StatusCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <div className="text-center">
          <div className="group relative mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-400 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-50" />
            <BugIcon className="relative h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password you haven't used before on BugRicer.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <PasswordField
              id="password"
              label="New password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (error) setError("");
              }}
              placeholder="Enter a new password"
              autoComplete="new-password"
              describedBy="password-requirements"
              invalid={password.length > 0 && !allRulesPassed}
              autoFocus
            />

            <div className="flex flex-col gap-2" aria-live="polite">
              <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-colors duration-300",
                      i < strengthSegments && strength ? strength.bar : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Password strength</span>
                <span className={cn("font-medium", strength ? strength.text : "text-muted-foreground")}>
                  {strength ? strength.label : "—"}
                </span>
              </div>
            </div>

            <ul
              id="password-requirements"
              className="grid grid-cols-1 gap-1.5 rounded-xl border border-border/60 bg-muted/40 p-3 sm:grid-cols-2"
            >
              {ruleResults.map((rule) => (
                <li
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-2 text-xs transition-colors",
                    rule.passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                    rule.id === "charset" && "sm:col-span-2",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                      rule.passed ? "bg-emerald-500/15" : "bg-muted",
                    )}
                  >
                    {rule.passed ? <Check className="h-3 w-3" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  <span>
                    <span className="sr-only">{rule.passed ? "Met: " : "Not met: "}</span>
                    {rule.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                if (error) setError("");
              }}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              describedBy="confirm-feedback"
              invalid={confirmTouched && !passwordsMatch}
            />
            <p
              id="confirm-feedback"
              aria-live="polite"
              className={cn(
                "flex min-h-[1rem] items-center gap-1.5 text-xs",
                !confirmTouched && "invisible",
                passwordsMatch ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {passwordsMatch ? "Passwords match" : "Passwords don't match yet"}
            </p>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl disabled:opacity-60 disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password…
              </>
            ) : (
              <>
                <KeyRound className="mr-2 h-4 w-4" />
                Reset password
              </>
            )}
          </Button>

          <Button asChild variant="ghost" className="h-11 w-full rounded-xl text-muted-foreground hover:text-foreground">
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Link>
          </Button>
        </form>

        <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-500/5 p-3 text-xs text-muted-foreground dark:bg-blue-500/10">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>This reset link works only once. Never share it with anyone.</span>
        </div>
      </div>
    </AuthShell>
  );
};

export default ResetPassword;
