import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import SellerInfo from "@/components/SellerInfo";
import { Header } from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { ArrowLeft, MapPin, Clock, Calendar, Loader2, Globe, Share2, Edit2 } from "lucide-react";

interface UserInfo {
  id: string;
  username: string;
  wordpressUserId: number | null;
}

interface WordPressProduct {
  id: number;
  name: string;
  price: string;
  description: string;
  short_description: string;
  images: { src: string }[];
  categories: { id: number; name: string }[];
  meta_data: { key: string; value: string }[];
  date_created: string;
}

interface Translation {
  id: number;
  name: string;
  available: boolean;
}

interface TranslationsResponse {
  success: boolean;
  translations: { [key: string]: Translation };
}

const LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
] as const;

// Flag SVG components to avoid using emojis
const FlagUS = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-5 h-3.5 rounded-sm">
    <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
    <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#bd3d44"/>
      <path d="M0,3.46 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 zm0,4.61 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 z" fill="#fff"/>
      <path d="M0,0 v16.15 h24 v-16.15 z" fill="#192f5d"/>
    </g>
  </svg>
);

const FlagKR = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className="w-5 h-3.5 rounded-sm">
    <rect width="60" height="40" fill="#fff"/>
    <circle cx="30" cy="20" r="10" fill="#cd2e3a"/>
    <path d="M30,10 a10,10 0 0,0 0,20 a5,5 0 0,0 0,-10 a5,5 0 0,1 0,-10" fill="#0047a0"/>
  </svg>
);

const FlagVN = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className="w-5 h-3.5 rounded-sm">
    <rect width="60" height="40" fill="#da251d"/>
    <polygon points="30,8 33.5,18.5 44,18.5 35.5,24.5 39,35 30,28 21,35 24.5,24.5 16,18.5 26.5,18.5" fill="#ffff00"/>
  </svg>
);

const FlagComponents: { [key: string]: () => JSX.Element } = {
  en: FlagUS,
  ko: FlagKR,
  vi: FlagVN,
};

export default function ProductDetailPage() {
  const [match, params] = useRoute('/product/:id');
  const [, setLocation] = useLocation();
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const productId = params?.id;

  // Fetch current user info
  const { data: currentUser } = useQuery<UserInfo>({
    queryKey: ['/api/me'],
    retry: false,
  });

  // Fetch single product from WordPress with WPML language support
  const { data: wpResponse, isLoading, error } = useQuery<{ success: boolean; product: WordPressProduct }>({
    queryKey: ['/api/wordpress/products', productId, selectedLang],
    queryFn: async () => {
      const url = selectedLang 
        ? `/api/wordpress/products/${productId}?lang=${selectedLang}`
        : `/api/wordpress/products/${productId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch product');
      return response.json();
    },
    enabled: !!productId,
  });

  // Fetch available translations from WPML
  const { data: translationsResponse } = useQuery<TranslationsResponse>({
    queryKey: ['/api/wordpress/products', productId, 'translations'],
    queryFn: async () => {
      const response = await fetch(`/api/wordpress/products/${productId}/translations`);
      if (!response.ok) throw new Error('Failed to fetch translations');
      return response.json();
    },
    enabled: !!productId,
  });

  const availableLanguages = translationsResponse?.translations 
    ? Object.entries(translationsResponse.translations)
        .filter(([_, trans]) => trans.available)
        .map(([code]) => code)
    : [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

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
              <h1 className="font-semibold">Chi tiết sản phẩm</h1>
            </div>
            <Header />
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  const product = wpResponse?.product;

  if (error || !wpResponse?.success) {
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
              <h1 className="font-semibold">Chi tiết sản phẩm</h1>
            </div>
            <Header />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-4">
          <p className="text-muted-foreground">
            {error ? 'Lỗi khi tải sản phẩm' : 'Không tìm thấy sản phẩm'}
          </p>
          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Vui lòng thử lại sau'}
            </p>
          )}
          <Button onClick={() => setLocation('/')} variant="outline">
            Quay lại trang chủ
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!product) {
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
              <h1 className="font-semibold">Chi tiết sản phẩm</h1>
            </div>
            <Header />
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Không tìm thấy sản phẩm</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Extract metadata
  const latMeta = product.meta_data.find((m) => m.key === '_chomotchat_latitude');
  const lngMeta = product.meta_data.find((m) => m.key === '_chomotchat_longitude');
  const locationMeta = product.meta_data.find((m) => m.key === '_chomotchat_preferred_location');
  const timeMeta = product.meta_data.find((m) => m.key === '_chomotchat_preferred_time');
  const usageMeta = product.meta_data.find((m) => m.key === '_chomotchat_usage_period');
  const categoryMeta = product.meta_data.find((m) => m.key === '_chomotchat_category');
  const authorIdMeta = product.meta_data.find((m) => m.key === '_chomotchat_author_id');
  const authorWpIdMeta = product.meta_data.find((m) => m.key === '_chomotchat_author_wp_id');

  // Check if current user can edit this product by verifying ownership
  const productAuthorId = authorIdMeta?.value;
  const productAuthorWpId = authorWpIdMeta?.value;
  
  // Allow editing if:
  // 1. User is logged in AND is the owner (matching author_id or author_wp_id)
  // 2. User is logged in AND the product has no ownership metadata (legacy product)
  const hasOwnershipMetadata = productAuthorId || productAuthorWpId;
  const isOwner = (productAuthorId && productAuthorId === currentUser?.id) ||
                  (productAuthorWpId && currentUser?.wordpressUserId && productAuthorWpId === String(currentUser.wordpressUserId));
  
  const canEdit = Boolean(currentUser && (!hasOwnershipMetadata || isOwner));

  // Handle edit button click
  const handleEdit = () => {
    setLocation(`/sell?edit=${productId}`);
  };

  const latitude = latMeta ? parseFloat(latMeta.value) : null;
  const longitude = lngMeta ? parseFloat(lngMeta.value) : null;
  const preferredLocation = locationMeta?.value || 'Không xác định';
  const preferredTime = timeMeta?.value || 'Linh hoạt';
  const usagePeriod = usageMeta?.value || 'Không xác định';
  const category = categoryMeta?.value || product.categories[0]?.name || 'Khác';

  const price = parseFloat(product.price) || 0;

  // Handle share functionality
  const handleShare = async () => {
    const shareData = {
      title: product.name,
      text: `${product.name} - ${formatPrice(price)}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('링크가 클립보드에 복사되었습니다');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('공유 실패:', error);
      }
    }
  };

  // Language selector component
  const LanguageSelector = () => {
    // Show all language buttons, disable unavailable ones
    const hasTranslations = availableLanguages.length > 0;
    
    return (
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {LANGUAGES.map((lang) => {
            const isAvailable = !hasTranslations || availableLanguages.includes(lang.code);
            const isSelected = selectedLang === lang.code || (!selectedLang && lang.code === 'vi');
            const FlagComponent = FlagComponents[lang.code];

            return (
              <Button
                key={lang.code}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`px-2 h-8 gap-1.5 ${!isAvailable ? 'bg-black/50 opacity-50 cursor-not-allowed hover:bg-black/50 active:bg-black/50' : ''}`}
                onClick={() => isAvailable && setSelectedLang(lang.code)}
                disabled={!isAvailable}
                data-testid={`button-lang-${lang.code}`}
                title={lang.name}
              >
                <FlagComponent />
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={handleEdit}
              data-testid="button-edit-product"
              title="수정하기"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={handleShare}
            data-testid="button-share"
            title="공유하기"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
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
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Chi tiết sản phẩm</h1>
          </div>
          <Header />
        </div>
      </header>

      <main>
        {product.images && product.images.length > 0 ? (
          <div className="relative bg-muted aspect-square">
            <img
              src={product.images[currentImage]?.src}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                {product.images.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImage
                        ? 'bg-white w-6'
                        : 'bg-white/60'
                    }`}
                    onClick={() => setCurrentImage(index)}
                    data-testid={`button-image-${index}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-muted aspect-square flex items-center justify-center">
            <p className="text-muted-foreground">Không có hình ảnh</p>
          </div>
        )}

        <div className="p-4 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h2 className="text-2xl font-bold flex-1" data-testid="text-title">
                {product.name}
              </h2>
              <LanguageSelector />
            </div>
            {product.categories && product.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {product.categories.map((cat) => (
                  <Badge key={cat.id} variant="outline" data-testid={`badge-category-${cat.id}`}>
                    {cat.name}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-3xl font-bold text-primary" data-testid="text-price">
              {formatPrice(price)}
            </p>
          </div>

          {/* ID 확인 영역 */}
          <Card className="p-3 bg-muted/50">
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">ID 확인</h4>
            <div className="space-y-1 text-xs">
              {productAuthorId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">등록자 ID:</span>
                  <span className="font-mono" data-testid="text-author-id">{productAuthorId}</span>
                </div>
              )}
              {productAuthorWpId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">등록자 WP ID:</span>
                  <span className="font-mono" data-testid="text-author-wp-id">{productAuthorWpId}</span>
                </div>
              )}
              {!productAuthorId && !productAuthorWpId && (
                <div className="text-muted-foreground italic">소유권 정보 없음 (레거시 상품)</div>
              )}
              <div className="border-t border-border my-2" />
              {currentUser ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">로그인 ID:</span>
                    <span className="font-mono" data-testid="text-current-user-id">{currentUser.id}</span>
                  </div>
                  {currentUser.wordpressUserId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">로그인 WP ID:</span>
                      <span className="font-mono" data-testid="text-current-user-wp-id">{currentUser.wordpressUserId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">로그인 사용자:</span>
                    <span data-testid="text-current-username">{currentUser.username}</span>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground italic">로그인되지 않음</div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <SellerInfo
              username={`product_${product.id}`}
              rating={4.5}
              reviewCount={10}
              verified={true}
            />
          </Card>

          <div>
            <h3 className="font-semibold mb-3">Thông tin sản phẩm</h3>
            <div className="space-y-3">
              {usagePeriod && usagePeriod !== 'Không xác định' && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Thời gian sử dụng</p>
                    <p className="font-medium" data-testid="text-usage">{usagePeriod}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Địa điểm gặp mặt</p>
                  <p className="font-medium" data-testid="text-preferred-location">
                    {preferredLocation}
                  </p>
                  {latitude && longitude && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
              {preferredTime && preferredTime !== 'Linh hoạt' && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Thời gian gặp mặt</p>
                    <p className="font-medium" data-testid="text-preferred-time">
                      {preferredTime}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Mô tả</h3>
              <div 
                className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none" 
                data-testid="text-description"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-card-border p-4 z-40">
        {canEdit ? (
          <Button
            className="w-full"
            size="lg"
            onClick={() => setLocation(`/sell?edit=${product.id}`)}
            data-testid="button-edit-product-bottom"
          >
            <Edit2 className="w-5 h-5 mr-2" />
            Sửa sản phẩm
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            onClick={() => setLocation(`/chat/${product.id}`)}
            data-testid="button-chat"
          >
            Chat với người bán
          </Button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
