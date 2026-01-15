import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  wordpressEmail: string | null;
  wordpressUserId: number | null;
}

export function Header() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading, isError } = useQuery<UserInfo>({
    queryKey: ["/api/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/logout"),
    onSuccess: async () => {
      // Clear all cached data
      queryClient.clear();
      
      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다",
      });
      
      // Navigate to home and force a page reload to ensure clean state
      setLocation("/");
      window.location.reload();
    },
    onError: (error) => {
      toast({
        title: "로그아웃 실패",
        description: error instanceof Error ? error.message : "로그아웃 중 오류가 발생했습니다",
        variant: "destructive",
      });
    },
  });

  const handleLoginClick = () => {
    setLocation("/login");
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const displayName = user?.displayName || user?.username || "사용자";
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />;
  }

  // Treat error state (401, etc.) as unauthenticated
  if (user && !isError) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7" data-testid="avatar-user">
          <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium" data-testid="text-display-name">
          {displayName}
        </span>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleLoginClick}
      variant="ghost"
      size="sm"
      data-testid="button-header-login"
    >
      <LogIn className="h-4 w-4 mr-2" />
      로그인
    </Button>
  );
}
