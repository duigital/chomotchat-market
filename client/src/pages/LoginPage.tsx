import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Loader2, Info, Home, UserPlus } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("duigital@gmail.com");
  const [password, setPassword] = useState("F4Zt obW2 RcU1 1M7q qBUs VyTs");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("[LoginPage] handleLogin 실행됨");
    console.log("[LoginPage] username:", username);
    console.log("[LoginPage] password length:", password.length);
    
    if (!username || !password) {
      console.log("[LoginPage] 입력 유효성 검사 실패");
      toast({
        title: "입력 오류",
        description: "아이디와 Application Password를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    console.log("[LoginPage] 로그인 요청 시작");
    setIsLoading(true);

    try {
      console.log("[LoginPage] fetch 호출 중...");
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      console.log("[LoginPage] 응답 받음:", response.status);
      const data = await response.json();
      console.log("[LoginPage] 응답 데이터:", data);

      if (!response.ok) {
        throw new Error(data.error || "로그인 실패");
      }

      console.log("[LoginPage] 로그인 성공!");
      toast({
        title: "로그인 성공",
        description: `${data.user.username}님 환영합니다!`,
      });

      console.log("[LoginPage] 홈페이지로 리다이렉트");
      // Redirect to home page
      setLocation("/");
    } catch (error) {
      console.error("[LoginPage] Login error:", error);
      toast({
        title: "로그인 실패",
        description: error instanceof Error ? error.message : "아이디 또는 비밀번호가 올바르지 않습니다",
        variant: "destructive",
      });
    } finally {
      console.log("[LoginPage] isLoading = false");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-home"
            >
              <Home className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Chomotchat</h1>
          </div>
          <Header />
        </div>
      </header>

      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md mt-8 mb-8">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-center">Chomotchat에 로그인</CardTitle>
          <CardDescription className="text-center">
            WordPress Application Password로 로그인하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4" data-testid="alert-app-password-info">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Application Password가 필요합니다</strong>
              <br />
              WordPress 관리자 → 사용자 → 프로필 → Application Passwords에서 생성하세요
            </AlertDescription>
          </Alert>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">WordPress 아이디</Label>
              <Input
                id="username"
                type="text"
                placeholder="예: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                data-testid="input-username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Application Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
              />
              <p className="text-xs text-muted-foreground">
                WordPress에서 생성한 Application Password를 입력하세요
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  로그인
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => setLocation('/register')}
              data-testid="button-register"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              회원가입
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Application Password 생성 방법:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>WordPress 관리자 로그인</li>
              <li>사용자 → 프로필 이동</li>
              <li>하단 "Application Passwords" 섹션 찾기</li>
              <li>앱 이름 입력 후 "Add New Application Password" 클릭</li>
              <li>생성된 비밀번호를 복사해서 여기에 입력</li>
            </ol>
          </div>
        </CardContent>
      </Card>
      </div>
      <BottomNav />
    </div>
  );
}
