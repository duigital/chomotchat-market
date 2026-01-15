import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { LoadScript } from "@react-google-maps/api";
import { LanguageProvider } from "@/contexts/LanguageContext";
import LanguageFAB from "@/components/LanguageFAB";
import HomePage from "@/pages/HomePage";
import ProductDetailPage from "@/pages/ProductDetailPage";
import ChatPage from "@/pages/ChatPage";
import ChatListPage from "@/pages/ChatListPage";
import SellPage from "@/pages/SellPage";
import LoginPage from "@/pages/LoginPage";
import MyPage from "@/pages/MyPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/product/:id" component={ProductDetailPage} />
      <Route path="/chat/:id" component={ChatPage} />
      <Route path="/chat" component={ChatListPage} />
      <Route path="/chats" component={ChatListPage} />
      <Route path="/sell" component={SellPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/my-page" component={MyPage} />
      <Route path="/my" component={MyPage} />
      <Route path="/profile" component={MyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <QueryClientProvider client={queryClient}>
      <LoadScript 
        googleMapsApiKey={apiKey || ""}
        libraries={["marker"]}
      >
        <LanguageProvider>
          <Toaster />
          <LanguageFAB />
          <Router />
        </LanguageProvider>
      </LoadScript>
    </QueryClientProvider>
  );
}

export default App;
