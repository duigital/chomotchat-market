import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import multer from "multer";
import { ObjectStorageService } from "./objectStorage";
import crypto from "crypto";
import { generateState, generateCodeVerifier, generateCodeChallenge } from "./pkce";
import { encryptToken, decryptToken } from "./encryption";

interface WebSocketClient extends WebSocket {
  userId?: string;
  roomId?: string;
}

const WORDPRESS_SITE_URL = process.env.WORDPRESS_SITE_URL || "https://chomotchat.com";
const WORDPRESS_OAUTH_CLIENT_ID = process.env.WORDPRESS_OAUTH_CLIENT_ID;
const WORDPRESS_OAUTH_CLIENT_SECRET = process.env.WORDPRESS_OAUTH_CLIENT_SECRET;
const AUTHORIZATION_ENDPOINT = `${WORDPRESS_SITE_URL}/wp-json/moserver/authorize`;
const TOKEN_ENDPOINT = `${WORDPRESS_SITE_URL}/wp-json/moserver/token`;
const RESOURCE_ENDPOINT = `${WORDPRESS_SITE_URL}/wp-json/moserver/resource`;

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for image uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('이미지 파일만 업로드 가능합니다 (JPEG, PNG, WebP)'));
      }
    },
  });

  // WordPress OAuth 2.0 Authorization Initiation
  app.get("/auth/wordpress", async (req, res) => {
    try {
      if (!WORDPRESS_OAUTH_CLIENT_ID || !WORDPRESS_OAUTH_CLIENT_SECRET) {
        return res.status(500).json({ error: "WordPress OAuth가 설정되지 않았습니다" });
      }

      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);

      const userId = req.session.userId || null;
      
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await storage.createOAuthState({
        state,
        codeVerifier,
        userId,
        expiresAt,
      });

      await storage.cleanupExpiredOAuthStates();

      const callbackUrl = `${req.protocol}://${req.get('host')}/auth/wordpress/callback`;
      
      const authUrl = new URL(AUTHORIZATION_ENDPOINT);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', WORDPRESS_OAUTH_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', callbackUrl);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('scope', 'basic email');
      authUrl.searchParams.set('prompt', 'allow');

      res.redirect(authUrl.toString());
    } catch (error) {
      console.error('[OAuth] Error initiating authorization:', error);
      res.status(500).json({ 
        error: 'WordPress 인증을 시작할 수 없습니다',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // WordPress OAuth 2.0 Callback Handler
  app.get("/auth/wordpress/callback", async (req, res) => {
    try {
      const { code, state, error, error_description } = req.query;

      if (error) {
        console.error('[OAuth] Authorization error:', error, error_description);
        return res.redirect(`/?error=oauth_${error}`);
      }

      if (!code || !state) {
        return res.redirect('/?error=invalid_oauth_response');
      }

      const oauthState = await storage.getOAuthState(state as string);
      
      if (!oauthState) {
        return res.redirect('/?error=invalid_state');
      }

      if (oauthState.expiresAt < new Date()) {
        await storage.deleteOAuthState(state as string);
        return res.redirect('/?error=state_expired');
      }

      await storage.deleteOAuthState(state as string);

      const callbackUrl = `${req.protocol}://${req.get('host')}/auth/wordpress/callback`;
      
      const tokenResponse = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: WORDPRESS_OAUTH_CLIENT_ID!,
          client_secret: WORDPRESS_OAUTH_CLIENT_SECRET!,
          code: code as string,
          redirect_uri: callbackUrl,
          code_verifier: oauthState.codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('[OAuth] Token exchange failed:', errorData);
        return res.redirect('/?error=token_exchange_failed');
      }

      const tokenData = await tokenResponse.json();
      const { access_token, refresh_token, expires_in } = tokenData;

      const userInfoResponse = await fetch(RESOURCE_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        console.error('[OAuth] Failed to fetch user info');
        return res.redirect('/?error=user_info_failed');
      }

      const userInfo = await userInfoResponse.json();
      
      const wordpressUserId = userInfo.id || userInfo.user_id;
      const displayName = userInfo.display_name || userInfo.name || userInfo.username;
      const wordpressEmail = userInfo.email || userInfo.user_email;
      const avatarUrl = userInfo.avatar_url || userInfo.avatar || null;

      let user = await storage.getUserByWordPressId(wordpressUserId);

      const tokenExpiry = new Date(Date.now() + (expires_in * 1000));
      
      if (user) {
        user = await storage.updateUser(user.id, {
          displayName,
          avatarUrl,
          wordpressEmail,
          wordpressAccessToken: encryptToken(access_token),
          wordpressRefreshToken: refresh_token ? encryptToken(refresh_token) : null,
          wordpressTokenExpiry: tokenExpiry,
        });
      } else {
        const username = `wp_${wordpressUserId}_${Date.now()}`;
        const randomPassword = crypto.randomBytes(32).toString('hex');
        
        user = await storage.createUser({
          username,
          password: randomPassword,
        });

        user = await storage.updateUser(user!.id, {
          wordpressUserId,
          displayName,
          avatarUrl,
          wordpressEmail,
          wordpressAccessToken: encryptToken(access_token),
          wordpressRefreshToken: refresh_token ? encryptToken(refresh_token) : null,
          wordpressTokenExpiry: tokenExpiry,
        });
      }

      if (user) {
        req.session.userId = user.id;
        req.session.save((err) => {
          if (err) {
            console.error('[OAuth] Session save error:', err);
            return res.redirect('/?error=session_save_failed');
          }
          console.log('[OAuth] User logged in successfully:', user!.id);
          res.redirect('/my-page');
        });
      } else {
        res.redirect('/?error=user_creation_failed');
      }
    } catch (error) {
      console.error('[OAuth] Callback error:', error);
      res.redirect('/?error=oauth_callback_failed');
    }
  });

  // Get current user info
  app.get("/api/me", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "인증되지 않았습니다" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
      }

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        wordpressEmail: user.wordpressEmail,
        wordpressUserId: user.wordpressUserId,
        rating: user.rating,
        reviewCount: user.reviewCount,
      });
    } catch (error) {
      console.error('[API] /api/me error:', error);
      res.status(500).json({ 
        error: '사용자 정보를 가져올 수 없습니다',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get WooCommerce customer billing address
  app.get("/api/wordpress/customer/billing", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "인증되지 않았습니다" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.wordpressUserId) {
        return res.status(404).json({ error: "WordPress 연동 정보가 없습니다" });
      }

      const siteUrl = process.env.WORDPRESS_SITE_URL || "https://chomotchat.com";
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      if (!consumerKey || !consumerSecret) {
        return res.status(500).json({ error: "WooCommerce API 설정이 되어 있지 않습니다" });
      }

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const url = `${siteUrl}/wp-json/wc/v3/customers/${user.wordpressUserId}`;

      console.log('[WordPress] Fetching customer billing info for WP user:', user.wordpressUserId);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[WordPress] Customer fetch failed:', response.status);
        return res.status(response.status).json({ error: "고객 정보를 가져올 수 없습니다" });
      }

      const customerData = await response.json();
      
      // Return only billing address info
      const billing = customerData.billing || {};
      
      res.json({
        country: billing.country || null,
        state: billing.state || null,
        city: billing.city || null,
        address1: billing.address_1 || null,
        address2: billing.address_2 || null,
        postcode: billing.postcode || null,
        phone: billing.phone || null,
      });
    } catch (error) {
      console.error('[WordPress] Customer billing fetch error:', error);
      res.status(500).json({ error: "청구 주소 정보를 가져올 수 없습니다" });
    }
  });

  // Get WordPress user language preference from user meta
  app.get("/api/wordpress/user/language", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "인증되지 않았습니다" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.wordpressUserId) {
        return res.status(404).json({ error: "WordPress 연동 정보가 없습니다" });
      }

      const siteUrl = process.env.WORDPRESS_SITE_URL || "https://chomotchat.com";
      
      // Use user's stored app password (encrypted in wordpressAccessToken) to access their WordPress profile
      if (!user.wordpressAccessToken) {
        return res.status(400).json({ error: "WordPress 인증 정보가 없습니다" });
      }

      // Decrypt the stored app password using the same encryption as login flow
      const decryptedPassword = decryptToken(user.wordpressAccessToken);
      
      // Use original login username/email (not the WordPress slug)
      const loginUsername = user.wordpressLoginUsername || user.wordpressEmail || user.username;
      
      const credentials = Buffer.from(`${loginUsername}:${decryptedPassword}`).toString('base64');
      const authHeader = `Basic ${credentials}`;

      // Fetch user data from WordPress REST API - this includes locale preference
      const wpUserUrl = `${siteUrl}/wp-json/wp/v2/users/me?context=edit`;
      console.log('[WordPress] Fetching user language preference for WP user:', user.wordpressUserId);

      const response = await fetch(wpUserUrl, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[WordPress] User language fetch failed:', response.status);
        return res.status(response.status).json({ error: "사용자 언어 설정을 가져올 수 없습니다" });
      }

      const wpUserData = await response.json();
      
      // WordPress stores user locale preference in the 'locale' field
      // This maps to WPML language codes: ko (Korean), vi (Vietnamese), en (English)
      const userLocale = wpUserData.locale || '';
      
      // Map WordPress locale to our language codes
      let languageCode = 'vi'; // default to Vietnamese
      if (userLocale.startsWith('ko')) {
        languageCode = 'ko';
      } else if (userLocale.startsWith('en')) {
        languageCode = 'en';
      } else if (userLocale.startsWith('vi')) {
        languageCode = 'vi';
      }
      
      console.log('[WordPress] User locale:', userLocale, '-> Language code:', languageCode);
      
      res.json({
        locale: userLocale,
        languageCode: languageCode,
      });
    } catch (error) {
      console.error('[WordPress] User language fetch error:', error);
      res.status(500).json({ error: "언어 설정을 가져올 수 없습니다" });
    }
  });

  // Login with WordPress Application Password (Basic Auth)
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "아이디와 Application Password가 필요합니다" });
      }

      const siteUrl = process.env.WORDPRESS_SITE_URL || "https://chomotchat.com";
      
      console.log('[Login] Attempting WordPress authentication for user:', username);
      
      // Create Basic Auth header (username:app_password encoded in base64)
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      const authHeader = `Basic ${credentials}`;

      // Authenticate with WordPress REST API using Application Password
      const wpUserResponse = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!wpUserResponse.ok) {
        console.error('[Login] WordPress authentication failed:', wpUserResponse.status);
        const errorText = await wpUserResponse.text();
        console.error('[Login] Error response:', errorText.substring(0, 200));
        
        return res.status(401).json({ 
          error: "아이디 또는 Application Password가 올바르지 않습니다" 
        });
      }

      const wpUser = await wpUserResponse.json();
      
      console.log('[Login] WordPress user authenticated:', {
        id: wpUser.id,
        username: wpUser.slug,
        name: wpUser.name,
        email: wpUser.email
      });

      const wordpressUserId = wpUser.id;
      const displayName = wpUser.name || username;
      const avatarUrl = wpUser.avatar_urls?.['96'] || null;
      const email = wpUser.email || null;

      // Check if user exists in local database
      let user = await storage.getUserByWordPressId(wordpressUserId);

      if (!user) {
        // Create new local user
        console.log('[Login] Creating new local user');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        
        user = await storage.createUser({
          username: wpUser.slug || username,
          password: randomPassword,
        });

        user = await storage.updateUser(user.id, {
          wordpressUserId: wordpressUserId,
          wordpressLoginUsername: username, // Store original login username/email
          displayName: displayName,
          avatarUrl: avatarUrl,
          wordpressEmail: email,
          // Store encrypted Application Password for WordPress Media Library uploads
          wordpressAccessToken: encryptToken(password),
          wordpressRefreshToken: null,
          wordpressTokenExpiry: null, // Application Passwords don't expire
        });
      } else {
        console.log('[Login] User exists, updating info and Application Password');
        // Update existing user info and Application Password
        user = await storage.updateUser(user.id, {
          wordpressLoginUsername: username, // Update original login username/email
          displayName: displayName,
          avatarUrl: avatarUrl,
          wordpressEmail: email,
          // Update encrypted Application Password
          wordpressAccessToken: encryptToken(password),
          wordpressRefreshToken: null,
          wordpressTokenExpiry: null,
        });
      }

      // Set session
      req.session.userId = user!.id;
      req.session.save((err) => {
        if (err) {
          console.error('[Login] Session save error:', err);
          return res.status(500).json({ error: "세션 저장 실패" });
        }
        
        console.log('[Login] User logged in successfully:', user!.id);
        res.json({
          success: true,
          user: {
            id: user!.id,
            username: user!.username,
            displayName: user!.displayName,
            avatarUrl: user!.avatarUrl,
          },
        });
      });
    } catch (error) {
      console.error('[Login] Error:', error);
      res.status(500).json({ 
        error: '로그인 처리 중 오류가 발생했습니다',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('[API] Logout error:', err);
        return res.status(500).json({ error: '로그아웃 실패' });
      }
      // Clear session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
      });
      console.log('[API] User logged out successfully');
      res.json({ success: true, message: '로그아웃되었습니다' });
    });
  });

  // Serve public objects from object storage
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Comprehensive WordPress API diagnostics endpoint
  app.get("/api/wordpress/diagnostics", async (req, res) => {
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
      },
    };

    // Test 1: Environment Variables
    console.log('\n=== WordPress API Diagnostics ===\n');
    
    const siteUrl = process.env.WORDPRESS_SITE_URL;
    const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
    const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;
    const oauthClientId = process.env.WORDPRESS_OAUTH_CLIENT_ID;
    const oauthClientSecret = process.env.WORDPRESS_OAUTH_CLIENT_SECRET;

    results.tests.environmentVariables = {
      name: "Environment Variables",
      status: "checking",
      details: {
        WORDPRESS_SITE_URL: siteUrl ? `✓ Set (${siteUrl})` : "✗ Missing",
        WORDPRESS_CONSUMER_KEY: consumerKey ? `✓ Set (${consumerKey.substring(0, 10)}...)` : "✗ Missing",
        WORDPRESS_CONSUMER_SECRET: consumerSecret ? `✓ Set (${consumerSecret.substring(0, 10)}...)` : "✗ Missing",
        WORDPRESS_OAUTH_CLIENT_ID: oauthClientId ? `✓ Set (${oauthClientId})` : "✗ Missing",
        WORDPRESS_OAUTH_CLIENT_SECRET: oauthClientSecret ? `✓ Set (${oauthClientSecret.substring(0, 10)}...)` : "✗ Missing",
      },
    };

    const allEnvVarsSet = siteUrl && consumerKey && consumerSecret && oauthClientId && oauthClientSecret;
    results.tests.environmentVariables.status = allEnvVarsSet ? "passed" : "failed";
    results.summary.total++;
    if (allEnvVarsSet) results.summary.passed++;
    else results.summary.failed++;

    if (!siteUrl) {
      return res.json(results);
    }

    // Test 2: WooCommerce REST API
    results.summary.total++;
    try {
      console.log('[Diagnostics] Testing WooCommerce REST API...');
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const wcResponse = await fetch(`${siteUrl}/wp-json/wc/v3/products?per_page=1`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      results.tests.wooCommerceAPI = {
        name: "WooCommerce REST API",
        endpoint: `${siteUrl}/wp-json/wc/v3/products`,
        status: wcResponse.ok ? "passed" : "failed",
        httpStatus: wcResponse.status,
        details: wcResponse.ok 
          ? `✓ Successfully connected to WooCommerce API`
          : `✗ HTTP ${wcResponse.status}: ${wcResponse.statusText}`,
      };

      if (wcResponse.ok) {
        const products = await wcResponse.json();
        results.tests.wooCommerceAPI.productsFound = products.length;
        results.summary.passed++;
      } else {
        const errorData = await wcResponse.text();
        results.tests.wooCommerceAPI.error = errorData.substring(0, 200);
        results.summary.failed++;
      }
    } catch (error) {
      results.tests.wooCommerceAPI = {
        name: "WooCommerce REST API",
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      results.summary.failed++;
    }

    // Test 3: miniOrange OAuth Token Endpoint
    results.summary.total++;
    try {
      console.log('[Diagnostics] Testing miniOrange OAuth token endpoint...');
      const tokenUrl = `${siteUrl}/wp-json/moserver/token`;
      
      // Just check if endpoint exists (without credentials)
      const tokenCheckResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: oauthClientId || '',
          client_secret: oauthClientSecret || '',
        }).toString(),
      });

      const contentType = tokenCheckResponse.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      results.tests.oauthTokenEndpoint = {
        name: "miniOrange OAuth Token Endpoint",
        endpoint: tokenUrl,
        httpStatus: tokenCheckResponse.status,
        contentType: contentType,
        isJson: isJson,
        status: isJson ? "passed" : "failed",
        details: isJson 
          ? `✓ Token endpoint is responding with JSON`
          : `✗ Token endpoint returning ${contentType} instead of JSON - Check miniOrange plugin configuration`,
      };

      if (isJson) {
        results.summary.passed++;
        const tokenData = await tokenCheckResponse.json();
        if (tokenData.error) {
          results.tests.oauthTokenEndpoint.oauthError = tokenData.error;
          results.tests.oauthTokenEndpoint.oauthErrorDescription = tokenData.error_description;
        }
      } else {
        results.summary.failed++;
        const responseText = await tokenCheckResponse.text();
        results.tests.oauthTokenEndpoint.responsePreview = responseText.substring(0, 300);
      }
    } catch (error) {
      results.tests.oauthTokenEndpoint = {
        name: "miniOrange OAuth Token Endpoint",
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      results.summary.failed++;
    }

    // Test 4: Check if Password Grant is supported
    results.summary.total++;
    results.tests.passwordGrantCheck = {
      name: "Password Grant Type Check",
      status: "info",
      details: "Password grant type must be enabled in miniOrange plugin settings",
      instructions: [
        "1. Go to WordPress Admin → miniOAuth Server",
        "2. Navigate to Applications/Clients",
        "3. Find your client (" + (oauthClientId || "N/A") + ")",
        "4. Enable 'Resource Owner Password Credentials Grant'",
        "5. Save settings",
      ],
    };

    // Test 5: WordPress REST API (general)
    results.summary.total++;
    try {
      console.log('[Diagnostics] Testing WordPress REST API...');
      const wpResponse = await fetch(`${siteUrl}/wp-json/`);
      
      results.tests.wordpressRestAPI = {
        name: "WordPress REST API",
        endpoint: `${siteUrl}/wp-json/`,
        status: wpResponse.ok ? "passed" : "failed",
        httpStatus: wpResponse.status,
        details: wpResponse.ok 
          ? `✓ WordPress REST API is accessible`
          : `✗ HTTP ${wpResponse.status}: ${wpResponse.statusText}`,
      };

      if (wpResponse.ok) {
        const wpData = await wpResponse.json();
        results.tests.wordpressRestAPI.siteName = wpData.name;
        results.tests.wordpressRestAPI.siteDescription = wpData.description;
        results.summary.passed++;
      } else {
        results.summary.failed++;
      }
    } catch (error) {
      results.tests.wordpressRestAPI = {
        name: "WordPress REST API",
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      results.summary.failed++;
    }

    console.log('\n=== Diagnostics Summary ===');
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log('===========================\n');

    res.json(results);
  });

  // WordPress REST API test endpoint
  app.get("/api/wordpress/test", async (req, res) => {
    try {
      const siteUrl = process.env.WORDPRESS_SITE_URL;
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ 
          success: false,
          error: "WordPress credentials가 설정되지 않았습니다" 
        });
      }

      // Test WooCommerce REST API - get products
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const url = `${siteUrl}/wp-json/wc/v3/products?per_page=5`;
      
      console.log('[WordPress] Testing connection to:', siteUrl);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[WordPress] API Error:', data);
        return res.status(response.status).json({
          success: false,
          error: data.message || 'WordPress API 요청 실패',
          details: data
        });
      }

      console.log('[WordPress] Successfully connected! Found products:', data.length);
      
      res.json({
        success: true,
        message: 'WordPress REST API 연동 성공!',
        siteUrl,
        productsCount: data.length,
        products: data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          status: p.status
        }))
      });
    } catch (error) {
      console.error('[WordPress] Connection error:', error);
      res.status(500).json({ 
        success: false,
        error: 'WordPress 연결 실패',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // WordPress single product endpoint with WPML language support
  app.get("/api/wordpress/products/:id", async (req, res) => {
    try {
      const siteUrl = process.env.WORDPRESS_SITE_URL;
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ error: "WordPress credentials가 설정되지 않았습니다" });
      }

      const { id } = req.params;
      const { lang } = req.query; // WPML language parameter
      
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      // First, fetch the original product to get translations
      let url = `${siteUrl}/wp-json/wc/v3/products/${id}`;
      
      console.log('[WordPress] Fetching single product:', id, 'lang:', lang || 'default');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[WordPress] Product fetch failed:', data);
        return res.status(response.status).json({
          error: data.message || 'WordPress 제품 조회 실패',
          details: data
        });
      }

      console.log('[WordPress] Product fetched successfully:', data.id, 'translations:', data.translations, 'lang:', data.lang);

      // Extract owner WordPress ID from metadata or post_author
      const getOwnerWordPressId = (product: any): number | null => {
        const authorWpIdMeta = product.meta_data?.find((m: any) => m.key === '_chomotchat_author_wp_id');
        if (authorWpIdMeta?.value) {
          return parseInt(authorWpIdMeta.value, 10);
        }
        // Fallback to post_author if available (WooCommerce may include this)
        if (product.post_author) {
          return parseInt(product.post_author, 10);
        }
        return null;
      };

      // If language is specified and different from current, fetch the translated product
      if (lang && data.translations && data.lang !== lang) {
        const translatedId = data.translations[lang as string];
        
        if (translatedId && translatedId !== String(data.id)) {
          console.log('[WordPress] Fetching translated product:', translatedId, 'for lang:', lang);
          
          const translatedUrl = `${siteUrl}/wp-json/wc/v3/products/${translatedId}`;
          const translatedResponse = await fetch(translatedUrl, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
          });

          if (translatedResponse.ok) {
            const translatedData = await translatedResponse.json();
            console.log('[WordPress] Translated product fetched:', translatedData.id, translatedData.name);
            
            return res.json({
              success: true,
              product: translatedData,
              originalId: data.id,
              requestedLang: lang,
            });
          }
        }
      }

      res.json({
        success: true,
        product: data,
      });
    } catch (error) {
      console.error('[WordPress] Product fetch error:', error);
      res.status(500).json({ 
        error: 'WordPress 제품 조회 실패',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // WPML translations endpoint - get available translations for a product
  app.get("/api/wordpress/products/:id/translations", async (req, res) => {
    try {
      const siteUrl = process.env.WORDPRESS_SITE_URL;
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ error: "WordPress credentials가 설정되지 않았습니다" });
      }

      const { id } = req.params;
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      console.log('[WPML] Fetching translations for product:', id);

      // Fetch the product to get its translations field
      const productUrl = `${siteUrl}/wp-json/wc/v3/products/${id}`;
      const productResponse = await fetch(productUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!productResponse.ok) {
        return res.status(productResponse.status).json({
          error: 'WordPress 상품 조회 실패',
        });
      }

      const productData = await productResponse.json();
      console.log('[WPML] Product data - lang:', productData.lang, 'translations:', productData.translations);

      // Extract translations from product data
      const translations = productData.translations || {};
      const currentLang = productData.lang || 'vi';
      
      // Build available translations list
      const availableTranslations: { [key: string]: { id: number; name: string; available: boolean } } = {};
      
      for (const [langCode, translatedId] of Object.entries(translations)) {
        if (translatedId) {
          availableTranslations[langCode] = {
            id: parseInt(translatedId as string, 10),
            name: langCode === currentLang ? productData.name : '',
            available: true,
          };
        }
      }

      console.log('[WPML] Available translations:', availableTranslations);

      res.json({
        success: true,
        translations: availableTranslations,
        currentLang,
      });
    } catch (error) {
      console.error('[WPML] Translations fetch error:', error);
      res.status(500).json({ 
        error: 'WPML 번역 조회 실패',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // WordPress categories endpoint
  app.get("/api/wordpress/categories", async (req, res) => {
    try {
      const siteUrl = process.env.WORDPRESS_SITE_URL;
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ 
          success: false,
          error: "WordPress credentials가 설정되지 않았습니다" 
        });
      }

      const { per_page = 100, hide_empty = false } = req.query;
      
      const params = new URLSearchParams({
        per_page: String(per_page),
        hide_empty: String(hide_empty),
      });

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const url = `${siteUrl}/wp-json/wc/v3/products/categories?${params.toString()}`;
      
      console.log('[WordPress] Fetching categories from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[WordPress] Categories fetch failed:', data);
        return res.status(response.status).json({
          success: false,
          error: data.message || 'WordPress 카테고리 조회 실패',
          details: data
        });
      }

      console.log('[WordPress] Categories fetched successfully:', data.length);

      res.json({
        success: true,
        categories: data,
      });
    } catch (error) {
      console.error('[WordPress] Categories fetch error:', error);
      res.status(500).json({ 
        success: false,
        error: 'WordPress 카테고리 조회 실패',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // WordPress products endpoint with location filtering and language support
  app.get("/api/wordpress/products", async (req, res) => {
    try {
      const siteUrl = process.env.WORDPRESS_SITE_URL;
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      console.log('[WordPress] Environment check:', {
        hasSiteUrl: !!siteUrl,
        siteUrl: siteUrl,
        hasConsumerKey: !!consumerKey,
        consumerKeyPrefix: consumerKey?.substring(0, 10),
        hasConsumerSecret: !!consumerSecret,
        consumerSecretPrefix: consumerSecret?.substring(0, 10)
      });

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ error: "WordPress credentials가 설정되지 않았습니다" });
      }

      const { page = 1, per_page = 20, search, category, status = 'publish', lang, country } = req.query;
      
      // Build query parameters - always fetch ALL languages using WPML's lang=all
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(per_page),
        status: String(status),
        lang: 'all', // Fetch products from all languages (Korean, Vietnamese, English)
      });

      if (search) params.append('search', String(search));
      if (category) params.append('category', String(category));

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const url = `${siteUrl}/wp-json/wc/v3/products?${params.toString()}`;
      
      console.log('[WordPress] Fetching products from:', url, 'lang:', lang);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[WordPress] Response status:', response.status);
      console.log('[WordPress] Response headers:', {
        contentType: response.headers.get('content-type'),
        wpTotal: response.headers.get('X-WP-Total')
      });

      const responseText = await response.text();
      console.log('[WordPress] Response preview:', responseText.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[WordPress] JSON parse error:', parseError);
        console.error('[WordPress] Response body (first 500 chars):', responseText.substring(0, 500));
        return res.status(500).json({ 
          error: 'WordPress API returned invalid JSON',
          details: 'Response was not valid JSON. Check server logs for details.'
        });
      }
      
      if (!response.ok) {
        return res.status(response.status).json({
          error: data.message || 'WordPress API 요청 실패',
          details: data
        });
      }

      // WPML language consolidation logic:
      // 1. Group products by translation relationship
      // 2. If a Korean/English product has Vietnamese translation, use Vietnamese version
      // 3. If no Vietnamese translation exists, show product in original language
      if (Array.isArray(data)) {
        console.log('[WordPress] Processing', data.length, 'products with WPML consolidation');
        
        // Track which products we've already processed (to avoid duplicates from translation groups)
        const processedTranslationGroups = new Set<string>();
        const consolidatedProducts: any[] = [];
        
        for (const product of data) {
          const productLang = product.lang || 'vi';
          const translations = product.translations || {};
          
          // Create a unique key for this translation group (smallest ID among all translations)
          const translationIds = Object.values(translations).map(id => Number(id)).filter(id => !isNaN(id));
          const groupKey = translationIds.length > 0 ? String(Math.min(...translationIds)) : String(product.id);
          
          // Skip if we already processed this translation group
          if (processedTranslationGroups.has(groupKey)) {
            console.log('[WordPress] Skipping product', product.id, '- already processed translation group', groupKey);
            continue;
          }
          processedTranslationGroups.add(groupKey);
          
          // Check if this product has a Vietnamese translation
          const viTranslationId = translations.vi;
          
          if (productLang === 'vi') {
            // Product is already in Vietnamese, use it directly
            console.log('[WordPress] Product', product.id, 'is Vietnamese, using directly');
            consolidatedProducts.push(product);
          } else if (viTranslationId && String(viTranslationId) !== String(product.id)) {
            // Product has a Vietnamese translation, fetch and use that
            console.log('[WordPress] Product', product.id, '(lang:', productLang, ') has Vietnamese translation:', viTranslationId);
            try {
              const viUrl = `${siteUrl}/wp-json/wc/v3/products/${viTranslationId}`;
              const viResponse = await fetch(viUrl, {
                headers: {
                  'Authorization': `Basic ${auth}`,
                  'Content-Type': 'application/json',
                },
              });
              
              if (viResponse.ok) {
                const viProduct = await viResponse.json();
                console.log('[WordPress] Using Vietnamese version:', viProduct.id, viProduct.name);
                consolidatedProducts.push(viProduct);
              } else {
                // Fallback to original if Vietnamese fetch fails
                console.log('[WordPress] Vietnamese fetch failed, using original product', product.id);
                consolidatedProducts.push(product);
              }
            } catch (error) {
              console.error('[WordPress] Error fetching Vietnamese translation:', error);
              consolidatedProducts.push(product);
            }
          } else {
            // No Vietnamese translation exists, use product in original language
            console.log('[WordPress] Product', product.id, '(lang:', productLang, ') has no Vietnamese translation, using original');
            consolidatedProducts.push(product);
          }
        }
        
        console.log('[WordPress] Consolidated', data.length, 'products to', consolidatedProducts.length, 'unique products');
        
        // Apply country filter if provided
        let filteredProducts = consolidatedProducts;
        if (country) {
          const countryFilter = String(country).toUpperCase();
          console.log('[WordPress] Filtering products by country:', countryFilter);
          
          filteredProducts = consolidatedProducts.filter((product: any) => {
            const productCountry = product.meta_data?.find((m: any) => m.key === '_chomotchat_country')?.value;
            
            // If product has country metadata, check for match
            if (productCountry) {
              const matches = String(productCountry).toUpperCase() === countryFilter;
              if (!matches) {
                console.log('[WordPress] Product', product.id, 'filtered out (country:', productCountry, ')');
              }
              return matches;
            }
            
            // For legacy products without country metadata, include them (they'll be updated later)
            console.log('[WordPress] Product', product.id, 'has no country metadata, including in results');
            return true;
          });
          
          console.log('[WordPress] After country filter:', filteredProducts.length, 'products remaining');
        }
        
        res.json({
          success: true,
          products: filteredProducts,
          total: filteredProducts.length,
          totalPages: response.headers.get('X-WP-TotalPages'),
        });
      } else {
        res.json({
          success: true,
          products: data,
          total: response.headers.get('X-WP-Total'),
          totalPages: response.headers.get('X-WP-TotalPages'),
        });
      }
    } catch (error) {
      console.error('[WordPress] Products fetch error:', error);
      res.status(500).json({ error: 'WordPress 제품 조회 실패' });
    }
  });

  // WordPress create product endpoint
  app.post("/api/wordpress/products", async (req, res) => {
    try {
      // Require authentication to create products
      if (!req.session?.userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      const siteUrl = process.env.WORDPRESS_SITE_URL;
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ error: "WordPress credentials가 설정되지 않았습니다" });
      }

      const { 
        title, 
        description, 
        price, 
        category,
        images,
        wordpressMediaIds,
        latitude,
        longitude,
        preferredLocation,
        preferredTime,
        usagePeriod,
        language = 'vi', // WPML language parameter, default to Vietnamese
        countryCode = '' // ISO country code from geocoder
      } = req.body;

      console.log('[WordPress] Creating product:', title, 'in language:', language, 'by user:', req.session.userId);

      // Get current user's wordpressUserId from database
      let currentUserWpId: string | null = null;
      const currentUser = await storage.getUser(req.session.userId);
      if (currentUser?.wordpressUserId) {
        currentUserWpId = String(currentUser.wordpressUserId);
      }

      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

      // Fetch WordPress categories to map category name to ID
      let categoryIds: number[] = [];
      if (category) {
        try {
          console.log('[WordPress] Fetching categories to find ID for:', category);
          const categoriesResponse = await fetch(
            `${siteUrl}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=false`,
            {
              headers: {
                'Authorization': `Basic ${auth}`,
              }
            }
          );
          
          if (categoriesResponse.ok) {
            const categories = await categoriesResponse.json();
            const matchedCategory = categories.find((cat: any) => cat.name === category);
            if (matchedCategory) {
              categoryIds = [matchedCategory.id];
              console.log('[WordPress] Found category ID:', matchedCategory.id, 'for', category);
            } else {
              console.log('[WordPress] Category not found in WooCommerce:', category);
            }
          }
        } catch (err) {
          console.error('[WordPress] Error fetching categories:', err);
        }
      }

      // Use pre-uploaded WordPress media IDs or upload images
      let imageIds: number[] = [];
      
      if (wordpressMediaIds && wordpressMediaIds.length > 0) {
        // Filter out null/undefined values
        imageIds = wordpressMediaIds.filter((id: number | null) => id !== null && id !== undefined) as number[];
        
        if (imageIds.length > 0) {
          console.log('[WordPress] Using pre-uploaded media IDs:', imageIds);
        }
      }
      
      // Fallback: Upload images to WordPress Media Library if no valid media IDs
      if (imageIds.length === 0 && images && images.length > 0) {
        console.log('[WordPress] Uploading', images.length, 'images to Media Library (fallback)');
        
        for (const imageUrl of images) {
          try {
            // Fetch image from our object storage
            const fullUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;
            const imageResponse = await fetch(fullUrl);
            const imageBuffer = await imageResponse.arrayBuffer();
            const filename = imageUrl.split('/').pop() || 'image.jpg';

            // Upload to WordPress
            const mediaResponse = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'image/jpeg',
                'Content-Disposition': `attachment; filename="${filename}"`,
              },
              body: imageBuffer,
            });

            if (mediaResponse.ok) {
              const mediaData = await mediaResponse.json();
              imageIds.push(mediaData.id);
              console.log('[WordPress] Image uploaded, ID:', mediaData.id);
            } else {
              console.error('[WordPress] Image upload failed:', await mediaResponse.text());
            }
          } catch (err) {
            console.error('[WordPress] Error uploading image:', err);
          }
        }
      }

      // Build rich description with additional information
      let fullDescription = `<div class="chomotchat-description">
        <h3>Mô tả sản phẩm</h3>
        <p>${description}</p>
      </div>`;

      // Add additional information section to description
      if (usagePeriod || preferredLocation || preferredTime) {
        fullDescription += `<div class="chomotchat-additional-info" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <h3 style="margin-top: 0;">Thông tin bổ sung</h3>
          <ul style="list-style: none; padding: 0;">`;
        
        if (usagePeriod) {
          fullDescription += `<li style="margin-bottom: 10px;">
            <strong>⏰ Thời gian sử dụng:</strong> ${usagePeriod}
          </li>`;
        }
        
        if (preferredLocation) {
          fullDescription += `<li style="margin-bottom: 10px;">
            <strong>📍 Địa điểm gặp mặt mong muốn:</strong> ${preferredLocation}
          </li>`;
        }
        
        if (preferredTime) {
          fullDescription += `<li style="margin-bottom: 10px;">
            <strong>🕐 Thời gian gặp mặt mong muốn:</strong> ${preferredTime}
          </li>`;
        }
        
        fullDescription += `</ul></div>`;
      }

      // Build WooCommerce product attributes for "Additional Information" tab
      const attributes: any[] = [];
      
      if (usagePeriod) {
        attributes.push({
          name: 'Thời gian sử dụng',
          position: 0,
          visible: true,
          variation: false,
          options: [usagePeriod]
        });
      }
      
      if (preferredLocation) {
        attributes.push({
          name: 'Địa điểm gặp mặt',
          position: 1,
          visible: true,
          variation: false,
          options: [preferredLocation]
        });
      }
      
      if (preferredTime) {
        attributes.push({
          name: 'Thời gian gặp mặt',
          position: 2,
          visible: true,
          variation: false,
          options: [preferredTime]
        });
      }

      // Add coordinates as attribute for reference
      if (latitude && longitude) {
        attributes.push({
          name: 'Vị trí',
          position: 3,
          visible: true,
          variation: false,
          options: [`${latitude}, ${longitude}`]
        });
      }

      // Create WooCommerce product
      const productData: any = {
        name: title,
        type: 'simple',
        regular_price: String(price),
        description: fullDescription,
        short_description: description.substring(0, 100),
        status: 'publish',
        images: imageIds.map((id: number, index: number) => ({
          id,
          position: index
        })),
        attributes: attributes,
        meta_data: [
          { key: '_chomotchat_latitude', value: String(latitude) },
          { key: '_chomotchat_longitude', value: String(longitude) },
          { key: '_chomotchat_preferred_location', value: preferredLocation || '' },
          { key: '_chomotchat_preferred_time', value: preferredTime || '' },
          { key: '_chomotchat_usage_period', value: usagePeriod || '' },
          { key: '_chomotchat_category', value: category || '' },
          { key: '_chomotchat_country', value: countryCode || '' },
          { key: '_chomotchat_author_id', value: req.session?.userId || '' },
          { key: '_chomotchat_author_wp_id', value: currentUserWpId || '' },
        ]
      };

      // Add categories if found
      if (categoryIds.length > 0) {
        productData.categories = categoryIds.map(id => ({ id }));
        console.log('[WordPress] Adding categories to product:', categoryIds);
      }

      console.log('[WordPress] Adding', attributes.length, 'attributes to product');

      // Add WPML language to meta_data for language tracking
      productData.meta_data.push({ key: '_wpml_language', value: language });

      console.log('[WordPress] Creating product with data:', { 
        name: productData.name, 
        price: productData.regular_price,
        imageCount: imageIds.length,
        language: language
      });

      // Add WPML language parameter to the API URL
      const apiUrl = `${siteUrl}/wp-json/wc/v3/products?lang=${language}`;
      console.log('[WordPress] API URL with language:', apiUrl);

      const productResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const productResult = await productResponse.json();

      if (!productResponse.ok) {
        console.error('[WordPress] Product creation failed:', productResult);
        return res.status(productResponse.status).json({
          error: productResult.message || 'WordPress 제품 생성 실패',
          details: productResult
        });
      }

      console.log('[WordPress] Product created successfully, ID:', productResult.id);

      res.json({
        success: true,
        product: productResult,
        wordpressId: productResult.id,
      });
    } catch (error) {
      console.error('[WordPress] Product creation error:', error);
      res.status(500).json({ 
        error: 'WordPress 제품 생성 실패',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // WordPress update product endpoint (with ownership verification)
  app.put("/api/wordpress/products/:id", async (req, res) => {
    try {
      const siteUrl = process.env.WORDPRESS_SITE_URL;
      const consumerKey = process.env.WORDPRESS_CONSUMER_KEY;
      const consumerSecret = process.env.WORDPRESS_CONSUMER_SECRET;

      if (!siteUrl || !consumerKey || !consumerSecret) {
        return res.status(500).json({ error: "WordPress credentials가 설정되지 않았습니다" });
      }

      // Check if user is authenticated
      if (!req.session?.userId) {
        return res.status(401).json({ error: "로그인이 필요합니다" });
      }

      const { id } = req.params;
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

      // First, fetch the product to verify ownership
      const productUrl = `${siteUrl}/wp-json/wc/v3/products/${id}`;
      const productResponse = await fetch(productUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (!productResponse.ok) {
        return res.status(404).json({ error: "상품을 찾을 수 없습니다" });
      }

      const existingProduct = await productResponse.json();
      
      // Check ownership via meta_data
      const authorIdMeta = existingProduct.meta_data?.find((m: any) => m.key === '_chomotchat_author_id');
      const authorWpIdMeta = existingProduct.meta_data?.find((m: any) => m.key === '_chomotchat_author_wp_id');
      
      const productAuthorId = authorIdMeta?.value;
      const productAuthorWpId = authorWpIdMeta?.value;
      const currentUserId = req.session.userId;
      
      // Get current user's wordpressUserId from database
      let currentUserWpId: string | null = null;
      const currentUser = await storage.getUser(currentUserId);
      if (currentUser?.wordpressUserId) {
        currentUserWpId = String(currentUser.wordpressUserId);
      }

      // Check if product has ownership metadata
      const hasOwnershipMetadata = productAuthorId || productAuthorWpId;
      
      // Verify ownership (or allow editing legacy products without ownership)
      const isOwner = (productAuthorId && productAuthorId === currentUserId) || 
                      (productAuthorWpId && currentUserWpId && productAuthorWpId === currentUserWpId);

      // If product has ownership metadata but user is not owner, deny access
      if (hasOwnershipMetadata && !isOwner) {
        console.log('[WordPress] Ownership check failed:', { productAuthorId, productAuthorWpId, currentUserId, currentUserWpId });
        return res.status(403).json({ error: "이 상품을 수정할 권한이 없습니다" });
      }
      
      // If legacy product (no ownership), log that we'll claim ownership
      if (!hasOwnershipMetadata) {
        console.log('[WordPress] Legacy product detected, will claim ownership for user:', currentUserId);
      }

      const { 
        title, 
        description, 
        price, 
        category,
        images,
        wordpressMediaIds,
        latitude,
        longitude,
        preferredLocation,
        preferredTime,
        usagePeriod,
        countryCode,
      } = req.body;

      console.log('[WordPress] Updating product:', id, 'by user:', currentUserId);

      // Prepare update data
      const updateData: any = {};

      if (title) updateData.name = title;
      if (price) updateData.regular_price = String(price);
      
      if (description) {
        let fullDescription = `<div class="chomotchat-description">
          <h3>Mô tả sản phẩm</h3>
          <p>${description}</p>
        </div>`;

        if (usagePeriod || preferredLocation || preferredTime) {
          fullDescription += `<div class="chomotchat-additional-info" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
            <h3 style="margin-top: 0;">Thông tin bổ sung</h3>
            <ul style="list-style: none; padding: 0;">`;
          
          if (usagePeriod) {
            fullDescription += `<li style="margin-bottom: 10px;"><strong>⏰ Thời gian sử dụng:</strong> ${usagePeriod}</li>`;
          }
          if (preferredLocation) {
            fullDescription += `<li style="margin-bottom: 10px;"><strong>📍 Địa điểm gặp mặt mong muốn:</strong> ${preferredLocation}</li>`;
          }
          if (preferredTime) {
            fullDescription += `<li style="margin-bottom: 10px;"><strong>🕐 Thời gian gặp mặt mong muốn:</strong> ${preferredTime}</li>`;
          }
          
          fullDescription += `</ul></div>`;
        }
        
        updateData.description = fullDescription;
        updateData.short_description = description.substring(0, 100);
      }

      // Handle images if provided - only update if new images are explicitly provided
      if (wordpressMediaIds && Array.isArray(wordpressMediaIds) && wordpressMediaIds.length > 0) {
        const validImageIds = wordpressMediaIds.filter((id: number | null) => id !== null && id !== undefined);
        if (validImageIds.length > 0) {
          updateData.images = validImageIds.map((id: number, index: number) => ({
            id,
            position: index
          }));
        }
        // Don't send empty images array to avoid unintentionally removing photos
      }

      // Update meta_data - preserve author info
      updateData.meta_data = [];
      if (latitude !== undefined) updateData.meta_data.push({ key: '_chomotchat_latitude', value: String(latitude) });
      if (longitude !== undefined) updateData.meta_data.push({ key: '_chomotchat_longitude', value: String(longitude) });
      if (preferredLocation !== undefined) updateData.meta_data.push({ key: '_chomotchat_preferred_location', value: preferredLocation || '' });
      if (preferredTime !== undefined) updateData.meta_data.push({ key: '_chomotchat_preferred_time', value: preferredTime || '' });
      if (usagePeriod !== undefined) updateData.meta_data.push({ key: '_chomotchat_usage_period', value: usagePeriod || '' });
      if (category !== undefined) updateData.meta_data.push({ key: '_chomotchat_category', value: category || '' });
      if (countryCode !== undefined) updateData.meta_data.push({ key: '_chomotchat_country', value: countryCode || '' });
      
      // Always preserve author metadata
      updateData.meta_data.push({ key: '_chomotchat_author_id', value: currentUserId });
      if (currentUserWpId) {
        updateData.meta_data.push({ key: '_chomotchat_author_wp_id', value: currentUserWpId });
      }

      // Handle category update
      if (category) {
        try {
          const categoriesResponse = await fetch(
            `${siteUrl}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=false`,
            { headers: { 'Authorization': `Basic ${auth}` } }
          );
          
          if (categoriesResponse.ok) {
            const categories = await categoriesResponse.json();
            const matchedCategory = categories.find((cat: any) => cat.name === category);
            if (matchedCategory) {
              updateData.categories = [{ id: matchedCategory.id }];
            }
          }
        } catch (err) {
          console.error('[WordPress] Error fetching categories for update:', err);
        }
      }

      console.log('[WordPress] Sending update:', updateData);

      // Send update to WooCommerce
      const updateResponse = await fetch(productUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok) {
        console.error('[WordPress] Product update failed:', updateResult);
        return res.status(updateResponse.status).json({
          error: updateResult.message || 'WordPress 제품 수정 실패',
          details: updateResult
        });
      }

      console.log('[WordPress] Product updated successfully, ID:', updateResult.id);

      res.json({
        success: true,
        product: updateResult,
      });
    } catch (error) {
      console.error('[WordPress] Product update error:', error);
      res.status(500).json({ 
        error: 'WordPress 제품 수정 실패',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Geocoding API proxy endpoint
  app.get("/api/geocode", async (req, res) => {
    try {
      const { lat, lng, language = 'ko' } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "위도와 경도가 필요합니다" });
      }

      const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Maps API 키가 설정되지 않았습니다" });
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=${language}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address;
        res.json({ 
          success: true, 
          address: formattedAddress,
          fullResponse: data
        });
      } else {
        res.status(400).json({ 
          error: "주소를 찾을 수 없습니다", 
          status: data.status,
          message: data.error_message 
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ error: "주소 변환 실패" });
    }
  });

  // Image upload endpoint with error handling
  app.post("/api/upload-image", (req, res) => {
    console.log('[Server] Upload request received');
    
    upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('[Server] Multer error:', err);
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: '파일 크기가 5MB를 초과합니다' });
          }
          return res.status(400).json({ error: `파일 업로드 오류: ${err.message}` });
        }
        return res.status(400).json({ error: err.message });
      }

      try {
        console.log('[Server] File received:', req.file?.originalname);
        
        if (!req.file) {
          console.error('[Server] No file in request');
          return res.status(400).json({ error: "파일이 없습니다" });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = req.file.originalname.split('.').pop() || 'jpg';
        const filename = `product_${timestamp}_${randomStr}.${ext}`;

        // Primary: Upload to WordPress Media Library using OAuth 2.0
        let wordpressMediaId = null;
        let wordpressMediaUrl = null;
        
        try {
          const siteUrl = process.env.WORDPRESS_SITE_URL;
          const userId = req.session.userId;

          console.log('[Server] Upload check:', {
            hasSiteUrl: !!siteUrl,
            hasUserId: !!userId,
            siteUrl: siteUrl
          });

          if (siteUrl && userId) {
            // Get user's WordPress access token
            const user = await storage.getUser(userId);
            
            if (!user) {
              console.log('[Server] User not found, skipping WordPress upload');
            } else if (!user.wordpressAccessToken) {
              console.log('[Server] User not authenticated with WordPress, skipping WordPress upload');
            } else {
              console.log('[Server] Uploading to WordPress Media Library:', filename);
              console.log('[Server] File size:', req.file.buffer.length, 'bytes');
              console.log('[Server] File mimetype:', req.file.mimetype);
              
              // Decrypt Application Password
              const applicationPassword = decryptToken(user.wordpressAccessToken);
              // Use original login username/email (not the WordPress slug)
              const loginUsername = user.wordpressLoginUsername || user.wordpressEmail || user.username;
              
              // Create Basic Auth header (username:app_password encoded in base64)
              const credentials = Buffer.from(`${loginUsername}:${applicationPassword}`).toString('base64');
              const authHeader = `Basic ${credentials}`;
              
              console.log('[Server] Using Basic Auth with Application Password for user:', loginUsername);
              
              // Determine content type
              let contentType = req.file.mimetype;
              if (!contentType || contentType === 'application/octet-stream') {
                if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
                else if (ext === 'png') contentType = 'image/png';
                else if (ext === 'webp') contentType = 'image/webp';
                else contentType = 'image/jpeg';
              }
              
              console.log('[Server] Using content type:', contentType);
              
              const mediaUrl = `${siteUrl}/wp-json/wp/v2/media`;
              console.log('[Server] Sending request to:', mediaUrl);
              
              const mediaResponse = await fetch(mediaUrl, {
                method: 'POST',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': contentType,
                  'Content-Disposition': `attachment; filename="${filename}"`,
                },
                body: req.file.buffer,
              });

              console.log('[Server] WordPress response status:', mediaResponse.status);

              if (mediaResponse.ok) {
                const mediaData = await mediaResponse.json();
                wordpressMediaId = mediaData.id;
                wordpressMediaUrl = mediaData.source_url;
                console.log('[Server] WordPress upload successful, ID:', wordpressMediaId, 'URL:', wordpressMediaUrl);
              } else {
                const errorText = await mediaResponse.text();
                console.error('[Server] WordPress upload failed. Status:', mediaResponse.status);
                console.error('[Server] WordPress error response:', errorText);
              }
            }
          } else {
            console.log('[Server] WordPress site URL not configured or user not logged in, skipping WordPress upload');
          }
        } catch (wpError) {
          console.error('[Server] WordPress upload error:', wpError);
          if (wpError instanceof Error) {
            console.error('[Server] Error message:', wpError.message);
            console.error('[Server] Error stack:', wpError.stack);
          }
        }

        // Check if WordPress upload was successful
        if (!wordpressMediaUrl) {
          console.log('[Server] WordPress upload failed or user not logged in');
          return res.status(401).json({ 
            error: "이미지 업로드는 로그인이 필요합니다",
            details: "WordPress 계정으로 로그인한 후 이미지를 업로드할 수 있습니다."
          });
        }
        
        res.json({ 
          success: true, 
          url: wordpressMediaUrl,
          filename,
          wordpressMediaId,
          wordpressMediaUrl
        });
      } catch (error) {
        console.error('[Server] Upload error:', error);
        res.status(500).json({ error: "이미지 업로드 실패" });
      }
    });
  });

  // Chat room routes
  app.get("/api/chat-rooms", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "인증되지 않았습니다" });
      }
      const rooms = await storage.getChatRoomsByUser(req.session.userId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ error: "Failed to fetch chat rooms" });
    }
  });

  app.post("/api/chat-rooms", async (req, res) => {
    try {
      const { productId, buyerId, sellerId } = req.body;
      
      // Validate required fields
      if (!productId || !buyerId || !sellerId) {
        return res.status(400).json({ error: "productId, buyerId, and sellerId are required" });
      }
      
      // Check if room already exists
      const existing = await storage.getChatRoomByProductAndBuyer(productId, buyerId);
      if (existing) {
        return res.json(existing);
      }
      
      const room = await storage.createChatRoom({ productId, buyerId, sellerId });
      res.json(room);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ error: "Failed to create chat room" });
    }
  });

  app.get("/api/messages/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const messages = await storage.getMessagesByRoom(roomId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocketClient) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'join') {
          if (!message.userId || !message.roomId) {
            ws.send(JSON.stringify({ type: 'error', error: 'userId and roomId are required' }));
            return;
          }
          ws.userId = message.userId;
          ws.roomId = message.roomId;
          console.log(`User ${message.userId} joined room ${message.roomId}`);
        } else if (message.type === 'message') {
          // Validate message fields
          if (!message.roomId || !message.senderId || !message.content) {
            ws.send(JSON.stringify({ type: 'error', error: 'roomId, senderId, and content are required' }));
            return;
          }
          
          // Save message to storage
          const savedMessage = await storage.createMessage({
            roomId: message.roomId,
            senderId: message.senderId,
            content: message.content,
          });

          // Broadcast to all clients in the same room
          wss.clients.forEach((client) => {
            const wsClient = client as WebSocketClient;
            if (
              wsClient.readyState === WebSocket.OPEN &&
              wsClient.roomId === message.roomId
            ) {
              wsClient.send(JSON.stringify({
                type: 'message',
                message: savedMessage,
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', error: 'Failed to process message' }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}
