import { useState } from "react";
import { FlagComponents } from "@/components/FlagComponents";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageFAB() {
  const { currentLanguage, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const FlagComponent = FlagComponents[currentLanguage];

  const handleLanguageSelect = (lang: 'vi' | 'en' | 'ko') => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40">
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-card border border-card-border rounded-lg shadow-lg p-2 flex flex-col gap-2">
          <button
            onClick={() => handleLanguageSelect('vi')}
            className="flex items-center justify-center w-12 h-10 bg-secondary hover:bg-secondary/80 rounded transition-colors"
            title="Tiếng Việt"
            data-testid="button-lang-dropdown-vi"
          >
            {FlagComponents.vi()}
          </button>
          <button
            onClick={() => handleLanguageSelect('en')}
            className="flex items-center justify-center w-12 h-10 bg-secondary hover:bg-secondary/80 rounded transition-colors"
            title="English"
            data-testid="button-lang-dropdown-en"
          >
            {FlagComponents.en()}
          </button>
          <button
            onClick={() => handleLanguageSelect('ko')}
            className="flex items-center justify-center w-12 h-10 bg-secondary hover:bg-secondary/80 rounded transition-colors"
            title="한국어"
            data-testid="button-lang-dropdown-ko"
          >
            {FlagComponents.ko()}
          </button>
        </div>
      )}

      {/* Main FAB button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 active:bg-primary/80 flex items-center justify-center transition-all"
        data-testid="button-language-fab"
        title="베트남어 (터치하여 언어 변경)"
      >
        <FlagComponent />
      </button>
    </div>
  );
}
