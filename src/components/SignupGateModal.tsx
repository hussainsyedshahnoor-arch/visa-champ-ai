import { Link, useLocation } from "react-router-dom";
import { Globe, MessageSquare, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildReturnPath, getSafeRedirect } from "@/lib/auth-return";

interface Props {
  open: boolean;
  onDismiss: () => void;
  remainingMessages?: number;
  required?: boolean;
  title?: string;
  description?: string;
  redirectPath?: string;
}

const SignupGateModal = ({ open, onDismiss, remainingMessages = 0, required = false, title, description, redirectPath }: Props) => {
  const location = useLocation();
  const redirect = getSafeRedirect(
    redirectPath,
    buildReturnPath(location.pathname, location.search, location.hash),
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={required ? undefined : onDismiss} />

      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 duration-300">
        <div className="rounded-2xl border bg-background p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Globe className="h-8 w-8 text-primary" />
            </div>

            <h2 className="mb-2 text-xl font-bold text-foreground">
              {title || "You're on a roll! 🎉"}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {description || "Create a free account to continue chatting with Visa Champ and save your conversation history."}
            </p>

            <div className="mb-6 w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                <span>Unlimited visa consultations</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                <span>Free eligibility score checks</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <Shield className="h-4 w-4 shrink-0 text-primary" />
                <span>Your data saved securely</span>
              </div>
            </div>

            <Link to={`/signup?redirect=${encodeURIComponent(redirect)}`} className="w-full">
              <Button className="w-full" size="lg">
                Sign up free
              </Button>
            </Link>

            <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </div>

            {!required && (
              <button
                onClick={onDismiss}
                className="mt-4 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Maybe later
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupGateModal;
