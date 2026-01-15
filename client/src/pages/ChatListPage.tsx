import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  wordpressEmail: string | null;
  wordpressUserId: number | null;
}

interface ChatRoom {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string | null;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export default function ChatListPage() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading: userLoading } = useQuery<UserInfo>({
    queryKey: ["/api/me"],
  });

  const { data: chatRooms, isLoading: chatsLoading } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat-rooms"],
    enabled: !!user,
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">채팅</h1>
            </div>
            <Header />
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">채팅</h1>
            </div>
            <Header />
          </div>
        </div>
        
        <div className="flex items-center justify-center p-4 mt-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>로그인이 필요합니다</CardTitle>
              <CardDescription>채팅을 보려면 먼저 로그인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full"
                data-testid="button-go-login"
              >
                로그인하러 가기
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">채팅</h1>
              <p className="text-sm text-muted-foreground">
                {chatRooms?.length || 0}개의 대화
              </p>
            </div>
          </div>
          <Header />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {chatsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 bg-muted rounded-md" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !chatRooms || chatRooms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">채팅이 없습니다</p>
              <p className="text-sm text-muted-foreground mb-4">
                상품 페이지에서 판매자에게 문의하세요
              </p>
              <Button onClick={() => setLocation("/")} data-testid="button-browse-products">
                상품 둘러보기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chatRooms.map((room) => {
              const isCurrentUserBuyer = room.buyerId === user.id;
              const otherUserName = isCurrentUserBuyer ? room.sellerName : room.buyerName;
              const initials = otherUserName
                .split(" ")
                .map(n => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card
                  key={room.id}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => setLocation(`/chat/${room.id}`)}
                  data-testid={`chat-room-${room.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={room.productImage || "/placeholder-product.png"}
                          alt={room.productTitle}
                          className="h-16 w-16 object-cover rounded-md"
                        />
                        {room.unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs"
                          >
                            {room.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 flex-shrink-0">
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-sm truncate">{otherUserName}</p>
                          </div>
                          {room.lastMessageAt && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(room.lastMessageAt), {
                                addSuffix: true,
                                locale: ko,
                              })}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm font-medium truncate mb-1">{room.productTitle}</p>
                        
                        {room.lastMessage ? (
                          <p className="text-sm text-muted-foreground truncate">
                            {room.lastMessage}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            메시지 없음
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
