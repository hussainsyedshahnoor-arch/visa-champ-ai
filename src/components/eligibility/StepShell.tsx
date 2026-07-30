import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepShellProps {
  stepNumber: number;
  totalSteps: number;
  category: string;
  profileStatus: { label: string; tone: "muted" | "warning" };
  eyebrow: string;
  title: string;
  helper?: string;
  callout?: { title: string; lines: string[] };
  children: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}

const StepShell = ({
  stepNumber,
  totalSteps,
  category,
  profileStatus,
  eyebrow,
  title,
  helper,
  callout,
  children,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Next →",
}: StepShellProps) => (
  <div className="space-y-5">
    {/* Progress */}
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Step {stepNumber} of {totalSteps}
        </span>
        <span className="font-medium text-muted-foreground">{category}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
        />
      </div>
    </div>

    {/* Profile strip */}
    <Card className="border-border/70">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <span className="text-sm font-medium text-foreground">Your visa profile</span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            profileStatus.tone === "warning"
              ? "bg-accent/15 text-accent-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {profileStatus.label}
        </span>
      </CardContent>
    </Card>

    {/* Step card */}
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <span className="inline-block rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            {eyebrow}
          </span>
          <h2 className="text-xl font-bold text-foreground md:text-2xl">{title}</h2>
          {helper && <p className="text-sm text-muted-foreground">{helper}</p>}
        </div>

        {callout && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{callout.title}</p>
            {callout.lines.map((line) => (
              <p key={line} className="mt-1 leading-6">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-6">{children}</div>

        <div className="flex justify-end gap-3 pt-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              ← Back
            </Button>
          )}
          <Button onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default StepShell;
