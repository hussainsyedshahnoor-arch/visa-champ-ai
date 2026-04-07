import { Globe } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const TypingIndicator = () => (
  <div className="flex gap-3">
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarFallback className="bg-primary text-primary-foreground">
        <Globe className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-secondary px-4 py-3">
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
    </div>
  </div>
);

export default TypingIndicator;
