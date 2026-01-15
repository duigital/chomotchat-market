import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Star, Mail, User, LogOut, CheckCircle2, XCircle, ArrowLeft, MapPin, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  wordpressEmail: string | null;
  wordpressUserId: number | null;
  rating: number | null;
  reviewCount: number | null;
}

interface BillingAddress {
  country: string | null;
  state: string | null;
  city: string | null;
  address1: string | null;
  address2: string | null;
  postcode: string | null;
  phone: string | null;
}

interface UserLanguage {
  locale: string;
  languageCode: 'vi' | 'en' | 'ko';
}

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  VN: "베트남",
  KR: "한국",
  US: "미국",
  JP: "일본",
  CN: "중국",
  TH: "태국",
  SG: "싱가포르",
  MY: "말레이시아",
  ID: "인도네시아",
  PH: "필리핀",
};

// Language code to name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  vi: "베트남어",
  ko: "한국어",
  en: "영어",
};

export default function MyPage() {
  const [, setLocation] = useLocation();
  const { currentLanguage, setLanguage } = useLanguage();

  const { data: user, isLoading, error } = useQuery<UserInfo>({
    queryKey: ["/api/me"],
  });

  // Fetch billing address when user is loaded and has WordPress ID
  const { data: billingAddress } = useQuery<BillingAddress>({
    queryKey: ["/api/wordpress/customer/billing"],
    enabled: !!user?.wordpressUserId,
  });

  // Fetch user language preference from WordPress
  const { data: userLanguage } = useQuery<UserLanguage>({
    queryKey: ["/api/wordpress/user/language"],
    enabled: !!user?.wordpressUserId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-card border-b border-card-border">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">내 프로필</h1>
            </div>
            <Header />
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 bg-card border-b border-card-border">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">내 프로필</h1>
            </div>
            <Header />
          </div>
        </header>

        <div className="flex items-center justify-center p-4 mt-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>로그인이 필요합니다</CardTitle>
              <CardDescription>이 페이지를 보려면 먼저 로그인하세요</CardDescription>
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

  const isWordPressConnected = !!user.wordpressUserId;
  const displayName = user.displayName || user.username;
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">내 프로필</h1>
          </div>
          <Header />
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{displayName}</CardTitle>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">{user.rating?.toFixed(1) || "0.0"}</span>
                <span className="text-sm text-muted-foreground">
                  ({user.reviewCount || 0} 리뷰)
                </span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">계정 정보</h3>
              
              {user.wordpressEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.wordpressEmail}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>사용자 ID: {user.id}</span>
              </div>
            </div>

            {isWordPressConnected && billingAddress && (billingAddress.country || billingAddress.state || billingAddress.city) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">청구 주소</h3>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      {billingAddress.country && (
                        <p data-testid="text-billing-country">
                          <span className="text-muted-foreground">국가:</span>{" "}
                          {COUNTRY_NAMES[billingAddress.country] || billingAddress.country}
                        </p>
                      )}
                      {billingAddress.state && (
                        <p data-testid="text-billing-state">
                          <span className="text-muted-foreground">주/도:</span>{" "}
                          {billingAddress.state}
                        </p>
                      )}
                      {billingAddress.city && (
                        <p data-testid="text-billing-city">
                          <span className="text-muted-foreground">도시:</span>{" "}
                          {billingAddress.city}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">WordPress 연동</h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isWordPressConnected ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm">연동됨</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-sm">연동되지 않음</span>
                    </>
                  )}
                </div>
                {isWordPressConnected ? (
                  <Badge variant="secondary" data-testid="badge-wordpress-connected">
                    WordPress ID: {user.wordpressUserId}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => window.location.href = "/auth/wordpress"}
                    data-testid="button-connect-wordpress"
                  >
                    WordPress 연동하기
                  </Button>
                )}
              </div>

              {isWordPressConnected && (
                <p className="text-sm text-muted-foreground">
                  WordPress 계정과 연동되어 있어 제품을 등록하고 판매할 수 있습니다.
                </p>
              )}
            </div>

            {isWordPressConnected && userLanguage && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold">언어 설정</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-user-language">
                        WordPress 언어: {LANGUAGE_NAMES[userLanguage.languageCode] || userLanguage.locale}
                      </span>
                    </div>
                    <Badge variant="secondary" data-testid="badge-current-language">
                      앱 언어: {LANGUAGE_NAMES[currentLanguage]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    앱 언어는 WordPress 프로필 설정에 따라 자동으로 적용됩니다.
                  </p>
                </div>
              </>
            )}

            <Separator />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = "/api/logout";
              }}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setLocation("/")}
            data-testid="button-go-home"
          >
            홈으로 돌아가기
          </Button>
        </div>
        </div>
        <BottomNav />
    </div>
  );
}
