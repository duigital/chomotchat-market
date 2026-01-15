import { useState } from 'react';
import DistanceFilter from '../DistanceFilter';

export default function DistanceFilterExample() {
  const [selected, setSelected] = useState(3);

  return (
    <div className="p-4">
      <DistanceFilter
        selected={selected}
        onChange={(distance) => {
          setSelected(distance);
          console.log('Distance changed to:', distance);
        }}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Selected: {selected}km
      </p>
    </div>
  );
}
