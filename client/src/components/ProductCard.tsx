import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  image: string;
  location: string;
  distance: number;
  sellerName: string;
  sellerRating: number;
  createdAt: Date;
  categories?: string[];
  onClick?: () => void;
}

export default function ProductCard({
  title,
  price,
  image,
  location,
  distance,
  sellerName,
  sellerRating,
  createdAt,
  categories = [],
  onClick,
}: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const daysAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: vi });

  return (
    <Card
      className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer"
      onClick={onClick}
      data-testid={`card-product-${title}`}
    >
      <div className="aspect-square bg-muted relative overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-xs">
          {daysAgo}
        </Badge>
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-base line-clamp-2 min-h-[3rem]" data-testid={`text-title-${title}`}>
          {title}
        </h3>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((category, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{categories.length - 2}
              </Badge>
            )}
          </div>
        )}
        <p className="text-lg font-bold text-primary" data-testid="text-price">
          {formatPrice(price)}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
          <span>{sellerRating.toFixed(1)}</span>
          <span className="mx-1">•</span>
          <span data-testid="text-seller">{sellerName}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate" data-testid="text-location">{location}</span>
          </div>
          {!isNaN(distance) ? (
            <Badge variant="secondary" className="text-xs">
              {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              위치 정보 없음
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
