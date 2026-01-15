import ProductCard from '../ProductCard';
import headphonesImg from '@assets/generated_images/Headphones_product_placeholder_06b07c41.png';

export default function ProductCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 max-w-4xl">
      <ProductCard
        id="1"
        title="Tai nghe Bluetooth Sony WH-1000XM4"
        price={3500000}
        image={headphonesImg}
        location="Quận 1, TP.HCM"
        distance={0.8}
        sellerName="nguyen_van_a"
        sellerRating={4.8}
        createdAt={new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)}
        onClick={() => console.log('Product clicked')}
      />
      <ProductCard
        id="2"
        title="Tai nghe chống ồn cao cấp"
        price={2800000}
        image={headphonesImg}
        location="Quận 3, TP.HCM"
        distance={1.5}
        sellerName="tran_thi_b"
        sellerRating={5.0}
        createdAt={new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)}
        onClick={() => console.log('Product clicked')}
      />
    </div>
  );
}
