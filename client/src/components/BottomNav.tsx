import { Home, Plus, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function BottomNav() {
  const [location] = useLocation();
  const { currentLanguage } = useLanguage();

  const labels: { [key: string]: { [key: string]: string } } = {
    vi: { home: 'Trang chủ', sell: 'Đăng bán', chat: 'Tin nhắn', profile: 'Tài khoản' },
    en: { home: 'Home', sell: 'Sell', chat: 'Messages', profile: 'My Account' },
    ko: { home: '홈', sell: '판매', chat: '메시지', profile: '계정' },
  };

  const currentLabels = labels[currentLanguage] || labels.vi;

  const navItems = [
    { icon: Home, label: currentLabels.home, path: '/', testId: 'nav-home' },
    { icon: Plus, label: currentLabels.sell, path: '/sell', testId: 'nav-sell' },
    { icon: MessageCircle, label: currentLabels.chat, path: '/chat', testId: 'nav-chat' },
    { icon: User, label: currentLabels.profile, path: '/profile', testId: 'nav-profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ icon: Icon, label, path, testId }) => {
          const isActive = location === path;
          return (
            <Link key={path} href={path}>
              <button
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg min-w-[4rem] hover-elevate ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={testId}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
