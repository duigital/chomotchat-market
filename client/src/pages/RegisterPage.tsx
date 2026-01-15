import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/login')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">회원가입</h1>
          </div>
          <Header />
        </div>
      </header>

      <div className="flex-1 pb-16">
        <iframe
          src="https://chomotchat.com/wp-login.php?action=register"
          className="w-full h-full min-h-[calc(100vh-8rem)]"
          title="WordPress 회원가입"
          data-testid="iframe-register"
        />
      </div>

      <BottomNav />
    </div>
  );
}
