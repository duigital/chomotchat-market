import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

interface SellerInfoProps {
  username: string;
  rating: number;
  reviewCount: number;
  verified?: boolean;
}

export default function SellerInfo({
  username,
  rating,
  reviewCount,
  verified = false,
}: SellerInfoProps) {
  const initials = username
    .split('_')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3" data-testid="seller-info">
      <Avatar className="h-12 w-12">
        <AvatarFallback className="bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold" data-testid="text-username">
            {username}
          </span>
          {verified && (
            <Badge variant="secondary" className="text-xs">
              Đã xác minh
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium" data-testid="text-rating">
            {rating.toFixed(1)}
          </span>
          <span className="text-xs">
            ({reviewCount} đánh giá)
          </span>
        </div>
      </div>
    </div>
  );
}
