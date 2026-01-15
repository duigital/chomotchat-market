import { useState, useCallback } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LocationPickerProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string; countryCode?: string }) => void;
  initialLocation?: { lat: number; lng: number };
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = {
  lat: 10.7769, // TP.HCM
  lng: 106.7009,
};

export default function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const [center, setCenter] = useState(initialLocation || defaultCenter);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);
  const [address, setAddress] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [manualLat, setManualLat] = useState(String(initialLocation?.lat ?? defaultCenter.lat));
  const [manualLng, setManualLng] = useState(String(initialLocation?.lng ?? defaultCenter.lng));
  const { toast } = useToast();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const getCurrentLocation = useCallback(() => {
    setIsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCenter(location);
          setSelectedLocation(location);
          
          // 즉시 좌표를 먼저 표시
          const coordsText = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
          setAddress(coordsText);
          
          // 서버를 통해 주소 변환 시도
          try {
            await reverseGeocode(location);
          } catch (error) {
            console.error("주소 변환 실패:", error);
            // 좌표는 이미 표시되어 있으므로 추가 작업 불필요
          }
          
          setIsLoading(false);
          toast({
            title: "위치 가져오기 성공",
            description: coordsText,
          });
        },
        (error) => {
          console.error("위치 가져오기 오류:", error);
          toast({
            title: "위치 오류",
            description: "현재 위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      );
    } else {
      toast({
        title: "지원 안됨",
        description: "브라우저가 위치 정보를 지원하지 않습니다.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [toast]);

  const reverseGeocode = async (location: { lat: number; lng: number }) => {
    try {
      // google.maps가 로드되어 있는지 확인
      if (typeof google === 'undefined' || !google.maps) {
        console.warn('Google Maps가 로드되지 않음, 좌표 유지');
        return;
      }
      
      const geocoder = new google.maps.Geocoder();
      
      const result = await geocoder.geocode({
        location: { lat: location.lat, lng: location.lng },
        language: 'ko',
      });
      
      if (result.results && result.results.length > 0) {
        // Prefer road name address (street_address or route type) over lot number address
        const roadNameResult = result.results.find(r => 
          r.types.includes('street_address') || r.types.includes('route')
        );
        const selectedResult = roadNameResult || result.results[0];
        
        const formattedAddress = selectedResult.formatted_address;
        console.log('[LocationPicker] 도로명 주소:', formattedAddress);
        setAddress(formattedAddress);
        
        // Extract country code from address_components
        const addressComponents = selectedResult.address_components;
        const countryComponent = addressComponents?.find(
          (component) => component.types.includes('country')
        );
        if (countryComponent?.short_name) {
          console.log('[LocationPicker] Country code extracted:', countryComponent.short_name);
          setCountryCode(countryComponent.short_name);
        }
      } else {
        console.warn('주소를 찾을 수 없음');
      }
    } catch (error) {
      console.error("주소 변환 오류:", error);
    }
  };

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const location = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      setSelectedLocation(location);
      
      // 즉시 좌표를 먼저 표시
      const coordsText = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
      setAddress(coordsText);
      
      // 서버를 통해 주소 변환 시도
      try {
        await reverseGeocode(location);
      } catch (error) {
        console.error("주소 변환 실패:", error);
        // 좌표는 이미 표시되어 있으므로 추가 작업 불필요
      }
    }
  }, []);

  const handleConfirm = () => {
    if (selectedLocation && address) {
      console.log('[LocationPicker] Confirming location with country:', countryCode);
      onLocationSelect({ ...selectedLocation, address, countryCode: countryCode || undefined });
      toast({
        title: "위치 선택 완료",
        description: address,
      });
    }
  };

  if (!apiKey) {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Google Maps API 키가 설정되지 않았습니다. 수동으로 위치 정보를 입력해주세요.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="manual-lat">위도 (Latitude)</Label>
                <Input
                  id="manual-lat"
                  type="number"
                  step="0.000001"
                  placeholder="10.7769"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  data-testid="input-manual-lat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-lng">경도 (Longitude)</Label>
                <Input
                  id="manual-lng"
                  type="number"
                  step="0.000001"
                  placeholder="106.7009"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  data-testid="input-manual-lng"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-address">주소</Label>
              <Input
                id="manual-address"
                placeholder="예: 123 Nguyen Hue Street, District 1, Ho Chi Minh City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-testid="input-manual-address"
              />
            </div>
          </div>
        </Card>
        <Button
          onClick={() => {
            const lat = parseFloat(manualLat);
            const lng = parseFloat(manualLng);
            
            if (address.trim() && !isNaN(lat) && !isNaN(lng)) {
              onLocationSelect({ lat, lng, address });
              toast({
                title: "위치 선택 완료",
                description: address,
              });
            } else {
              toast({
                title: "입력 오류",
                description: "모든 필드를 올바르게 입력해주세요.",
                variant: "destructive",
              });
            }
          }}
          disabled={!address.trim() || !manualLat || !manualLng}
          className="w-full"
          size="lg"
          data-testid="button-confirm-manual-location"
        >
          이 위치로 설정
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="flex-1"
          data-testid="button-current-location"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          현재 위치 사용
        </Button>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={15}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          mapId: 'chomotchat-map',
        }}
      >
        {selectedLocation && <Marker position={selectedLocation} />}
      </GoogleMap>

      {address && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">선택된 주소</p>
              <p className="font-medium" data-testid="text-selected-address">{address}</p>
            </div>
          </div>
        </Card>
      )}

      <Button
        onClick={handleConfirm}
        disabled={!selectedLocation || !address}
        className="w-full"
        size="lg"
        data-testid="button-confirm-location"
      >
        이 위치로 설정
      </Button>
    </div>
  );
}
