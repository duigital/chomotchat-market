import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ChatBubble from "@/components/ChatBubble";
import { ArrowLeft, Send, Loader2, WifiOff } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { type Message } from "@shared/schema";
import { Header } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import headphonesImg from '@assets/generated_images/Headphones_product_placeholder_06b07c41.png';

const mockMessages = [
  {
    id: '1',
    content: 'Xin chào! Sản phẩm còn không ạ?',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    isMine: false,
  },
  {
    id: '2',
    content: 'Dạ còn ạ! Bạn muốn xem thực tế không?',
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    isMine: true,
  },
  {
    id: '3',
    content: 'Có thể gặp ở khu vực Quận 1 được không?',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    isMine: false,
  },
  {
    id: '4',
    content: 'Được ạ! Bạn có thể vào ngày nào?',
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    isMine: true,
  },
];

const mockProduct = {
  title: 'Tai nghe Bluetooth Sony WH-1000XM4',
  price: 3500000,
  image: headphonesImg,
};

export default function ChatPage() {
  const [, params] = useRoute('/chat/:id');
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  
  const roomId = params?.id || '1';
  const currentUserId = 'user-demo-1'; // TODO: Replace with actual user ID from auth
  const otherUserId = 'user-demo-2'; // TODO: Get from chat room data

  // Fetch existing messages
  const { data: existingMessages, isLoading, error: queryError } = useQuery<Message[]>({
    queryKey: [`/api/messages/${roomId}`],
    enabled: !!roomId,
  });

  useEffect(() => {
    if (existingMessages && Array.isArray(existingMessages)) {
      setMessages(existingMessages);
    }
  }, [existingMessages]);

  const handleNewMessage = useCallback((newMessage: Message) => {
    setMessages((prev) => {
      // Avoid duplicates
      if (prev.find(m => m.id === newMessage.id)) {
        return prev;
      }
      return [...prev, newMessage];
    });
  }, []);

  const handleWebSocketError = useCallback((error: string) => {
    toast({
      title: "연결 오류",
      description: error,
      variant: "destructive",
    });
  }, [toast]);

  const { isConnected, sendMessage: sendWebSocketMessage, error: wsError } = useWebSocket({
    roomId,
    userId: currentUserId,
    onMessage: handleNewMessage,
    onError: handleWebSocketError,
  });

  const handleSend = () => {
    if (!message.trim()) return;
    
    if (!isConnected) {
      toast({
        title: "연결 끊김",
        description: "메시지를 보내려면 연결이 필요합니다.",
        variant: "destructive",
      });
      return;
    }
    
    const success = sendWebSocketMessage(message);
    if (success) {
      setMessage('');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="flex flex-col h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-card-border">
          <h1 className="text-lg font-semibold">Chomotchat</h1>
          <Header />
        </div>
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold" data-testid="text-seller">nguyen_van_a</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Hoạt동 5 phút trước</p>
              {!isConnected && (
                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  연결 끊김
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 border-b border-border">
        <Card className="p-3 hover-elevate cursor-pointer" onClick={() => setLocation('/product/1')} data-testid="card-product">
          <div className="flex gap-3">
            <img
              src={mockProduct.image}
              alt={mockProduct.title}
              className="w-16 h-16 object-cover rounded-md bg-muted"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-2">{mockProduct.title}</p>
              <p className="text-sm font-semibold text-primary">{formatPrice(mockProduct.price)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : queryError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">메시지를 불러올 수 없습니다</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">첫 메시지를 보내보세요</p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              message={msg.content}
              timestamp={new Date(msg.createdAt)}
              isMine={msg.senderId === currentUserId}
            />
          ))
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 border-t border-border p-4 bg-card z-40">
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tin nhắn..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            data-testid="input-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim()}
            data-testid="button-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
