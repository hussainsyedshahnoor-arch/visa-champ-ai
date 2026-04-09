import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg";

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  size?: BrandLogoSize;
}

const sizeMap: Record<BrandLogoSize, { mark: string; icon: string; text: string }> = {
  sm: { mark: "h-8 w-8 rounded-xl", icon: "h-4 w-4", text: "text-base" },
  md: { mark: "h-10 w-10 rounded-2xl", icon: "h-5 w-5", text: "text-lg" },
  lg: { mark: "h-12 w-12 rounded-2xl", icon: "h-6 w-6", text: "text-xl" },
};

const BrandLogo = ({ className, showText = true, size = "md" }: BrandLogoProps) => {
  const s = sizeMap[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 text-primary ring-1 ring-border/60",
          s.mark,
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" className={cn("drop-shadow-sm", s.icon)} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 19.5C20.6 12.7 29.6 9 39 9c4 0 7.9.7 11.5 2" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M16 25.5 30.5 47 49 18" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 44c5.6 6.9 14 11 22.8 11 6.2 0 12.1-2 16.8-5.6" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" opacity="0.55" />
          <circle cx="49" cy="17" r="4.5" fill="currentColor" opacity="0.2" />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight text-foreground", s.text)}>
          Visa Champ
        </span>
      )}
    </div>
  );
};

export default BrandLogo;