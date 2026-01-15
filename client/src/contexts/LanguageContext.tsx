import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

type LanguageCode = 'vi' | 'en' | 'ko';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  cycleLanguage: () => void;
  isLoadingLanguage: boolean;
}

interface UserLanguage {
  locale: string;
  languageCode: LanguageCode;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGES: LanguageCode[] = ['vi', 'en', 'ko'];

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('vi');
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch user's WordPress language preference
  const { data: userLanguage, isLoading } = useQuery<UserLanguage>({
    queryKey: ["/api/wordpress/user/language"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Set language from WordPress preference when loaded
  useEffect(() => {
    if (!hasInitialized && userLanguage?.languageCode) {
      console.log('[LanguageContext] Setting language from WordPress:', userLanguage.languageCode);
      setCurrentLanguage(userLanguage.languageCode);
      setHasInitialized(true);
    }
  }, [userLanguage, hasInitialized]);

  const cycleLanguage = () => {
    const currentIndex = LANGUAGES.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    setCurrentLanguage(LANGUAGES[nextIndex]);
  };

  return (
    <LanguageContext.Provider value={{ 
      currentLanguage, 
      setLanguage: setCurrentLanguage, 
      cycleLanguage,
      isLoadingLanguage: isLoading
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
