import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick?: () => void;
}

export default function SearchBar({ value, onChange, onFilterClick }: SearchBarProps) {
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Tìm kiếm sản phẩm..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
          data-testid="input-search"
        />
      </div>
      {onFilterClick && (
        <Button
          variant="outline"
          size="icon"
          onClick={onFilterClick}
          data-testid="button-filter"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
