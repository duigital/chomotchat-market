import { useState } from 'react';
import SearchBar from '../SearchBar';

export default function SearchBarExample() {
  const [search, setSearch] = useState('');

  return (
    <div className="p-4">
      <SearchBar
        value={search}
        onChange={setSearch}
        onFilterClick={() => console.log('Filter clicked')}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Search value: {search || '(empty)'}
      </p>
    </div>
  );
}
