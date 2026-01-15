import { useState, useRef, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, MapPin, Upload, X, Loader2, Camera, Image as ImageIcon } from "lucide-react";
import LocationPicker from "@/components/LocationPicker";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import BottomNav from "@/components/BottomNav";

interface WordPressProduct {
  id: number;
  name: string;
  price: string;
  description: string;
  images: { id: number; src: string }[];
  meta_data: { key: string; value: string }[];
}

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
}

// Language definitions
const LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
] as const;

type LanguageCode = typeof LANGUAGES[number]['code'];

// Flag SVG components
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

// Multilingual UI translations
const translations: Record<LanguageCode, {
  pageTitle: string;
  step1Title: string;
  step2Title: string;
  step3Title: string;
  step4Title: string;
  takePhoto: string;
  gallery: string;
  uploading: string;
  maxPhotos: string;
  title: string;
  titlePlaceholder: string;
  category: string;
  categoryPlaceholder: string;
  loadingCategories: string;
  noCategories: string;
  price: string;
  pricePlaceholder: string;
  usagePeriod: string;
  usagePlaceholder: string;
  meetingLocation: string;
  locationPlaceholder: string;
  meetingTime: string;
  timePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  continue: string;
  submit: string;
  submitting: string;
  selectLanguage: string;
  missingInfo: string;
  missingInfoDesc: string;
  missingImage: string;
  missingImageDesc: string;
  uploadSuccess: string;
  uploadSuccessDesc: string;
  uploadFailed: string;
  fileTooLarge: string;
  fileTooLargeDesc: string;
  invalidFileType: string;
  invalidFileTypeDesc: string;
  submitSuccess: string;
  submitSuccessDesc: string;
  submitFailed: string;
  step3Required: string;
  step3RequiredDesc: string;
}> = {
  vi: {
    pageTitle: "Đăng tin bán",
    step1Title: "Chọn vị trí",
    step2Title: "Hình ảnh sản phẩm",
    step3Title: "Thông tin sản phẩm",
    step4Title: "Thông tin bổ sung",
    takePhoto: "Chụp ảnh",
    gallery: "Thư viện",
    uploading: "Đang tải lên...",
    maxPhotos: "Tối đa 5 ảnh. Ảnh đầu tiên sẽ là ảnh đại diện",
    title: "Tiêu đề",
    titlePlaceholder: "VD: Tai nghe Bluetooth Sony WH-1000XM4",
    category: "Danh mục",
    categoryPlaceholder: "Chọn danh mục",
    loadingCategories: "Đang tải danh mục...",
    noCategories: "Không có danh mục",
    price: "Giá bán (VNĐ)",
    pricePlaceholder: "3500000",
    usagePeriod: "Thời gian sử dụng",
    usagePlaceholder: "VD: 6 tháng",
    meetingLocation: "Địa điểm gặp mặt mong muốn",
    locationPlaceholder: "VD: Quận 1, TP.HCM",
    meetingTime: "Thời gian gặp mặt mong muốn",
    timePlaceholder: "VD: Chiều thứ 7 hoặc Chủ nhật",
    description: "Mô tả chi tiết",
    descriptionPlaceholder: "Mô tả tình trạng, lý do bán, v.v...",
    continue: "Tiếp tục",
    submit: "Đăng tin",
    submitting: "Đang đăng tin...",
    selectLanguage: "Chọn ngôn ngữ đăng tin",
    missingInfo: "Thiếu thông tin",
    missingInfoDesc: "Vui lòng điền đầy đủ thông tin bắt buộc",
    missingImage: "Thiếu hình ảnh",
    missingImageDesc: "Vui lòng thêm ít nhất 1 hình ảnh",
    uploadSuccess: "Tải lên thành công",
    uploadSuccessDesc: "Hình ảnh đã được tải lên",
    uploadFailed: "Tải lên thất bại",
    fileTooLarge: "Tệp quá lớn",
    fileTooLargeDesc: "Kích thước hình ảnh tối đa là 5MB",
    invalidFileType: "Loại tệp không hợp lệ",
    invalidFileTypeDesc: "Chỉ chấp nhận tệp hình ảnh",
    submitSuccess: "Đăng tin thành công!",
    submitSuccessDesc: "Sản phẩm của bạn đã được đăng",
    submitFailed: "Đăng tin thất bại",
    step3Required: "Thiếu thông tin bắt buộc",
    step3RequiredDesc: "Vui lòng nhập tiêu đề, chọn danh mục và nhập giá bán",
  },
  en: {
    pageTitle: "Post for Sale",
    step1Title: "Select Location",
    step2Title: "Product Images",
    step3Title: "Product Information",
    step4Title: "Additional Information",
    takePhoto: "Take Photo",
    gallery: "Gallery",
    uploading: "Uploading...",
    maxPhotos: "Max 5 photos. First photo will be the main image",
    title: "Title",
    titlePlaceholder: "E.g.: Sony WH-1000XM4 Bluetooth Headphones",
    category: "Category",
    categoryPlaceholder: "Select category",
    loadingCategories: "Loading categories...",
    noCategories: "No categories",
    price: "Price (VND)",
    pricePlaceholder: "3500000",
    usagePeriod: "Usage Period",
    usagePlaceholder: "E.g.: 6 months",
    meetingLocation: "Preferred Meeting Location",
    locationPlaceholder: "E.g.: District 1, HCMC",
    meetingTime: "Preferred Meeting Time",
    timePlaceholder: "E.g.: Saturday afternoon or Sunday",
    description: "Detailed Description",
    descriptionPlaceholder: "Describe condition, reason for selling, etc...",
    continue: "Continue",
    submit: "Post",
    submitting: "Posting...",
    selectLanguage: "Select listing language",
    missingInfo: "Missing Information",
    missingInfoDesc: "Please fill in all required fields",
    missingImage: "Missing Image",
    missingImageDesc: "Please add at least 1 image",
    uploadSuccess: "Upload Successful",
    uploadSuccessDesc: "Image has been uploaded",
    uploadFailed: "Upload Failed",
    fileTooLarge: "File Too Large",
    fileTooLargeDesc: "Image size must be under 5MB",
    invalidFileType: "Invalid File Type",
    invalidFileTypeDesc: "Only image files are accepted",
    submitSuccess: "Posted Successfully!",
    submitSuccessDesc: "Your product has been listed",
    submitFailed: "Failed to Post",
    step3Required: "Required Fields Missing",
    step3RequiredDesc: "Please enter title, select category, and enter price",
  },
  ko: {
    pageTitle: "판매 등록",
    step1Title: "위치 선택",
    step2Title: "상품 이미지",
    step3Title: "상품 정보",
    step4Title: "추가 정보",
    takePhoto: "사진 촬영",
    gallery: "갤러리",
    uploading: "업로드 중...",
    maxPhotos: "최대 5장. 첫 번째 사진이 대표 이미지가 됩니다",
    title: "제목",
    titlePlaceholder: "예: Sony WH-1000XM4 블루투스 헤드폰",
    category: "카테고리",
    categoryPlaceholder: "카테고리 선택",
    loadingCategories: "카테고리 불러오는 중...",
    noCategories: "카테고리 없음",
    price: "판매가 (VND)",
    pricePlaceholder: "3500000",
    usagePeriod: "사용 기간",
    usagePlaceholder: "예: 6개월",
    meetingLocation: "거래 희망 장소",
    locationPlaceholder: "예: 1군, 호치민",
    meetingTime: "거래 희망 시간",
    timePlaceholder: "예: 토요일 오후 또는 일요일",
    description: "상세 설명",
    descriptionPlaceholder: "상태, 판매 이유 등을 설명해주세요...",
    continue: "다음",
    submit: "등록하기",
    submitting: "등록 중...",
    selectLanguage: "등록 언어 선택",
    missingInfo: "정보 누락",
    missingInfoDesc: "필수 정보를 모두 입력해주세요",
    missingImage: "이미지 누락",
    missingImageDesc: "최소 1장의 이미지를 추가해주세요",
    uploadSuccess: "업로드 성공",
    uploadSuccessDesc: "이미지가 업로드되었습니다",
    uploadFailed: "업로드 실패",
    fileTooLarge: "파일 크기 초과",
    fileTooLargeDesc: "이미지 크기는 5MB 이하여야 합니다",
    invalidFileType: "잘못된 파일 형식",
    invalidFileTypeDesc: "이미지 파일만 업로드 가능합니다",
    submitSuccess: "등록 완료!",
    submitSuccessDesc: "상품이 등록되었습니다",
    submitFailed: "등록 실패",
    step3Required: "필수 정보 누락",
    step3RequiredDesc: "제목, 카테고리, 가격을 모두 입력해주세요",
  },
};

export default function SellPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [step, setStep] = useState(1);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('vi');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    price: '',
    usagePeriod: '',
    preferredLocation: '',
    preferredTime: '',
    description: '',
    latitude: 10.7769,
    longitude: 106.7009,
    countryCode: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [wordpressMediaIds, setWordpressMediaIds] = useState<(number | null)[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Parse edit product ID from URL query params
  const editProductId = new URLSearchParams(searchString).get('edit');
  const isEditMode = !!editProductId;

  // Current language translations
  const t = translations[selectedLang];

  // Fetch WordPress categories
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery<{ categories: WordPressCategory[] }>({
    queryKey: ['/api/wordpress/categories'],
  });

  const categories = categoriesData?.categories.map(cat => cat.name) || [];

  // Fetch existing product data in edit mode
  useEffect(() => {
    if (editProductId) {
      setIsLoadingProduct(true);
      fetch(`/api/wordpress/products/${editProductId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.product) {
            const product = data.product as WordPressProduct;
            
            // Extract metadata
            const latMeta = product.meta_data?.find(m => m.key === '_chomotchat_latitude');
            const lngMeta = product.meta_data?.find(m => m.key === '_chomotchat_longitude');
            const locationMeta = product.meta_data?.find(m => m.key === '_chomotchat_preferred_location');
            const timeMeta = product.meta_data?.find(m => m.key === '_chomotchat_preferred_time');
            const usageMeta = product.meta_data?.find(m => m.key === '_chomotchat_usage_period');
            const categoryMeta = product.meta_data?.find(m => m.key === '_chomotchat_category');
            const countryMeta = product.meta_data?.find(m => m.key === '_chomotchat_country');

            // Extract plain text from HTML description
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = product.description || '';
            const descriptionText = tempDiv.textContent || tempDiv.innerText || '';

            // Get category from metadata or WooCommerce categories
            const productCategory = categoryMeta?.value || 
              (data.product.categories && data.product.categories[0]?.name) || '';

            setFormData({
              title: product.name || '',
              category: productCategory,
              price: product.price || '',
              usagePeriod: usageMeta?.value || '',
              preferredLocation: locationMeta?.value || '',
              preferredTime: timeMeta?.value || '',
              description: descriptionText.substring(0, 500),
              latitude: latMeta ? parseFloat(latMeta.value) : 10.7769,
              longitude: lngMeta ? parseFloat(lngMeta.value) : 106.7009,
              countryCode: countryMeta?.value || '',
            });

            console.log('[SellPage] Category loaded:', productCategory);

            // Set images
            if (product.images && product.images.length > 0) {
              setImages(product.images.map(img => img.src));
              setWordpressMediaIds(product.images.map(img => img.id));
            }

            console.log('[SellPage] Loaded product for editing:', product.id);
          }
        })
        .catch(err => console.error('[SellPage] Error loading product:', err))
        .finally(() => setIsLoadingProduct(false));
    }
  }, [editProductId]);

  // Language Selector Component
  const LanguageSelector = () => (
    <Card className="p-4 mb-4">
      <p className="text-sm font-medium mb-3">{t.selectLanguage}</p>
      <div className="flex items-center gap-2">
        {LANGUAGES.map((lang) => {
          const isSelected = selectedLang === lang.code;
          const FlagComponent = FlagComponents[lang.code];

          return (
            <Button
              key={lang.code}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className="px-3 h-9 gap-2"
              onClick={() => setSelectedLang(lang.code)}
              data-testid={`button-lang-${lang.code}`}
            >
              <FlagComponent />
              <span className="text-xs">{lang.name}</span>
            </Button>
          );
        })}
      </div>
    </Card>
  );

  const handleCameraClick = () => {
    console.log('[SellPage] handleCameraClick, images.length:', images.length);
    if (images.length < 5) {
      console.log('[SellPage] Triggering camera input');
      cameraInputRef.current?.click();
    }
  };

  const handleGalleryClick = () => {
    console.log('[SellPage] handleGalleryClick, images.length:', images.length);
    if (images.length < 5) {
      console.log('[SellPage] Triggering gallery input');
      galleryInputRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[SellPage] handleFileSelect triggered');
    const file = e.target.files?.[0];
    console.log('[SellPage] Selected file:', file);
    if (!file) {
      console.log('[SellPage] No file selected');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.fileTooLarge,
        description: t.fileTooLargeDesc,
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.invalidFileType,
        description: t.invalidFileTypeDesc,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      console.log('[SellPage] Starting upload process');

      // Create form data
      const formData = new FormData();
      formData.append('image', file);
      console.log('[SellPage] FormData created, file size:', file.size, 'bytes');

      // Upload to server
      console.log('[SellPage] Sending request to /api/upload-image');
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      console.log('[SellPage] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SellPage] Upload failed:', errorText);
        
        // Try to parse error message
        let errorMessage = t.uploadFailed;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[SellPage] Upload successful, data:', data);
      
      // Add uploaded image URL and WordPress media ID to arrays
      setImages([...images, data.url]);
      setWordpressMediaIds([...wordpressMediaIds, data.wordpressMediaId || null]);
      console.log('[SellPage] Image added to array, new length:', images.length + 1);
      console.log('[SellPage] WordPress media ID:', data.wordpressMediaId);
      
      toast({
        title: t.uploadSuccess,
        description: t.uploadSuccessDesc,
      });

      // Reset file inputs
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[SellPage] Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : t.uploadFailed;
      toast({
        title: t.uploadFailed,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      console.log('[SellPage] Upload process finished');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setWordpressMediaIds(wordpressMediaIds.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    // Validate Step 3 fields before proceeding to Step 4
    if (step === 3) {
      if (!formData.title || !formData.category || !formData.price) {
        toast({
          title: t.step3Required,
          description: t.step3RequiredDesc,
          variant: "destructive",
        });
        return;
      }
    }
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else setLocation('/');
  };

  const handleSubmit = async () => {
    console.log('[SellPage] Submit started:', formData, images, 'language:', selectedLang, 'editMode:', isEditMode);
    
    // Validation
    if (!formData.title || !formData.category || !formData.price || !formData.description) {
      toast({
        title: t.missingInfo,
        description: t.missingInfoDesc,
        variant: "destructive",
      });
      return;
    }

    if (images.length === 0) {
      toast({
        title: t.missingImage,
        description: t.missingImageDesc,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const requestBody = {
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price),
        category: formData.category,
        images: images,
        wordpressMediaIds: wordpressMediaIds,
        latitude: formData.latitude,
        longitude: formData.longitude,
        preferredLocation: formData.preferredLocation,
        preferredTime: formData.preferredTime,
        usagePeriod: formData.usagePeriod,
        language: selectedLang,
        countryCode: formData.countryCode,
      };

      let response;
      
      if (isEditMode && editProductId) {
        // Update existing product
        console.log('[SellPage] Updating product:', editProductId);
        response = await fetch(`/api/wordpress/products/${editProductId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      } else {
        // Create new product
        console.log('[SellPage] Creating new product with language:', selectedLang);
        response = await fetch('/api/wordpress/products', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t.submitFailed);
      }

      const result = await response.json();
      console.log('[SellPage] Product', isEditMode ? 'updated' : 'created', 'successfully:', result);

      toast({
        title: isEditMode ? (selectedLang === 'ko' ? '수정 완료!' : selectedLang === 'en' ? 'Updated!' : 'Cập nhật thành công!') : t.submitSuccess,
        description: isEditMode ? (selectedLang === 'ko' ? '상품이 수정되었습니다' : selectedLang === 'en' ? 'Product has been updated' : 'Sản phẩm đã được cập nhật') : t.submitSuccessDesc,
      });

      // Navigate back to product detail or home
      setTimeout(() => {
        if (isEditMode && editProductId) {
          setLocation(`/product/${editProductId}`);
        } else {
          setLocation('/');
        }
      }, 1000);
    } catch (error) {
      console.error('[SellPage] Submit error:', error);
      toast({
        title: t.submitFailed,
        description: error instanceof Error ? error.message : t.submitFailed,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Page title based on edit mode
  const getPageTitle = () => {
    if (isEditMode) {
      if (selectedLang === 'ko') return '상품 수정';
      if (selectedLang === 'en') return 'Edit Product';
      return 'Sửa sản phẩm';
    }
    return t.pageTitle;
  };

  // Submit button text based on edit mode
  const getSubmitButtonText = () => {
    if (isSubmitting) return t.submitting;
    if (isEditMode) {
      if (selectedLang === 'ko') return '수정하기';
      if (selectedLang === 'en') return 'Update';
      return 'Cập nhật';
    }
    return t.submit;
  };

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-card border-b border-card-border">
        <div className="flex items-center justify-between gap-4 p-4 border-b border-card-border">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">{getPageTitle()}</h1>
          </div>
          <Header />
        </div>
        <div className="flex gap-1 px-4 pb-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </header>

      <main className="p-4 pb-24 max-w-2xl mx-auto">
        {/* Language selector - always visible */}
        <LanguageSelector />

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t.step1Title}</h2>
            <LocationPicker
              onLocationSelect={(location) => {
                console.log('[SellPage] Location selected with country:', location.countryCode);
                setFormData({
                  ...formData,
                  latitude: location.lat,
                  longitude: location.lng,
                  preferredLocation: location.address,
                  countryCode: location.countryCode || '',
                });
              }}
              initialLocation={{
                lat: formData.latitude,
                lng: formData.longitude,
              }}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t.step2Title}</h2>
            
            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-camera"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-gallery"
            />
            
            {/* Image grid */}
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={img}
                    alt={`Product ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => handleRemoveImage(index)}
                    data-testid={`button-remove-${index}`}
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Upload buttons */}
            {images.length < 5 && !isUploading && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={handleCameraClick}
                  data-testid="button-camera"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-sm">{t.takePhoto}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                  onClick={handleGalleryClick}
                  data-testid="button-gallery"
                >
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-sm">{t.gallery}</span>
                </Button>
              </div>
            )}

            {isUploading && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">{t.uploading}</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {t.maxPhotos}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t.step3Title}</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">{t.title}</Label>
                <Input
                  id="title"
                  placeholder={t.titlePlaceholder}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  data-testid="input-title"
                />
              </div>
              <div>
                <Label htmlFor="category">{t.category}</Label>
                {isCategoriesLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">{t.loadingCategories}</span>
                  </div>
                ) : (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder={t.categoryPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length > 0 ? (
                        categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label htmlFor="price">{t.price}</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder={t.pricePlaceholder}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  data-testid="input-price"
                />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t.step4Title}</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="usage">{t.usagePeriod}</Label>
                <Input
                  id="usage"
                  placeholder={t.usagePlaceholder}
                  value={formData.usagePeriod}
                  onChange={(e) => setFormData({ ...formData, usagePeriod: e.target.value })}
                  data-testid="input-usage"
                />
              </div>
              <div>
                <Label htmlFor="location">{t.meetingLocation}</Label>
                <Input
                  id="location"
                  placeholder={t.locationPlaceholder}
                  value={formData.preferredLocation}
                  onChange={(e) => setFormData({ ...formData, preferredLocation: e.target.value })}
                  data-testid="input-location"
                />
              </div>
              <div>
                <Label htmlFor="time">{t.meetingTime}</Label>
                <Input
                  id="time"
                  placeholder={t.timePlaceholder}
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  data-testid="input-time"
                />
              </div>
              <div>
                <Label htmlFor="description">{t.description}</Label>
                <Textarea
                  id="description"
                  placeholder={t.descriptionPlaceholder}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  data-testid="input-description"
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-card-border p-4 z-40">
        <Button
          className="w-full"
          size="lg"
          onClick={step === 4 ? handleSubmit : handleNext}
          disabled={isSubmitting}
          data-testid="button-next"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t.submitting}
            </>
          ) : (
            step === 4 ? getSubmitButtonText() : t.continue
          )}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
