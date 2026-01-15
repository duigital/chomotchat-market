import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import DistanceFilter from "@/components/DistanceFilter";
import CategoryFilter from "@/components/CategoryFilter";
import BottomNav from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WordPressCategory } from "@shared/schema";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

interface WordPressProduct {
  id: number;
  name: string;
  price: string;
  description: string;
  images: { src: string }[];
  meta_data: { key: string; value: string }[];
  categories: { id: number; name: string; slug: string }[];
}

interface ProductWithDistance {
  id: string;
  title: string;
  price: number;
  image: string;
  location: string;
  distance: number;
  latitude: number;
  longitude: number;
  sellerName: string;
  sellerRating: number;
  createdAt: Date;
  categoryIds: number[];
  categories: string[];
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { currentLanguage } = useLanguage();
  const [search, setSearch] = useState('');
  const [distance, setDistance] = useState(3);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState('위치를 가져오는 중...');
  const [currentCountryCode, setCurrentCountryCode] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Fetch WordPress categories
  const { data: categoriesResponse, error: categoriesError } = useQuery<{ success: boolean; categories: WordPressCategory[] }>({
    queryKey: ['/api/wordpress/categories'],
  });

  // Fetch WordPress products with language and country support
  const { data: wpResponse, isLoading: isLoadingProducts, error: productsError } = useQuery<{ success: boolean; products: WordPressProduct[] }>({
    queryKey: ['/api/wordpress/products', currentLanguage, currentCountryCode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentLanguage && currentLanguage !== 'vi') {
        params.append('lang', currentLanguage);
      }
      if (currentCountryCode) {
        params.append('country', currentCountryCode);
      }
      const url = params.toString() 
        ? `/api/wordpress/products?${params.toString()}`
        : `/api/wordpress/products`;
      console.log('[HomePage] Fetching products with URL:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Set all categories as selected by default when categories are loaded
  useEffect(() => {
    if (categoriesResponse?.categories && selectedCategories.length === 0) {
      setSelectedCategories(categoriesResponse.categories.map((cat) => cat.id));
    }
  }, [categoriesResponse]);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    console.log('[HomePage] getCurrentLocation 시작');
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      console.error('[HomePage] Geolocation 지원 안됨');
      setCurrentAddress('위치 서비스 지원 안됨');
      setIsLoadingLocation(false);
      return;
    }
    
    console.log('[HomePage] Geolocation API 호출 중...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('[HomePage] 위치 가져오기 성공:', position.coords);
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(location);
        
        // 즉시 좌표를 먼저 표시
        const coordsText = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
        setCurrentAddress(coordsText);
        console.log('[HomePage] 좌표 표시:', coordsText);
        
        // 주소 변환 시도
        console.log('[HomePage] 주소 변환 시도');
        try {
          await reverseGeocode(location);
          console.log('[HomePage] 주소 변환 성공');
        } catch (error) {
          console.error("[HomePage] 주소 변환 실패, 좌표 유지:", error);
        }
        
        setIsLoadingLocation(false);
        console.log('[HomePage] 위치 설정 완료');
      },
      (error) => {
        console.error('[HomePage] 위치 가져오기 오류:', error.code, error.message);
        setCurrentAddress('위치를 가져올 수 없음');
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    try {
      console.log('[HomePage] reverseGeocode 호출, 위치:', location);
      
      if (typeof google === 'undefined' || !google.maps) {
        console.warn('[HomePage] Google Maps가 로드되지 않음, 좌표 유지');
        return;
      }
      
      console.log('[HomePage] Google Maps Geocoder 사용');
      const geocoder = new google.maps.Geocoder();
      
      const result = await geocoder.geocode({
        location: { lat: location.lat, lng: location.lng },
        language: 'ko',
      });
      
      console.log('[HomePage] Geocoder 응답:', result);
      
      if (result.results && result.results.length > 0) {
        // Prefer road name address (street_address or route type) over lot number address
        const roadNameResult = result.results.find(r => 
          r.types.includes('street_address') || r.types.includes('route')
        );
        const selectedResult = roadNameResult || result.results[0];
        
        const formattedAddress = selectedResult.formatted_address;
        console.log('[HomePage] 도로명 주소 찾음:', formattedAddress);
        setCurrentAddress(formattedAddress);
        
        // Extract country code from address_components
        const addressComponents = selectedResult.address_components;
        const countryComponent = addressComponents?.find(
          (component) => component.types.includes('country')
        );
        if (countryComponent?.short_name) {
          console.log('[HomePage] 국가 코드 추출:', countryComponent.short_name);
          setCurrentCountryCode(countryComponent.short_name);
        }
      } else {
        console.warn('[HomePage] 주소를 찾을 수 없음');
      }
    } catch (error) {
      console.error("[HomePage] 주소 변환 오류:", error);
    }
  };

  // Transform WordPress products to our format with distance calculation
  const products: ProductWithDistance[] = (wpResponse?.products || [])
    .map((wpProduct: WordPressProduct) => {
      const latMeta = wpProduct.meta_data.find((m) => m.key === '_chomotchat_latitude');
      const lngMeta = wpProduct.meta_data.find((m) => m.key === '_chomotchat_longitude');
      const locationMeta = wpProduct.meta_data.find((m) => m.key === '_chomotchat_preferred_location');
      
      const latitude = latMeta ? parseFloat(latMeta.value) : NaN;
      const longitude = lngMeta ? parseFloat(lngMeta.value) : NaN;
      
      // Calculate distance only if both current location and product location are valid
      const hasValidLocation = !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0;
      const distanceKm = (currentLocation && hasValidLocation)
        ? calculateDistance(currentLocation.lat, currentLocation.lng, latitude, longitude)
        : NaN; // NaN indicates distance can't be calculated

      return {
        id: String(wpProduct.id),
        title: wpProduct.name,
        price: parseFloat(wpProduct.price) || 0,
        image: wpProduct.images[0]?.src || '',
        location: locationMeta?.value || (hasValidLocation ? 'Vị trí không xác định' : 'Không có vị trí'),
        distance: distanceKm,
        latitude: hasValidLocation ? latitude : 0,
        longitude: hasValidLocation ? longitude : 0,
        sellerName: 'product_' + wpProduct.id,
        sellerRating: 4.5,
        createdAt: new Date(),
        categoryIds: wpProduct.categories?.map((cat) => cat.id) || [],
        categories: wpProduct.categories?.map((cat) => cat.name) || [],
      };
    });

  // Apply filters
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(search.toLowerCase());
    
    // Only apply distance filter if:
    // 1. We have the user's current location
    // 2. The product has a valid location
    // 3. Distance was successfully calculated
    const matchesDistance = !currentLocation || isNaN(product.distance) || product.distance <= distance;
    
    // Category filter: if no categories selected or all selected, show all products
    // Otherwise, only show products that have at least one selected category
    const matchesCategory = selectedCategories.length === 0 || 
      selectedCategories.length === (categoriesResponse?.categories || []).length ||
      product.categoryIds.some((catId) => selectedCategories.includes(catId));
    
    return matchesSearch && matchesDistance && matchesCategory;
  });

  // Sort by distance (closest first), putting items without distance at the end
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // If both have valid distances, sort by distance
    if (!isNaN(a.distance) && !isNaN(b.distance)) {
      return a.distance - b.distance;
    }
    // Items without distance go to the end
    if (isNaN(a.distance)) return 1;
    if (isNaN(b.distance)) return -1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="flex items-center justify-between px-4 py-2 border-b border-card-border">
          <h1 className="text-lg font-semibold">Chomotchat</h1>
          <Header />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium truncate" data-testid="text-location">
                {currentAddress}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex-shrink-0"
              data-testid="button-refresh-location"
            >
              {isLoadingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </Button>
          </div>
          <SearchBar
            value={search}
            onChange={setSearch}
            onFilterClick={() => console.log('Filter clicked')}
          />
          <div className="flex items-center gap-2">
            <DistanceFilter selected={distance} onChange={setDistance} />
            {categoriesResponse?.categories && !categoriesError && (
              <CategoryFilter
                categories={categoriesResponse.categories}
                selectedCategories={selectedCategories}
                onChange={setSelectedCategories}
              />
            )}
          </div>
        </div>
      </header>

      <main className="p-4">
        {isLoadingProducts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : productsError ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-4">
            <p className="text-muted-foreground">Lỗi khi tải danh sách sản phẩm</p>
            <p className="text-sm text-destructive">
              {productsError instanceof Error ? productsError.message : '가져오기 실패'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-4" data-testid="text-product-count">
              {currentLanguage === 'ko' ? '상품 ' : currentLanguage === 'en' ? 'Found ' : 'Tìm thấy '}{sortedProducts.length}{currentLanguage === 'ko' ? '개 발견됨' : currentLanguage === 'en' ? 'products' : ' sản phẩm'}
            </h2>
            {sortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {search 
                    ? (currentLanguage === 'ko' ? '일치하는 상품 없음' : currentLanguage === 'en' ? 'No matching products' : 'Không tìm thấy sản phẩm phù hợp')
                    : (currentLanguage === 'ko' ? '상품 없음' : currentLanguage === 'en' ? 'No products' : 'Chưa có sản phẩm nào')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {sortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    {...product}
                    onClick={() => setLocation(`/product/${product.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
