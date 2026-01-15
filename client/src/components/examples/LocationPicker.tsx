import LocationPicker from '../LocationPicker';

export default function LocationPickerExample() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">위치 선택</h2>
      <LocationPicker
        onLocationSelect={(location) => {
          console.log('Location selected:', location);
        }}
      />
    </div>
  );
}
