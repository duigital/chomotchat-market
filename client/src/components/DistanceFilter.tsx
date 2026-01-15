import { Badge } from "@/components/ui/badge";

interface DistanceFilterProps {
  selected: number;
  onChange: (distance: number) => void;
}

const distances = [
  { value: 1, label: '1km' },
  { value: 3, label: '3km' },
  { value: 5, label: '5km' },
  { value: 10, label: '10km+' },
];

export default function DistanceFilter({ selected, onChange }: DistanceFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" data-testid="distance-filter">
      {distances.map((distance) => (
        <Badge
          key={distance.value}
          variant={selected === distance.value ? "default" : "secondary"}
          className="cursor-pointer whitespace-nowrap toggle-elevate"
          onClick={() => onChange(distance.value)}
          data-testid={`filter-${distance.value}km`}
        >
          {distance.label}
        </Badge>
      ))}
    </div>
  );
}
