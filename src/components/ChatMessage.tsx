import ReactMarkdown from "react-markdown";
import { Globe, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}>
          {isUser ? <User className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isUser ? "bg-primary text-primary-foreground rounded-tr-md" : "bg-secondary text-secondary-foreground rounded-tl-md"}`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
