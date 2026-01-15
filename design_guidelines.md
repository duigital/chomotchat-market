# Chomotchat Design Guidelines

## Design Approach

**Reference-Based Approach:** Drawing inspiration from successful peer-to-peer marketplaces popular in Southeast Asia (Carousell, Facebook Marketplace, OfferUp) with mobile-first optimization for Vietnamese users.

**Core Principles:**
- Trust-building through clear seller information and ratings
- Speed and efficiency in browsing and discovering nearby products
- Conversational commerce through integrated messaging
- Location-aware design that emphasizes proximity

## Typography

**Font Family:** Google Fonts via CDN
- Primary: Inter (400, 500, 600, 700) - clean, legible for Vietnamese text
- Secondary: System UI fallback for performance

**Hierarchy:**
- Hero/Landing: text-4xl to text-5xl, font-bold
- Product Titles: text-lg, font-semibold
- Section Headers: text-2xl, font-bold
- Body Text: text-base, font-normal
- Metadata (distance, time): text-sm, font-medium
- Captions: text-xs

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 (mobile), p-6 (desktop)
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4
- Page margins: px-4 (mobile), px-6 (tablet), px-8 (desktop)

**Grid System:**
- Product List: grid-cols-2 (mobile), grid-cols-3 (tablet), grid-cols-4 (desktop)
- Product Detail: Single column (mobile), 2-column split on desktop (images left, info right)
- Max container width: max-w-7xl

## Component Library

### Navigation
**Header:**
- Fixed top navigation with location indicator, search bar, and user profile
- Bottom tab bar (mobile): Browse, Sell, Messages, Profile
- Hamburger menu with distance filters (1km, 3km, 5km, 10km+)

### Product Cards
- Square image thumbnail (aspect-ratio-square) with rounded corners (rounded-lg)
- Overlay badge for "days since posting" (top-right)
- Product title (truncate after 2 lines)
- Price (prominent, text-lg font-bold)
- Seller rating (5-star display with icon)
- Location (city/district with map pin icon)
- Distance indicator badge

### Product Listing Page
- Sticky filter bar with distance toggles and search
- Infinite scroll product grid
- Empty state illustration for no results
- Pull-to-refresh functionality

### Product Detail Page
**Image Gallery:**
- Full-width carousel with dots indicator
- Swipeable on mobile, thumbnail strip on desktop
- Up to 5 images, first as hero

**Product Information:**
- Title: text-2xl, font-bold
- Price: Large, prominent display (text-3xl)
- Seller card: Avatar, username, rating stars, verification badge
- Details grid: Usage period, preferred location, preferred time
- Description: Full-width text block with proper line spacing
- Sticky CTA: "Chat với người bán" (Chat with seller) button at bottom

### Chat Interface
- WhatsApp-style message bubbles (rounded-2xl)
- Buyer messages: right-aligned
- Seller messages: left-aligned
- Timestamp below each message (text-xs)
- Input bar: sticky bottom with attachment icon, text input, send button
- Header: Seller/Buyer info with back button and product thumbnail

### Seller Listing Form
- Multi-step wizard flow
- Step 1: Location selection (embedded Google Map)
- Step 2: Photo upload (grid preview of up to 5 images)
- Step 3: Product details (title, category dropdown, price input)
- Step 4: Additional info (usage period, preferred location/time, description textarea)
- Progress indicator at top
- Clear validation messaging

### Trust & Safety Elements
- Seller rating display: Large star rating with count "(125 đánh giá)"
- Trust badges: "Verified", "Responsive", "Fast shipper"
- Report listing button (subtle, text-sm)

## Icons

**Library:** Heroicons via CDN
- Navigation: Home, Plus, ChatBubble, User icons
- Product: MapPin, Clock, Camera icons
- Actions: Heart, Share, Flag, X-mark icons
- Rating: Star icons (filled/outline)

## Animations

**Minimal, Purposeful:**
- Smooth page transitions (300ms ease)
- Chat message slide-in animation
- Pull-to-refresh indicator
- Photo carousel swipe with momentum
- Bottom sheet modals for filters

## Images

**Hero Section (Landing/Marketing):**
- Full-width hero showcasing Vietnamese users trading products via phone
- Overlay text: "Mua bán đồ cũ gần bạn" (Buy and sell used items near you)
- Background: Blurred image with semi-transparent overlay for text readability
- CTA buttons with backdrop-blur effect

**Product Images:**
- User-uploaded photos (up to 5 per listing)
- Placeholder image for missing photos (illustration of camera icon)
- Lazy loading for performance

**Trust Signals:**
- Seller avatar thumbnails (circular, border-2)
- Category icons for product types
- Location map snapshots in listings

## Mobile-First Optimizations

- Bottom navigation for thumb-friendly access
- Large tap targets (min-h-12 for buttons)
- Swipe gestures for image galleries and message threads
- Responsive typography scaling (text-sm on mobile, text-base on desktop)
- Sticky CTAs that don't obscure content
- Single-column layouts that expand to multi-column on larger screens