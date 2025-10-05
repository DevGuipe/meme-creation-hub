# Technical Documentation - Meme Maker Application
## Complete Guide for Rebuilding from Scratch

---

## 1. OVERVIEW

### 1.1 Application Purpose
This is a web application for creating memes that allows users to create, edit, save and share customized memes. The application is designed to work both as a Progressive Web App and integrated with messaging platforms (like Telegram), offering a fluid experience in multiple usage contexts.

### 1.2 Main Features
- **Visual Meme Editor**: Drag-and-drop interface with interactive canvas for composing memes using pre-defined templates, custom images and stylized texts
- **Template System**: Library of ready-made templates with different poses, bodies, heads and themed backgrounds
- **Personal Gallery**: Storage and management of memes created by the user
- **Gamification System**: Scoring and ranking for user engagement
- **Optimized Export**: Image generation in optimized format for sharing on social networks
- **Flexible Authentication**: Support for multiple authentication methods (WebApp, URL params, development mode)

### 1.3 Recommended Technology Stack
- **Frontend**: React 18+ with TypeScript, Vite as build tool
- **UI Framework**: Tailwind CSS for styling, Radix UI for accessible components
- **Canvas Engine**: Fabric.js v6 for visual element manipulation
- **Backend**: Supabase (PostgreSQL + Edge Functions Deno)
- **Storage**: Supabase Storage for image storage
- **State Management**: React Query for data caching and synchronization
- **Validation**: Zod for schema validation in both frontend and backend

---

## 2. APPLICATION ARCHITECTURE

### 2.1 Directory Structure

```
/src
  /components        → Reusable React components
    /ui             → Base UI components (shadcn)
    MemeEditor.tsx  → Main meme editor
    MemeGallery.tsx → User's meme gallery
    UserAuth.tsx    → Authentication component
    StatsDisplay.tsx → Statistics/score display
  /hooks            → Custom React hooks
    useMemeCanvas.tsx → Fabric.js canvas logic
  /lib              → Utilities and configurations
    constants.ts    → Application constants
    validations.ts  → Zod validation schemas
    logger.ts       → Logging system
    messages.ts     → Error/success messages
    utils.ts        → Utility functions
  /pages            → Application pages
    Index.tsx       → Main page
    NotFound.tsx    → 404 page
  /types            → TypeScript definitions
    index.ts        → Shared types
  /assets           → Static resources
    /backgrounds    → Background images
    /bodies         → Body sprites
    /heads          → Head sprites
    /props          → Decorative elements
    /templates      → Pre-assembled template structures
  /integrations     → External integrations
    /supabase       → Supabase client and types
  /utils            → Advanced utilities
    edgeInvoke.ts   → Wrapper for edge function calls
    errorHandling.ts → Centralized error handling
    retryLogic.ts   → Retry logic for critical operations

/supabase
  /functions        → Edge Functions (serverless backend)
    /save-meme      → Save meme to database
    /get-user-memes → Fetch user memes
    /delete-meme    → Delete meme
    /system-status  → System status
    /_shared        → Shared code between functions
  /migrations       → Database SQL migrations
  config.toml       → Supabase project configuration
```

### 2.2 Navigation Flow

The application has 4 main states/views:

1. **Auth** → Authentication screen (application entry)
2. **Home** → Main dashboard with statistics and main actions
3. **Editor** → Meme creation/editing interface
4. **Gallery** → List of memes saved by user

The flow is linear and controlled by a simple state machine:
- Auth → Home (after successful authentication)
- Home ↔ Editor (create new meme)
- Home ↔ Gallery (view saved memes)
- Editor → Gallery (after saving meme)

### 2.3 State Management

The application uses a combination of state management strategies:

- **Local State (useState)**: For temporary UI (modals, inputs, selections)
- **React Query**: For server data (memes, statistics, rankings)
  - Automatic caching with background revalidation
  - Retry logic for failed requests
  - Optimistic updates for better UX
- **Refs (useRef)**: For direct references to Fabric.js canvas and image caches
- **Context**: Not used (small application, acceptable props drilling)

---

## 3. AUTHENTICATION SYSTEM

### 3.1 General Concept

The authentication system is designed to be **flexible and multi-context**, supporting:

1. **WebApp Mode**: When running inside a WebApp (e.g.: Telegram MiniApp)
   - Uses WebApp JavaScript API to obtain user data
   - Automatically validates through platform-provided SDK

2. **URL Params Mode**: When opened via deep link/parameterized URL
   - Extracts userId, username and firstName from query params
   - Useful for direct sharing and deep linking

3. **Development Mode**: For local testing without external dependencies
   - Creates a mock user with fixed ID in reserved range
   - Allows development without need for real WebApp setup

### 3.2 Authentication Flow

**Step 1: Context Detection**
- Checks if window.Telegram.WebApp exists (running in WebApp)
- If yes, tries to extract data from window.Telegram.WebApp.initDataUnsafe.user
- If not, checks URL params (?tgUserId=123&tgUsername=john)
- As last resort, uses mock development user

**Step 2: Data Validation**
- All user data is validated with Zod schema
- Validates ID format (positive integer within allowed range)
- Validates username and first_name length

**Step 3: Registration/Verification in Database**
- Calls RPC function `check_user_exists_by_telegram_id` to check if user exists
- If doesn't exist, calls `create_user_if_not_exists` to create record
- Both functions use SECURITY DEFINER for RLS bypass
- Implements retry logic with exponential backoff for resilience

**Step 4: Success Callback**
- After validation and registration, fires callback `onAuthenticated(user)`
- Application transitions to 'home' state
- User data is stored in local state

### 3.3 Error Handling

The system implements specific error messages for each type of failure:
- **Network timeout**: "Connection timeout. Please check your internet and try again."
- **Invalid data**: Shows specific Zod validation error
- **Database error**: "Database connection failed. Please try again in a moment."
- **No data**: "No Telegram data found. Please open from Telegram app."

Each error shows a "Retry" button that reloads the application.

### 3.4 Security Considerations

- **Never blindly trust client data**: All validations are duplicated in backend
- **User IDs must not collide**: Reserved ranges system prevents conflicts between real and mock users
- **Don't store sensitive tokens in frontend**: If there are session tokens, must be in httpOnly cookies
- **Rate limiting**: Implement in backend to prevent abuse of registration endpoints

---

## 4. TEMPLATE AND ASSET SYSTEM

### 4.1 Asset Structure

Assets are organized in hierarchical categories:

**Base Categories:**
- **backgrounds**: Background images for meme (scenarios, textures)
- **bodies**: Body/posture sprites
- **heads**: Head/face sprites
- **props**: Decorative elements (accessories, objects, emojis)

**Recommended File Format:**
- PNG with transparency (alpha channel) for sprites
- JPG or WebP for backgrounds
- Ideal dimensions: 512x512 or 1024x1024 pixels
- Aggressive size optimization (target: <100KB per asset)

### 4.2 Template System

A **template** is a pre-defined composition of layers that creates a complete meme.

**Template Structure:**
```
Template = {
  key: string            // Unique identifier (e.g. 'classic_chad')
  name: string          // Friendly name ('Classic Chad')
  thumb_url: string     // Thumbnail URL for preview
  manifest_json: {
    layers: Layer[]     // Array of pre-configured layers
  }
}
```

**Layers within a Template:**
Each template defines a set of layers with pre-defined positions, scales and rotations. When user selects a template, these layers are loaded into editor and can be customized.

**Conceptual Manifest Example:**
```
{
  layers: [
    { type: 'background', content: 'gym', x: 50, y: 50, scale: 1, rotation: 0, zIndex: 0 },
    { type: 'body', content: 'warrior', x: 50, y: 65, scale: 0.8, rotation: 0, zIndex: 1 },
    { type: 'head', content: 'chad-face', x: 50, y: 35, scale: 0.6, rotation: 0, zIndex: 2 },
    { type: 'prop', content: 'trophy', x: 80, y: 30, scale: 0.4, rotation: 15, zIndex: 3 }
  ]
}
```

### 4.3 Asset Loading System

**Lazy Loading and Cache:**
- Assets are only loaded when needed (template selected or layer added)
- LRU (Least Recently Used) cache system to optimize memory
- Cache limit: 20 images or 50MB (whichever comes first)
- When limit is reached, removes least used assets

**Transparent Bounds Detection:**
The system implements a function that automatically detects visible pixels of a PNG image, ignoring transparent margins:
- Analyzes alpha channel of each pixel
- Calculates minX, minY, maxX, maxY of visible pixels
- Uses configurable threshold (default: 24/255 for general edges, 180/255 for bottom edge)
- Result: real sprite bounding box, allowing precise positioning

**Cross-Origin and CORS:**
All images must be loaded with `crossOrigin='anonymous'` to allow:
- Manipulation via Canvas API
- Export of composed images
- Upload to storage

---

## 5. MEME EDITOR (CANVAS)

### 5.1 Canvas Architecture

The editor uses **Fabric.js v6** as visual manipulation engine.

**Canvas Initialization:**
- Native HTML5 canvas as base
- Fabric.js instantiated over canvas
- Dimensions: 400x400px for editing (responsive)
- Solid white background
- `preserveObjectStacking: true` to maintain layer order

**Coordinate System:**
- Fabric internal coordinates: absolute pixels (0-400)
- Persistence coordinates: percentages (0-100)
- Automatic conversion in both directions
- Allows responsive canvas without breaking positioning

### 5.2 Layer System

Each element on canvas is represented as a **Layer**:

**Layer Structure:**
```
Layer = {
  id: string              // Unique UUID
  type: 'background' | 'body' | 'head' | 'prop' | 'text'
  content: string         // Asset key or literal text
  x: number              // X position (percentage 0-100)
  y: number              // Y position (percentage 0-100)
  scale: number          // Scale (1 = 100%)
  rotation: number       // Rotation in degrees (-360 to 360)
  zIndex: number         // Rendering order (0 = background)
  
  // Text-specific properties (optional):
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  textColor?: string
  strokeColor?: string
  strokeWidth?: number
  textAlign?: string
  textShadow?: string   // JSON stringified shadow settings
}
```

**Layer Types:**
1. **Image Layers** (background, body, head, prop): Render FabricImage
2. **Text Layers**: Render FabricText with complete styling

### 5.3 Bidirectional Synchronization

The system maintains constant synchronization between:
- **React State** (layers array)
- **Fabric.js State** (objects on canvas)

**React → Fabric (renderCanvas):**
- Fires when layers array changes
- Clears canvas and recreates all objects
- Preserves user transformations (position, scale, rotation) using transforms cache
- Uses render lock to avoid race conditions

**Fabric → React (syncFabricToLayers):**
- Fires when user modifies object on canvas (drag, scale, rotate)
- Debounced at 150ms to avoid excessive updates
- Converts Fabric coordinates to percentages
- Calculates scale relative to baseScale (scale that originally normalized image)
- Updates layers array via callback

### 5.4 Image Manipulation

**Loading:**
- All images are loaded via `loadImage` helper
- Checks cache first (O(1) lookup)
- If not in cache, creates new HTMLImageElement
- After loading, adds to LRU cache

**Scale Normalization:**
Each image has different natural dimensions. System normalizes all to consistent base scale:
- Calculates `baseScale` so image fits standard size on canvas
- Stores `baseScale` in `baseScales.current` map
- When user scales image, calculates `userScale = fabricScale / baseScale`
- Persists only `userScale`, allowing reload with correct dimensions

**Transparency Trimming:**
For sprites with lots of transparency on edges:
- Calculates real bounding box using `computeAlphaBounds`
- Applies offset and adjusted scale to show only visible part
- Visual improvement: sprites appear more "cut out" and professional

### 5.5 Text Manipulation

**Text Creation:**
- Uses FabricText with rich settings
- OriginX='center', OriginY='bottom' for intuitive behavior
- Full support for font, weight, style, color, stroke, shadow

**Shadow System:**
Shadows are persisted as JSON stringified:
```
{
  enabled: boolean,
  color: string,        // rgba(0,0,0,0.5)
  blur: number,         // 0-20
  offsetX: number,      // -10 to 10
  offsetY: number       // -10 to 10
}
```
- When enabled=true, creates `new Shadow()` instance from Fabric.js
- When enabled=false, shadow=null

**Text Editing:**
- Double-click on text activates Fabric.js inline edit mode
- All changes trigger syncFabricToLayers
- Length validation on frontend (280 characters)

### 5.6 User Interactions

**Selection:**
- Click on object selects it
- Shows bounding box with resize and rotation handles
- Fires `selection:created` event → updates selected layer in editor
- Selection:cleared when clicking outside → deselects

**Transformations:**
- **Drag**: Moves object freely
- **Resize**: Drags corner handles (maintains proportion if lockUniScaling=false)
- **Rotate**: Drags top center handle
- All transformations fire `object:modified`

**Delete:**
- Delete/Backspace key when object selected
- Removes from canvas and layers array

**Add Layer:**
- Editor buttons add new layer to array
- New layer appears centered with default values
- User can then position/scale/rotate

### 5.7 Performance and Optimizations

**Render Lock:**
- Promise-based lock to avoid simultaneous renders
- If render in progress, waits to complete before starting new one
- Prevents race conditions and inconsistent state

**Debouncing:**
- Sync Fabric → React is debounced at 150ms
- Avoids hundreds of updates during continuous drag

**Image Cache:**
- LRU cache with size and memory limits
- Avoids reloading same images repeatedly
- Removes old items when reaching limits

**Lazy Rendering:**
- Layers only rendered when visible on canvas
- Background always rendered first (zIndex 0)

**Memory Management:**
- Complete cleanup on unmount:
  - Dispose of Fabric.js canvas
  - Clear all timeouts
  - Clear event listeners
  - Clear image cache

---

## 6. SAVING AND EXPORTING MEMES

### 6.1 Save Flow

**Step 1: Data Preparation**
- User clicks "Save Meme"
- System validates at least one layer exists
- Validates text lengths (max 10,000 characters per content)
- Generates unique idempotency key (UUID or timestamp-based)

**Step 2: Image Export**
- Fabric.js canvas exports to data URL (base64)
- Aggressive compression applied in multiple passes:
  - Pass 1: quality 0.75, scale 1.5x, max 600x600px
  - Pass 2: quality 0.65, scale 1.25x, max 500x500px  
  - Pass 3: quality 0.55, scale 1.0x, max 400x400px
- Target: <800KB to optimize sharing
- Final format: PNG or JPEG depending on transparency

**Step 3: Backend Submission**
Calls edge function `save-meme` with payload:
```
{
  telegramUserId: number,
  templateKey: string,
  layersPayload: Layer[],
  image: string,              // data URL base64
  idempotencyKey: string      // to prevent duplicates
}
```

**Step 4: Backend Processing**
(See Backend section for details)

**Step 5: User Feedback**
- Loading spinner during upload
- Success or error toast
- Automatic navigation to gallery on success
- Points added to user score

### 6.2 Idempotency System

To avoid duplicate saves (double-click, retry, etc):

**Frontend:**
- Generates unique `idempotencyKey` before sending
- If request fails and user tries again, uses same key

**Backend:**
- Checks if meme with same `idempotency_key` already exists
- If exists, returns existing meme (doesn't create duplicate)
- UNIQUE constraint on `memes.idempotency_key` guarantees atomicity

### 6.3 Layer Validation

**Frontend (pre-submission):**
- Minimum 1 layer, maximum 50 layers
- Content of each layer: max 10,000 characters
- Coordinates within valid ranges (-1000 to 1000)
- Scale between 0.1 and 10
- Rotation between -360 and 360

**Backend (on reception):**
- Zod validation duplicates all frontend rules
- If validation fails, returns 400 with error details
- Prevents injection attacks and malformed data

### 6.4 Image Compression

**Multi-Pass Strategy:**
System tries to compress image in successive passes until reaching target size:

1. Renders canvas at larger scale (1.5x-2x) for initial high quality
2. Converts to data URL with specific quality
3. Checks base64 byte size
4. If > target, reduces scale and quality and tries again
5. Maximum 3 attempts with progressively more aggressive presets

**Fallback:**
If after 3 passes image is still large:
- Uses last attempt (most compressed)
- Warning log (doesn't block save)
- Consider increasing storage limits

---

## 7. MEME GALLERY

### 7.1 Meme Listing

**Data Fetching:**
- Calls edge function `get-user-memes` with `telegramUserId`
- Backend returns up to 50 most recent user memes
- Ordering: `created_at DESC`
- Filters only non-deleted memes (`deleted_at IS NULL`)

**Rendering:**
- Responsive thumbnail grid
- Each item shows:
  - Image thumbnail
  - Short ID (4-6 digits)
  - Creation date
  - Action buttons (delete, share)

**Loading States:**
- Skeleton loaders while loading
- Empty state if user has no memes yet
- Error state if loading fails (with retry button)

### 7.2 Preview and Visualization

**Click on Meme:**
- Opens modal/fullscreen view
- Shows full-size image
- Information: ID, date, template used
- Actions: Share, Delete, Edit (optional)

**Zoom and Pan:**
- Pinch-to-zoom on mobile
- Scroll/drag for pan
- Reset zoom button

### 7.3 Meme Deletion

**Delete Flow:**
1. User clicks delete button
2. Confirms action in alert dialog
3. Calls edge function `delete-meme` with `memeId`
4. Backend does soft-delete (sets `deleted_at = now()`)
5. Frontend removes meme from list locally (optimistic update)
6. Confirmation toast

**Soft Delete vs Hard Delete:**
- **Soft Delete** (recommended): sets timestamp in `deleted_at`
  - Allows later recovery
  - Maintains referential integrity
  - Doesn't remove image from storage immediately
- **Hard Delete**: removes row from database
  - Irreversible
  - Requires cascade deletes or manual cleanup
  - Removes image from storage immediately

### 7.4 Sharing

**Share Button:**
- Generates deep link for meme: `https://app.url/?memeId={short_id}`
- Uses Web Share API if available:
  ```
  navigator.share({
    title: 'Check out my meme!',
    text: 'I created this epic meme',
    url: deepLink
  })
  ```
- Fallback: copy to clipboard

**Deep Link Handling:**
- When user opens app via deep link with `?memeId=1234`
- App detects query param
- Fetches meme by `id_short`
- Shows preview directly (without needing to authenticate if meme is public)

---

## 8. GAMIFICATION AND SCORING SYSTEM

### 8.1 Points Concept

The application implements a scoring system to engage users:

**Events that Generate Points:**
- **Save meme**: +3 points (event `save_meme`)
- **Receive reaction**: +1 point (event `reaction_received`)
- **Share meme**: +1 point (event `share_meme`)
- **Weekly ranking bonus**: +10/+6/+3 points for top 3 of week

**Table `popcat_events`:**
```
{
  id: UUID,
  user_id: UUID,
  source: enum ('save_meme', 'reaction_received', 'share_meme', ...),
  amount: integer,
  meme_id: UUID (nullable),
  created_at: timestamp
}
```

### 8.2 Ranking Calculation

**Dual Rankings:**
1. **Global Ranking**: Total point sum since forever
2. **Weekly Ranking**: Point sum in current week (Monday-Sunday)

**Ranking Functions:**
- `get_user_ranking(telegram_user_id)`: Returns scores and ranks of specific user
- `get_user_rankings()`: Returns complete global ranking (top 100)
- `get_current_week_rankings()`: Returns current week ranking (top 50)

**Calculation:**
```sql
SELECT 
  u.id, 
  SUM(pe.amount) as total_score,
  ROW_NUMBER() OVER (ORDER BY SUM(pe.amount) DESC) as rank
FROM users u
LEFT JOIN popcat_events pe ON u.id = pe.user_id
WHERE pe.created_at >= date_trunc('week', CURRENT_DATE)
GROUP BY u.id
ORDER BY total_score DESC
```

### 8.3 Badge System

Based on total points, user receives badges:
- **0-9 points**: Rookie 🌱
- **10-49 points**: Creator 🎨
- **50-99 points**: Expert 💎
- **100-499 points**: Master 🔥
- **500+ points**: Legend 👑

**Rendering:**
`StatsDisplay` component fetches data and shows:
- Badge icon and name
- Total and weekly points
- Global and weekly rank
- Progress bar to next badge

### 8.4 Weekly Reset

**Objective:**
Keep competition active by resetting weekly leaderboard every Monday.

**Implementation:**
- Edge function `weekly-reset` executed via cron (Monday 00:00 UTC)
- Saves snapshot of previous week ranking in `leaderboard_snapshots`
- Assigns bonus points to top 3 of week
- Weekly ranking automatically resets because query filters by `created_at >= current_week`

**Cron Configuration:**
```toml
[functions.weekly-reset]
schedule = "0 0 * * 1"  # Every Monday at 00:00 UTC
```

---

## 9. BACKEND (EDGE FUNCTIONS)

### 9.1 Edge Functions Architecture

Edge functions are **serverless Deno functions** running on Supabase Edge Runtime.

**Characteristics:**
- Automatic deploy with code
- Automatic horizontal scaling
- Low latency (edge computing)
- Direct database access via `@supabase/supabase-js`
- Isolation: each function has its own runtime

**Function Structure:**
```
/supabase/functions/<function-name>/
  index.ts              ← Main handler
```

**Mandatory CORS:**
All functions must implement CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### 9.2 Function: save-meme

**Responsibility:**
Save new meme to database and upload image to storage.

**Input:**
```
{
  telegramUserId: number,
  templateKey: string,
  layersPayload: Layer[],
  image?: string,            // data URL base64
  idempotencyKey?: string
}
```

**Process:**
1. Payload validation with Zod schema
2. Idempotency check (if key provided)
3. Resolve user_id via `get_user_id_by_telegram_id` RPC
   - If doesn't exist, creates via `create_user_if_not_exists`
4. Generate short_id via `generate_meme_short_id` RPC
5. Upload image to storage bucket `memes/` (if provided)
6. Insert into `memes` table
7. Return `{ memeId, id_short, url }`

**Idempotency:**
- If `idempotencyKey` already exists in database, returns existing meme
- UNIQUE constraint guarantees no duplicates
- On conflict, does SELECT of existing and returns

**Error Handling:**
- Validation fails: 400 with Zod error details
- Database error: 500 with generic message (don't expose details)
- Storage error: 400 with "Image upload failed"
- Timeout: Client can retry with same idempotencyKey

**Output:**
```
{
  memeId: UUID,
  id_short: string,
  url: string | null
}
```

### 9.3 Function: get-user-memes

**Responsibility:**
Fetch list of memes from specific user.

**Input:**
```
{ telegramUserId: number }
```

**Process:**
1. telegramUserId validation
2. Resolve user_id via RPC
3. Call RPC function `get_user_memes(user_uuid)`
4. Return memes array

**RPC Backend:**
```sql
CREATE FUNCTION get_user_memes(user_uuid UUID)
RETURNS TABLE(id, id_short, template_key, layers_payload, image_urls, created_at)
AS $$
  SELECT id, id_short, owner_id, template_key, layers_payload, image_urls, created_at, deleted_at
  FROM memes
  WHERE owner_id = user_uuid AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 50
$$;
```

**Output:**
```
{
  memes: [
    {
      id: UUID,
      id_short: string,
      template_key: string,
      layers_payload: Layer[],
      image_urls: { original: string },
      created_at: timestamp
    },
    ...
  ]
}
```

### 9.4 Function: delete-meme

**Responsibility:**
Soft-delete of specific meme.

**Input:**
```
{
  memeId: UUID,
  telegramUserId: number
}
```

**Process:**
1. Input validation
2. Resolve user_id
3. Check ownership (meme belongs to user?)
4. Soft-delete: `UPDATE memes SET deleted_at = NOW() WHERE id = memeId`
5. Optional: schedule storage image cleanup (async job)

**Output:**
```
{ success: true }
```

**Error Cases:**
- Meme doesn't exist: 404 "Meme not found"
- User is not owner: 403 "Not authorized"
- Already deleted: 200 "Already deleted" (idempotent)

### 9.5 Function: system-status

**Responsibility:**
System health check for monitoring.

**Input:** None (GET request)

**Process:**
1. Test database connection (SELECT 1)
2. Test storage (list files)
3. Return status of each service

**Output:**
```
{
  status: 'healthy' | 'degraded' | 'down',
  database: 'ok' | 'error',
  storage: 'ok' | 'error',
  timestamp: ISO string
}
```

### 9.6 Security in Edge Functions

**Authentication:**
- Functions can be public (`verify_jwt = false`) or private
- For private, extract JWT from Authorization header
- Validate JWT using `supabase.auth.getUser(token)`
- For current app: functions are public but validate `telegramUserId`

**Input Validation:**
- **ALWAYS** validate with Zod before processing
- Never trust client data
- Sanitize strings before database insert

**SQL Injection:**
- **NEVER** use raw SQL with string concatenation
- Always use:
  - Supabase client query builder (`.from().select()`)
  - RPC functions with typed parameters
  - Prepared statements if using direct SQL

**Rate Limiting:**
Implement rate limiting per userId:
- Redis cache with requests per minute counter
- Limits: 60 requests/min per user
- 429 Too Many Requests if exceeded

**Secrets:**
- Use `Deno.env.get('SECRET_NAME')` to access
- Never commit secrets in code
- Configure via Supabase Dashboard → Functions → Secrets

---

## 10. DATABASE

### 10.1 Schema Overview

Database has 7 main tables:

1. **users**: User registration
2. **memes**: Created memes
3. **templates**: Pre-defined templates
4. **assets**: Available assets (backgrounds, bodies, etc)
5. **popcat_events**: Scoring events
6. **leaderboard_snapshots**: Weekly ranking snapshots
7. **reactions**: Meme reactions (optional, for chat app integration)

### 10.2 Table: users

**Purpose:**
Store information of users using the application.

**Columns:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indices:**
- Primary key on `id`
- Unique index on `telegram_id` (fast lookup by external ID)

**RLS (Row Level Security):**
- `permissive_all_users`: Allows all operations (public ranking view function)

**Notes:**
- `telegram_id` is external identifier (from Telegram or other provider)
- `id` is internal UUID used as foreign key
- Doesn't store sensitive data (email, phone)

### 10.3 Table: memes

**Purpose:**
Store memes created by users.

**Columns:**
```sql
CREATE TABLE memes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_short TEXT NOT NULL,
  owner_id UUID NOT NULL,
  template_key TEXT NOT NULL,
  layers_payload JSONB NOT NULL DEFAULT '[]',
  image_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE
);
```

**Indices:**
- Primary key on `id`
- Index on `owner_id` (fetch user memes)
- Unique index on `id_short` + `owner_id` (unique short IDs per user)
- Unique index on `idempotency_key` (prevent duplicates)
- Index on `deleted_at` (filter non-deleted quickly)

**Fields:**
- **id_short**: Short 4-6 digit ID for sharing (generated by RPC)
- **owner_id**: UUID of creator user
- **template_key**: Which template was used as base
- **layers_payload**: JSON array of layers (complete meme structure)
- **image_urls**: JSON object with rendered image URLs
  - `{ original: 'https://storage.url/meme.png' }`
- **deleted_at**: NULL if active, timestamp if deleted (soft delete)
- **idempotency_key**: Unique string to prevent duplicate saves

**RLS:**
- `permissive_read_memes`: Anyone can read (memes are public)
- `permissive_all_memes`: Allows all operations (management via functions)

### 10.4 Table: templates

**Purpose:**
Store pre-defined templates available to users.

**Columns:**
```sql
CREATE TABLE templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  thumb_url TEXT,
  manifest_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields:**
- **key**: Unique identifier (e.g. 'classic_chad', 'virgin_vs_chad')
- **name**: Friendly name displayed in UI
- **thumb_url**: Thumbnail URL for preview
- **manifest_json**: JSON with template layers definition

**Population:**
Templates are inserted via migrations or seed script:
```sql
INSERT INTO templates (key, name, thumb_url, manifest_json) VALUES
('classic', 'Classic', 'https://...', '{"layers": [...]}'),
('warrior', 'Warrior Mode', 'https://...', '{"layers": [...]}');
```

### 10.5 Table: assets

**Purpose:**
Catalog of available assets (backgrounds, bodies, heads, props).

**Columns:**
```sql
CREATE TABLE assets (
  key TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'background' | 'body' | 'head' | 'prop'
  url TEXT NOT NULL,
  meta JSONB
);
```

**Usage:**
When app loads, fetches asset list by type:
```sql
SELECT key, url FROM assets WHERE type = 'background';
```

Frontend builds assets object:
```typescript
const assets = {
  backgrounds: { gym: 'url1', beach: 'url2' },
  bodies: { warrior: 'url3', classic: 'url4' },
  ...
};
```

### 10.6 Table: popcat_events

**Purpose:**
Record scoring events for gamification.

**Columns:**
```sql
CREATE TABLE popcat_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL, -- 'save_meme', 'reaction_received', etc
  amount INTEGER NOT NULL DEFAULT 0,
  meme_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indices:**
- Primary key on `id`
- Index on `user_id` + `created_at` (fast score calculation)
- Index on `created_at` (weekly ranking queries)

**Insertion:**
When scoring event occurs:
```sql
INSERT INTO popcat_events (user_id, source, amount, meme_id)
VALUES (user_uuid, 'save_meme', 3, meme_uuid);
```

### 10.7 Table: leaderboard_snapshots

**Purpose:**
Store weekly ranking snapshots for history.

**Columns:**
```sql
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id TEXT NOT NULL, -- 'YYYY-WW'
  user_id UUID NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Usage:**
Edge function `weekly-reset` inserts snapshot before reset:
```sql
INSERT INTO leaderboard_snapshots (week_id, user_id, rank, score)
SELECT '2025-W01', user_id, rank, score FROM get_current_week_rankings();
```

### 10.8 RPC Functions

**generate_meme_short_id(owner_uuid UUID):**
Generates unique 4-6 digit short ID for a user:
```sql
CREATE FUNCTION generate_meme_short_id(owner_uuid UUID) RETURNS TEXT AS $$
DECLARE
  short_id TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    short_id := LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 4, '0');
    IF NOT EXISTS (
      SELECT 1 FROM memes 
      WHERE owner_id = owner_uuid 
        AND id_short = short_id 
        AND deleted_at IS NULL
    ) THEN
      RETURN short_id;
    END IF;
    attempts := attempts + 1;
    IF attempts >= 100 THEN
      RAISE EXCEPTION 'Could not generate unique short ID';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**get_user_id_by_telegram_id(telegram_user_id BIGINT):**
Fetches internal UUID given telegram_id:
```sql
CREATE FUNCTION get_user_id_by_telegram_id(telegram_user_id BIGINT) 
RETURNS UUID AS $$
DECLARE user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM users WHERE telegram_id = telegram_user_id;
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**create_user_if_not_exists(telegram_user_id BIGINT, user_first_name TEXT):**
Creates user if doesn't exist, returns UUID:
```sql
CREATE FUNCTION create_user_if_not_exists(
  telegram_user_id BIGINT, 
  user_first_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid FROM users WHERE telegram_id = telegram_user_id;
  IF user_uuid IS NULL THEN
    INSERT INTO users (telegram_id, first_name) 
    VALUES (telegram_user_id, user_first_name) 
    RETURNING id INTO user_uuid;
  END IF;
  RETURN user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**get_user_ranking(user_telegram_id BIGINT):**
Returns scores and ranks of a user:
```sql
CREATE FUNCTION get_user_ranking(user_telegram_id BIGINT)
RETURNS TABLE(
  user_id UUID,
  total_score BIGINT,
  weekly_score BIGINT,
  global_rank BIGINT,
  weekly_rank BIGINT
) AS $$
-- Calculates total and weekly scores
-- Calculates ROW_NUMBER for ranks
-- Returns specific user row
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 10.9 Triggers

**Objective:**
No critical triggers in current application. If needed, implement:

**Auto-update updated_at:**
```sql
CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memes_updated_at
BEFORE UPDATE ON memes
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Auto-insert into popcat_events after save meme:**
Could be implemented as trigger, but better to do explicitly in edge function for fine control.

### 10.10 Backups and Maintenance

**Backups:**
- Supabase does automatic daily backups
- Configure retention: 7 days rolling backup
- For additional backups: export via pg_dump

**Deleted Memes Cleanup:**
Schedule edge function for hard-delete of memes with `deleted_at > 90 days`:
```sql
DELETE FROM memes 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '90 days';
```

**Orphaned Images Cleanup:**
List storage files that don't have corresponding row in `memes.image_urls`:
```typescript
// Pseudo-code
const storageFiles = await storage.list('memes/');
const dbImageUrls = await db.from('memes').select('image_urls');
const orphans = storageFiles.filter(file => !dbImageUrls.includes(file.url));
await Promise.all(orphans.map(file => storage.delete(file.path)));
```

---

## 11. STORAGE (SUPABASE STORAGE)

### 11.1 Bucket Configuration

**Bucket: `memes`**
- **Public**: Yes (images can be accessed via public URL)
- **File size limit**: 10MB per file
- **Allowed MIME types**: image/png, image/jpeg, image/webp, image/gif

**Path structure:**
```
memes/
  {short_id}.png
  {short_id}.png
  ...
```

Naming: uses meme's `id_short` as filename, guaranteeing uniqueness per user.

### 11.2 Upload Flow

**In save-meme edge function:**
```typescript
// 1. Parse data URL
const match = image.match(/^data:(image\/\w+);base64,(.*)$/);
const contentType = match[1]; // 'image/png'
const base64 = match[2];

// 2. Convert base64 to Uint8Array
const raw = atob(base64);
const bytes = new Uint8Array(raw.length);
for (let i = 0; i < raw.length; i++) {
  bytes[i] = raw.charCodeAt(i);
}

// 3. Upload to storage
const filePath = `${shortId}.png`;
const { error } = await supabase.storage
  .from('memes')
  .upload(filePath, bytes, {
    contentType: contentType,
    upsert: true  // Replace if already exists
  });

// 4. Get public URL
const { data } = supabase.storage
  .from('memes')
  .getPublicUrl(filePath);

const publicUrl = data.publicUrl;
```

### 11.3 Download and Serving

**Public URLs:**
Format: `https://project-ref.supabase.co/storage/v1/object/public/memes/{short_id}.png`

**Characteristics:**
- URLs are permanent (while file exists)
- Automatic CDN edge caching
- Range requests support (for streaming)
- CORS enabled for cross-origin loading

**On frontend:**
```typescript
<img 
  src={meme.image_urls.original} 
  alt="Meme"
  loading="lazy"
  crossOrigin="anonymous"
/>
```

### 11.4 Storage Policies (RLS)

**Policy: Allow public read**
```sql
CREATE POLICY "Public meme images" ON storage.objects
FOR SELECT
USING (bucket_id = 'memes');
```

**Policy: Authenticated upload**
```sql
CREATE POLICY "Authenticated upload memes" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'memes' AND
  auth.role() = 'authenticated'
);
```

**Note:**
Since app doesn't use Supabase auth directly, uploads are done via SERVICE_ROLE_KEY in edge functions (RLS bypass).

### 11.5 Cleanup and Garbage Collection

**Manual Cleanup:**
Script to delete images of deleted memes:
```typescript
const { data: deletedMemes } = await supabase
  .from('memes')
  .select('id_short')
  .not('deleted_at', 'is', null);

for (const meme of deletedMemes) {
  await supabase.storage
    .from('memes')
    .remove([`${meme.id_short}.png`]);
}
```

**Automated Cleanup:**
Edge function `cleanup-storage` running weekly via cron.

### 11.6 Limits and Quotas

**Free Tier:**
- 1GB storage
- 2GB bandwidth/month
- Sufficient for ~1000 memes of 800KB

**Paid Tiers:**
- $0.021/GB storage/month
- $0.09/GB bandwidth
- Calculate costs based on expected growth

---

## 12. VALIDATIONS AND SCHEMAS

### 12.1 Validation with Zod

All data input must be validated using Zod schemas:

**Layer Schema:**
```typescript
const layerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['background', 'body', 'head', 'prop', 'text']),
  content: z.string().max(10_000),
  x: z.number().min(-1000).max(1000),
  y: z.number().min(-1000).max(1000),
  scale: z.number().min(0.1).max(10),
  rotation: z.number().min(-360).max(360),
  zIndex: z.number().int().min(0).max(100),
  // Optional text props
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().max(100).optional(),
  // ...
});
```

**Telegram User Schema:**
```typescript
const telegramUserSchema = z.object({
  id: z.number().int().positive().min(1).max(10_000_000_000),
  username: z.string().min(3).max(32).optional(),
  first_name: z.string().max(64).optional()
});
```

**Save Meme Request Schema:**
```typescript
const saveMemeRequestSchema = z.object({
  telegramUserId: telegramIdSchema,
  templateKey: z.string().trim().min(1).max(100),
  layersPayload: z.union([
    z.array(layerSchema).min(1).max(50),
    z.string().transform((s, ctx) => {
      try {
        return JSON.parse(s);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
        return z.NEVER;
      }
    })
  ]),
  image: z.string()
    .regex(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)
    .max(10_000_000)
    .optional(),
  idempotencyKey: z.string().min(1).max(100).optional()
});
```

### 12.2 Frontend vs Backend Validation

**Golden Rule:**
All frontend validation MUST be duplicated in backend.

**Frontend:**
- Immediate validation for UX (instant feedback)
- Prevents invalid requests (bandwidth saving)
- Uses same Zod schemas as backend

**Backend:**
- Mandatory validation (never trust client)
- Prevents injection attacks
- Guarantees data integrity

**Synchronization:**
- Define schemas in shared file `/lib/validations.ts`
- Edge functions import same schema (Deno allows HTTP imports)
- Changes in one place reflect on both sides

### 12.3 String Sanitization

**XSS Prevention:**
Before rendering user strings:
```typescript
function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}
```

**SQL Injection Prevention:**
- Never concatenate strings in queries
- Always use parameterized queries or query builders
- Validate types before query

**Path Traversal Prevention:**
When user provides filename:
```typescript
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 100);
}
```

### 12.4 Rate Limiting

**Implementation:**
```typescript
const rateLimiter = new Map<string, { count: number; reset: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const limit = rateLimiter.get(userId);
  
  if (!limit || now > limit.reset) {
    // Reset window
    rateLimiter.set(userId, { count: 1, reset: now + 60_000 });
    return true;
  }
  
  if (limit.count >= 60) {
    return false; // Rate limit exceeded
  }
  
  limit.count++;
  return true;
}
```

**Application:**
```typescript
if (!checkRateLimit(telegramUserId)) {
  return jsonResponse(429, { 
    error: 'Too many requests. Please wait a moment.' 
  });
}
```

---

## 13. ERROR HANDLING

### 13.1 Error Categories

**Client Errors (4xx):**
- 400 Bad Request: Validation failed
- 401 Unauthorized: Not authenticated
- 403 Forbidden: No permission
- 404 Not Found: Resource doesn't exist
- 429 Too Many Requests: Rate limit exceeded

**Server Errors (5xx):**
- 500 Internal Server Error: Generic server error
- 502 Bad Gateway: Downstream service failed
- 503 Service Unavailable: System temporarily unavailable

### 13.2 Error Handling on Frontend

**Principles:**
- Always show friendly message to user
- Log technical error in console for debugging
- Offer recovery action when possible (retry, refresh)

**Error Boundaries:**
```typescript
class AppErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    logger.error('React error boundary caught error', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

**Toast Notifications:**
For non-critical errors:
```typescript
try {
  await saveMeme(...);
  toast.success('Meme saved successfully!');
} catch (error) {
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred';
  toast.error(message);
}
```

**Retry Logic:**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Retry failed');
}
```

### 13.3 Error Handling on Backend

**Structure:**
```typescript
try {
  // Validation
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(400, {
      error: 'Validation failed',
      details: parsed.error.errors.map(e => `${e.path}: ${e.message}`)
    });
  }
  
  // Business logic
  const result = await processRequest(parsed.data);
  
  return jsonResponse(200, { data: result });
} catch (error) {
  logger.error('Function error', error);
  
  // Don't expose internal details
  return jsonResponse(500, {
    error: 'Internal server error. Please try again later.'
  });
}
```

**Error Messages:**
- **User**: Clear and actionable messages
- **Logs**: Complete technical details for debugging
- **Never expose**: Stack traces, SQL queries, internal paths

### 13.4 Logging

**Levels:**
- **DEBUG**: Detailed information for development
- **INFO**: Important events (user login, meme saved)
- **WARN**: Abnormal but recoverable situations
- **ERROR**: Failures requiring attention

**Implementation:**
```typescript
const logger = {
  debug: (message: string, ...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
    // Optional: send to monitoring service (Sentry, etc)
  }
};
```

**What to log:**
- Start and end of critical operations
- Errors with context (userId, memeId, timestamp)
- Performance metrics (time of slow operations)
- Rate limit hits

**What NOT to log:**
- Sensitive data (tokens, passwords)
- PII without need (IPs, emails)
- Complete payloads of large requests

---

## 14. PERFORMANCE AND OPTIMIZATIONS

### 14.1 Frontend Performance

**Code Splitting:**
```typescript
const MemeEditor = lazy(() => import('./components/MemeEditor'));
const MemeGallery = lazy(() => import('./components/MemeGallery'));

<Suspense fallback={<LoadingSpinner />}>
  <MemeEditor />
</Suspense>
```

**Image Optimization:**
- Lazy loading: `<img loading="lazy" />`
- Responsive images: `<img srcset="..." sizes="..." />`
- WebP format when supported
- Aggressive compression (target <100KB per asset)

**Canvas Performance:**
- LRU cache for images (avoids reloads)
- Render lock (avoids simultaneous renders)
- Debounce sync Fabric → React (150ms)
- Proper resource disposal on unmount

**React Query:**
```typescript
const { data: memes, isLoading } = useQuery({
  queryKey: ['user-memes', userId],
  queryFn: () => fetchUserMemes(userId),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false
});
```

**Bundle Size:**
- Tree shaking (Vite built-in)
- Remove unused dependencies
- Use specific imports: `import { Button } from 'ui/button'`

### 14.2 Backend Performance

**Database Indices:**
Guarantee indices on:
- `users.telegram_id` (unique)
- `memes.owner_id`
- `memes.id_short`
- `popcat_events (user_id, created_at)`

**Query Optimization:**
- Use `.select('col1, col2')` instead of `select('*')`
- Limit on listing queries (50-100 items max)
- Use `maybeSingle()` instead of `single()` when record may not exist

**Caching:**
Implement ranking cache:
```typescript
const rankingCache = new Map<string, { data: any; expires: number }>();

function getCachedRanking(key: string) {
  const cached = rankingCache.get(key);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  return null;
}

function setCachedRanking(key: string, data: any, ttl: number = 60_000) {
  rankingCache.set(key, { data, expires: Date.now() + ttl });
}
```

**Connection Pooling:**
Supabase client already uses internal pooling, but in case of high traffic:
- Increase `poolSize` in settings
- Implement circuit breaker pattern

### 14.3 Storage Performance

**CDN:**
Supabase Storage uses CDN automatically (edge caching).

**Compression:**
- Images are already compressed on upload
- Consider WebP for better compression
- Gzip/Brotli for static assets (Vite built-in)

**Parallel Uploads:**
If multiple images:
```typescript
await Promise.all(
  images.map(img => storage.upload(img.path, img.data))
);
```

### 14.4 Monitoring

**Metrics to monitor:**
- Edge functions response time (p50, p95, p99)
- Error rate per function
- Database query time
- Storage bandwidth usage
- Active users (DAU, MAU)

**Tools:**
- Supabase Dashboard (built-in metrics)
- Sentry for error tracking
- Google Analytics for user behavior
- Custom logging for business metrics

---

## 15. DEPLOYMENT AND DEVOPS

### 15.1 Environments

**Development:**
- Local with mock data
- Local Supabase (docker)
- Variables in `.env.local`

**Staging:**
- Deploy on Vercel/Netlify/Cloudflare Pages
- Supabase staging project
- Automated integration tests

**Production:**
- Deploy on Vercel/Netlify/Cloudflare Pages
- Supabase production project
- 24/7 monitoring
- Automatic backups

### 15.2 CI/CD Pipeline

**GitHub Actions example:**
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```

**Edge Functions Deploy:**
```bash
supabase functions deploy save-meme
supabase functions deploy get-user-memes
supabase functions deploy delete-meme
# ... other functions
```

**Migrations:**
```bash
supabase db push  # Apply pending migrations
```

### 15.3 Secrets Configuration

**On Supabase Dashboard:**
- Access Functions → Secrets
- Add each necessary secret (TELEGRAM_BOT_TOKEN, etc)

**On Frontend (Vite):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Never commit:**
- `.env`
- `.env.local`
- Tokens/passwords in code

### 15.4 Rollback Strategy

**If deploy breaks:**
1. Revert commit on git
2. Automatic redeploy via CI/CD
3. Or: manual rollback via hosting platform

**Database migrations:**
- Always create rollback migration along with migration
- Test rollback in staging before production

### 15.5 Scalability

**Probable Bottlenecks:**
- Database connections (increase pool size)
- Storage bandwidth (upgrade plan or implement additional CDN)
- Edge function cold starts (consider provisioned concurrency)

**Horizontal Scaling:**
- Edge functions scale automatically
- Frontend is static (CDN handles it)
- Database: upgrade to larger plan or read replicas

---

## 16. IMPROVEMENTS AND FUTURE FEATURES

### 16.1 Suggested Features

**Advanced Editor:**
- Editable layers (edit texts/images after adding)
- Undo/Redo
- Filters and effects (blur, saturation, etc)
- Geometric shapes (circles, rectangles)
- Animated stickers (GIFs)

**Social Features:**
- Comments on memes
- Like/dislike system
- Follow other users
- Public feed of popular memes
- Hashtags and search

**Monetization:**
- Premium templates
- Exclusive assets for subscribers
- Watermark removal
- High resolution export

**Integrations:**
- Direct sharing to Twitter, Instagram, Facebook
- Discord bot
- WhatsApp plugin
- Public API for developers

### 16.2 Tech Debt to Resolve

**Code:**
- Refactor MemeEditor (too large, break into subcomponents)
- Extract canvas logic to separate custom hook
- Add unit tests (Jest + Testing Library)
- Add E2E tests (Playwright)

**Infrastructure:**
- Implement proactive monitoring
- Setup alerts (errors, high latency)
- Runbooks documentation (how to solve common problems)

**Security:**
- Dependency audit (npm audit)
- Penetration testing
- GDPR compliance (if applicable)

### 16.3 Future Optimizations

**Performance:**
- Implement Service Worker for offline support
- Precache popular assets
- Lazy load non-critical components

**UX:**
- Onboarding tutorial for new users
- Explanatory tooltips
- Keyboard shortcuts
- Dark mode

---

## 17. FINAL CONSIDERATIONS FOR REBUILDING

### 17.1 Recommended Implementation Order

**Phase 1: Foundation (1-2 weeks)**
1. Project setup (Vite + React + TypeScript)
2. Configure Tailwind CSS and base components
3. Create folder structure and architecture
4. Supabase setup (project, database, storage)

**Phase 2: Authentication (1 week)**
1. Implement multi-context authentication system
2. Create user management edge functions
3. Test auth flows in different contexts

**Phase 3: Basic Editor (2-3 weeks)**
1. Implement canvas with Fabric.js
2. Layer system and templates
3. Image and text manipulation
4. Image export

**Phase 4: Persistence (1-2 weeks)**
1. Edge function save-meme
2. Upload to storage
3. Edge function get-user-memes
4. Basic gallery

**Phase 5: Gamification (1 week)**
1. Points system
2. Rankings
3. Badges
4. Stats display

**Phase 6: Polish (1-2 weeks)**
1. Robust error handling
2. Loading states
3. Complete validations
4. Performance optimizations

**Phase 7: Deploy and Tests (1 week)**
1. CI/CD setup
2. Production deploy
3. Load tests
4. Bug fixes

### 17.2 Important Architectural Decisions

**Monorepo vs Separate Repos:**
- Recommended: **Monorepo** (frontend + backend in same repo)
- Facilitates type and schema sharing
- Simplifies CI/CD

**State Management:**
- For small app: **useState + React Query** (sufficient)
- For large app: consider **Zustand** or **Redux Toolkit**

**Testing Strategy:**
- **Unit tests**: Utility functions, validations
- **Integration tests**: Complex components (Editor)
- **E2E tests**: Critical flows (auth, save meme)
- Coverage target: 70%+

**Mobile Support:**
- **Responsive design** mandatory (80%+ users on mobile)
- Consider **PWA** for install prompt
- Optimized touch gestures

### 17.3 Common Pitfalls to Avoid

❌ **Don't optimize prematurely**
- Focus on functionality first
- Optimize after measuring real bottlenecks

❌ **Don't ignore edge cases**
- User without internet
- Very large image
- Texts with special characters

❌ **Don't blindly trust client**
- Always validate on backend
- Never expose tokens/secrets

❌ **Don't neglect error UX**
- Always give clear feedback to user
- Offer recovery options

❌ **Don't leave dead code**
- Remove unused features
- Keep codebase clean

### 17.4 Final Checklist Before Launch

**Functionality:**
- [ ] All main flows work
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Mobile responsive

**Performance:**
- [ ] Lighthouse score 90+ (mobile and desktop)
- [ ] Bundle size <500KB gzipped
- [ ] TTI <3s on 3G
- [ ] Database queries optimized

**Security:**
- [ ] Frontend and backend validation
- [ ] Rate limiting implemented
- [ ] Secrets not exposed
- [ ] CORS configured correctly

**Monitoring:**
- [ ] Error tracking (Sentry)
- [ ] Analytics (GA4)
- [ ] Performance monitoring
- [ ] Alerts configured

**Documentation:**
- [ ] README updated
- [ ] API docs (if public)
- [ ] Runbooks for ops
- [ ] Changelog

---

## 18. GLOSSARY

**Layer:** Individual visual element on canvas (image, text, prop)

**Template:** Pre-defined composition of layers that forms complete meme

**Short ID:** Short 4-6 digit identifier used for meme sharing

**Idempotency Key:** Unique string used to prevent duplicate operations

**Soft Delete:** Mark record as deleted without physically removing from database

**RLS (Row Level Security):** PostgreSQL permissions system that filters rows per user

**Edge Function:** Serverless function running on Deno at the edge (close to user)

**LRU Cache:** Cache that removes least recently used items when reaching limit

**Fabric.js:** JavaScript library for HTML5 canvas manipulation

**WebApp:** Web application integrated inside mobile app (e.g. Telegram MiniApp)

**CORS:** Browser security mechanism to control cross-origin requests

**Zod:** TypeScript schema validation library

---

## CONCLUSION

This document provides a complete and detailed view of all aspects of the Meme Maker application, from high-level architecture to specific implementation details. It was designed to serve as the definitive guide for a tech lead to rebuild the application from scratch, focusing on:

- **Clarity**: Each section explains WHAT to do, not HOW to do it
- **Completeness**: All systems and flows are documented
- **Context**: Architectural decisions are justified
- **Practicality**: Conceptual examples and data structures provided

The resulting application will be a robust, scalable and easily maintainable Meme Maker, ready to serve thousands of users creating and sharing memes daily.

---

**Document generated on:** 2025-10-01
**Version:** 1.0
**Status:** Ready for implementation
