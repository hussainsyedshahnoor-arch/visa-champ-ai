import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const ForgotPasswordLink = () => {
  const [showForm, setShowForm] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleForgot = async () => {
    if (!resetEmail) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a password reset link." });
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button type="button" onClick={() => setShowForm(true)} className="text-xs text-primary hover:underline">
        Forgot password?
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-3 bg-muted/30">
      <p className="text-xs text-muted-foreground">Enter your email to receive a reset link</p>
      <Input type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleForgot} disabled={sending || !resetEmail}>{sending ? "Sending..." : "Send Link"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
      </div>
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // If already signed in, redirect
  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  // Auto-detect existing Google session (silent sign-in like Canva)
  useEffect(() => {
    if (authLoading || user || autoLoginAttempted) return;
    setAutoLoginAttempted(true);

    const trySilentGoogleLogin = async () => {
      try {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: `${window.location.origin}/dashboard`,
          extraParams: { prompt: "none" },
        });
        if (result.redirected) return;
        if (!result.error) navigate("/dashboard", { replace: true });
      } catch {
        // Silent login not possible — show normal login form
      }
    };

    trySilentGoogleLogin();
  }, [authLoading, user, autoLoginAttempted, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate(redirectTo, { replace: true });
    }
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${redirectTo}`,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) {
      toast({ title: "Google login failed", description: String(result.error), variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-4 inline-flex">
            <BrandLogo size="md" />
          </Link>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Log in to continue your visa consultation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <ForgotPasswordLink />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
