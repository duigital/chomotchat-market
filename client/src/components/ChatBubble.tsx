import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface ChatBubbleProps {
  message: string;
  timestamp: Date;
  isMine: boolean;
}

export default function ChatBubble({ message, timestamp, isMine }: ChatBubbleProps) {
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true, locale: vi });

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`} data-testid={`message-${isMine ? 'sent' : 'received'}`}>
      <div className={`max-w-[75%] space-y-1`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isMine
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          <p className="text-sm" data-testid="text-message">{message}</p>
        </div>
        <p className={`text-xs text-muted-foreground px-2 ${isMine ? 'text-right' : 'text-left'}`}>
          {timeAgo}
        </p>
      </div>
    </div>
  );
}
