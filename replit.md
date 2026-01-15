# Chomotchat - Vietnamese Peer-to-Peer Marketplace

## Overview

Chomotchat is a location-based peer-to-peer marketplace platform designed for the Vietnamese market, enabling users to buy and sell used items within their local community. The application draws inspiration from successful Southeast Asian marketplaces like Carousell and Facebook Marketplace, with a strong emphasis on mobile-first design, proximity-based discovery, and conversational commerce.

The platform integrates with WordPress/WooCommerce as a product backend, uses real-time messaging for buyer-seller communication, and leverages Google Maps for location-based features. The core value proposition is connecting nearby buyers and sellers to facilitate safe, convenient local transactions.

## Recent Changes (January 1, 2026)

- **Country-Based Product Filtering**: Products are now filtered by the user's current location country
  - **Country Code Extraction**: HomePage and SellPage extract ISO country codes (VN, KR, US) from Google Maps Geocoder responses
  - **Product Metadata**: Products store `_chomotchat_country` in WordPress metadata when created or updated
  - **API Filtering**: GET /api/wordpress/products accepts `country` query parameter and filters products after WPML consolidation
  - **Dynamic Query Updates**: HomePage query key includes country code, triggering re-fetch when user's location country changes
  - **Backwards Compatibility**: Legacy products without country metadata are included in results (fallback for older listings)
  - **Location Metadata Structure**: `_chomotchat_latitude`, `_chomotchat_longitude`, `_chomotchat_preferred_location`, `_chomotchat_country`

## Previous Changes (December 12, 2025)

- **Product Edit Feature**: Implemented complete product editing functionality with ownership verification
  - **Ownership Verification**: Only product owners can edit their products
    - Products store `_chomotchat_author_id` and `_chomotchat_author_wp_id` in WordPress metadata
    - Frontend and backend both verify ownership before allowing edits
  - **Backend Endpoints**:
    - POST /api/wordpress/products now requires authentication (401 if not logged in)
    - PUT /api/wordpress/products/:id with ownership verification (403 if not owner)
    - Both endpoints fetch wordpressUserId from database for reliable author tracking
  - **Frontend**:
    - ProductDetailPage shows edit button only to product owner (uses Boolean(canEdit))
    - SellPage supports edit mode via `?edit={productId}` URL parameter
    - Edit mode pre-fills form with existing product data
    - Update success redirects back to product detail page
  - **Security**: Backend validates ownership before any product modification

## Previous Changes (November 19, 2025)

- **Universal Bottom Navigation (BottomNav)**: Implemented persistent bottom navigation bar across ALL pages
  - **Complete Coverage**: BottomNav appears on all pages (HomePage, ProductDetailPage, ChatListPage, ChatPage, LoginPage, MyPage, SellPage)
  - **All States Covered**: BottomNav visible in loading, error, authenticated, and unauthenticated states
  - **Layout Adaptation**: All pages include `pb-24` bottom padding to prevent content overlap with BottomNav
  - **Fixed Element Positioning**: Pages with fixed bottom elements (ProductDetailPage, ChatPage, SellPage) position them at `bottom-16` to sit above BottomNav
  - **Navigation Items**: Home, Chats, Sell, My with active state highlighting
  - **Mobile & Desktop**: Tested and verified on mobile (375x667) and desktop (1280x720) viewports
  - **Implementation**: Each page component includes BottomNav in all conditional branches and appropriate spacing

- **Universal Header Navigation**: Implemented consistent Header component across ALL pages and ALL states
  - **Complete Coverage**: Header now appears on all pages (HomePage, ProductDetailPage, ChatListPage, ChatPage, LoginPage, MyPage, SellPage)
  - **All States Covered**: Header visible in loading, error, authenticated, and unauthenticated states
  - **Router Updates**: Added `/chats` and `/my` route aliases for better URL accessibility
  - **User Experience**: Users always have access to login/logout controls and navigation regardless of page state
  - **Implementation**: Each page component renders Header in all conditional branches (loading, error, success)
  - **Verified**: e2e tests confirm Header presence across all pages

## Previous Changes (November 11, 2025)

- **Authentication System Change**: Switched from OAuth to WordPress Application Passwords
  - **Why**: OAuth Password Grant required miniOrange plugin configuration that wasn't available
  - **New Method**: WordPress Application Passwords (WordPress 5.6+ built-in feature)
  - **How it works**:
    - Users generate Application Password in WordPress Admin (Users → Profile → Application Passwords)
    - Login uses Basic Authentication with username and Application Password
    - WordPress REST API endpoint `/wp/v2/users/me` validates credentials
    - Application Password stored encrypted in database for WordPress Media Library uploads
    - No expiration - Application Passwords remain valid until revoked
  - **Benefits**:
    - ✅ No external plugin dependencies
    - ✅ WordPress core feature (5.6+)
    - ✅ Simpler implementation
    - ✅ Better security (passwords can be revoked per-app)
- **Login UI Update**: Added Application Password instructions and generation guide
- **Header Component Update**: Added logout functionality with login ID display
  - Shows username (login ID) when authenticated
  - Logout button with confirmation toast
  - Logout clears session and redirects to home page
- **API Diagnostics**: Added comprehensive WordPress API diagnostics endpoint (`/api/wordpress/diagnostics`)
  - Tests environment variables configuration
  - Validates WooCommerce REST API connectivity
  - Checks miniOrange OAuth token endpoint
  - Verifies WordPress REST API accessibility
- **Image Upload Strategy**: WordPress Media Library-only approach using OAuth 2.0 access tokens - requires user login
- **PostgreSQL Migration**: Migrated from in-memory storage to PostgreSQL database with Drizzle ORM for production-ready persistence
- **Session Management**: Express-session with PostgreSQL store (connect-pg-simple) for secure session handling with 30-day cookie duration
- **WebSocket Configuration**: Added ws polyfill for Neon serverless compatibility (neonConfig.webSocketConstructor)
- **Removed Object Storage**: Simplified image upload by removing Object Storage dependency (credential service not available in environment)

## Previous Changes (November 7, 2025)

- **WordPress Media Library Integration**: Images uploaded simultaneously to Object Storage and WordPress Media Library
- **Category Display**: Category badges on ProductCard and ProductDetailPage
- **Bug Fixes**: Removed TooltipProvider error, separated location loading from product loading

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design System:**
- Mobile-first responsive design approach
- Vietnamese language support (vi locale)
- Custom Tailwind theme with elevation states (hover-elevate, active-elevate-2)
- Inter font family from Google Fonts
- Consistent spacing system using Tailwind primitives (2, 4, 6, 8, 12, 16)

**Key UI Patterns:**
- Bottom navigation bar for mobile navigation
- Distance-based filtering (1km, 3km, 5km, 10km+)
- Product grid layout adapting from 2 columns (mobile) to 4 columns (desktop)
- Real-time chat interface with WebSocket support
- Multi-step form flow for listing products
- Image upload with camera and gallery support

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js for the REST API server
- TypeScript for type-safe server code
- WebSocket (ws library) for real-time messaging
- Drizzle ORM for database operations
- Neon serverless PostgreSQL database
- Session-based authentication using connect-pg-simple

**Server Structure:**
- Express middleware for JSON parsing and static file serving
- Custom logging middleware for API request tracking
- Vite integration in development mode with HMR support
- Production build serves static assets from dist/public

**Storage Strategy:**
- In-memory storage implementation (MemStorage) as default
- Designed for easy swapping to PostgreSQL implementation
- Object storage integration using Google Cloud Storage
- Image uploads handled via Multer with 5MB file size limit

### Database Schema

**Core Entities:**

1. **Users Table:**
   - UUID primary key
   - Username (unique)
   - Hashed password
   - Rating and review count for seller reputation

2. **Products Table:**
   - UUID primary key
   - WordPress integration via wordpress_id field
   - Product details (title, description, price, category)
   - Usage period and preferred meeting details
   - Geolocation (latitude/longitude) for proximity search
   - Image URLs array
   - Foreign key to seller (user)

3. **Chat Rooms Table:**
   - UUID primary key
   - Links product, buyer, and seller
   - Timestamp for conversation creation

4. **Messages Table:**
   - UUID primary key
   - Foreign key to chat room
   - Sender identification
   - Message content and timestamp

**Design Decisions:**
- Uses UUID for all primary keys via PostgreSQL's gen_random_uuid()
- Denormalized geolocation on products for efficient distance queries
- Array type for product images to support multiple photos
- Timestamp defaults using database-level defaultNow()

### External Dependencies

**WordPress/WooCommerce Integration:**
- WordPress REST API for product management
- OAuth 1.0a authentication using consumer key/secret
- Products fetched from WordPress serve as the primary product catalog
- Custom meta fields for Vietnamese-specific attributes (usage period, preferred location/time)

**Google Cloud Platform:**
- Google Maps JavaScript API for interactive maps and location picking
- Advanced Markers library for map visualization
- Geocoding API for reverse address lookup
- Object Storage for image hosting and serving

**Real-time Communication:**
- WebSocket server for instant messaging
- Room-based message broadcasting
- Connection state management with automatic reconnection
- Client-side message buffering during disconnections

**Development Tools:**
- Replit-specific plugins for runtime error overlay and dev banner
- Eruda mobile debugging console for on-device testing
- ESBuild for production server bundling
- Drizzle Kit for database migrations

**Session Management:**
- PostgreSQL-backed session store
- HTTP-only cookies for session tokens
- Credentials included in fetch requests for authentication

**Form Validation:**
- Zod schemas for runtime type validation
- React Hook Form with Hookform Resolvers for form state
- Schema validation integrated with database insert operations

**Date/Time Handling:**
- date-fns library with Vietnamese locale (vi)
- Relative time formatting (formatDistanceToNow)
- Consistent timezone handling for timestamps