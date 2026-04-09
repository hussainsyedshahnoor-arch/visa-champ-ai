import { Link } from "react-router-dom";
import { Globe, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onDismiss: () => void;
  remainingMessages?: number;
}

const SignupGateModal = ({ open, onDismiss, remainingMessages = 0 }: Props) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onDismiss} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 duration-300">
        <div className="rounded-2xl bg-background p-8 shadow-2xl border">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Globe className="h-8 w-8 text-primary" />
            </div>

            <h2 className="mb-2 text-xl font-bold text-foreground">
              You're on a roll! 🎉
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Create a free account to continue chatting with Visa Champ and save your conversation history.
            </p>

            {/* Benefits */}
            <div className="mb-6 w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-foreground">
                <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                <span>Unlimited visa consultations</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground">
                <Shield className="h-4 w-4 shrink-0 text-primary" />
                <span>Your chat history saved securely</span>
              </div>
            </div>

            {/* CTA */}
            <Link to="/signup" className="w-full">
              <Button className="w-full" size="lg">
                Sign up free
              </Button>
            </Link>

            <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Log in
              </Link>
            </div>

            <button
              onClick={onDismiss}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupGateModal;
