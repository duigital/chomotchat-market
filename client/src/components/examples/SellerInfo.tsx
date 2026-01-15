import SellerInfo from '../SellerInfo';

export default function SellerInfoExample() {
  return (
    <div className="p-4 space-y-4 max-w-md">
      <SellerInfo
        username="nguyen_van_a"
        rating={4.8}
        reviewCount={125}
        verified={true}
      />
      <SellerInfo
        username="tran_thi_b"
        rating={5.0}
        reviewCount={89}
      />
    </div>
  );
}
