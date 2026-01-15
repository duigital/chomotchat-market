import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import type { WordPressCategory } from "@shared/schema";

interface CategoryFilterProps {
  categories: WordPressCategory[];
  selectedCategories: number[];
  onChange: (categories: number[]) => void;
}

export default function CategoryFilter({
  categories,
  selectedCategories,
  onChange,
}: CategoryFilterProps) {
  const handleToggle = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      onChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedCategories, categoryId]);
    }
  };

  const handleSelectAll = () => {
    onChange(categories.map((cat) => cat.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const isAllSelected = selectedCategories.length === categories.length;
  const selectedCount = selectedCategories.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="button-category-filter"
        >
          <span>카테고리</span>
          {selectedCount < categories.length && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount}
            </Badge>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">카테고리 선택</h4>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={isAllSelected}
                data-testid="button-select-all"
              >
                전체 선택
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedCount === 0}
                data-testid="button-clear-all"
              >
                선택 해제
              </Button>
            </div>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center space-x-3"
                data-testid={`category-item-${category.id}`}
              >
                <Checkbox
                  id={`category-${category.id}`}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={() => handleToggle(category.id)}
                  data-testid={`checkbox-category-${category.id}`}
                />
                <Label
                  htmlFor={`category-${category.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {category.count}
                    </Badge>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
