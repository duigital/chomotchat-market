import ChatBubble from '../ChatBubble';

export default function ChatBubbleExample() {
  return (
    <div className="p-4 space-y-4 max-w-md bg-background">
      <ChatBubble
        message="Xin chào! Sản phẩm còn không ạ?"
        timestamp={new Date(Date.now() - 5 * 60 * 1000)}
        isMine={false}
      />
      <ChatBubble
        message="Dạ còn ạ! Bạn muốn xem thực tế không?"
        timestamp={new Date(Date.now() - 3 * 60 * 1000)}
        isMine={true}
      />
      <ChatBubble
        message="Có thể gặp ở khu vực Quận 1 được không?"
        timestamp={new Date(Date.now() - 1 * 60 * 1000)}
        isMine={false}
      />
    </div>
  );
}
