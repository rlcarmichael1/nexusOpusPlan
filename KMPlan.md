## Knowledge Article Management System - Architecture Plan

### Overview
A full-stack knowledge article management system for ITSM users with React frontend, Node.js/Express backend, and a repository-pattern data layer that initially uses flat files but can easily migrate to a database.

---

### Project Structure
```
/nexus-knowledge-base/
├── /client/                          # React Frontend
│   ├── /public/
│   ├── /src/
│   │   ├── /components/
│   │   │   ├── /articles/            # Article CRUD components
│   │   │   ├── /comments/            # Comment components
│   │   │   ├── /common/              # Shared UI components
│   │   │   ├── /editor/              # Rich text editor
│   │   │   ├── /layout/              # Layout components (sidebar/main)
│   │   │   └── /search/              # Search & filter components
│   │   ├── /contexts/                # React contexts (Auth, Articles)
│   │   ├── /hooks/                   # Custom hooks
│   │   ├── /services/                # API service layer
│   │   ├── /types/                   # TypeScript interfaces
│   │   └── /utils/                   # Utilities & helpers
│   ├── package.json
│   └── tsconfig.json
│
├── /server/                          # Node.js/Express Backend
│   ├── /src/
│   │   ├── /config/                  # Configuration management
│   │   ├── /controllers/             # Route handlers
│   │   ├── /middleware/              # Auth, RBAC, error handling
│   │   ├── /models/                  # Data models/interfaces
│   │   ├── /repositories/            # Data access abstraction
│   │   │   ├── IArticleRepository.ts # Interface (for easy DB swap)
│   │   │   ├── FileArticleRepository.ts
│   │   │   └── index.ts
│   │   ├── /services/                # Business logic
│   │   │   ├── ArticleService.ts
│   │   │   ├── LockService.ts        # Article edit locking
│   │   │   └── VersionService.ts     # Version history
│   │   ├── /routes/                  # API routes
│   │   └── /utils/                   # Logging, error classes
│   ├── /data/                        # Flat file storage
│   │   ├── /articles/                # Article JSON files
│   │   ├── /versions/                # Version history
│   │   ├── /comments/                # Comments
│   │   └── /locks/                   # Edit locks
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml                # Optional containerization
├── README.md
└── .gitignore
```

---

### Data Model

#### Article Schema
```typescript
interface Article {
  id: string;                         // UUID
  briefTitle: string;                 // Short title (max 150 chars)
  detailedDescription: string;        // Rich text/Markdown content
  category: string;                   // Single category
  tags: string[];                     // Multiple tags
  relatedArticles: string[];          // Array of article IDs
  status: 'draft' | 'published' | 'archived' | 'deleted';
  authorId: string;
  authorName: string;
  createdAt: string;                  // ISO timestamp
  updatedAt: string;
  publishedAt?: string;
  expirationDate?: string;
  version: number;
  lockedBy?: string;                  // User ID if locked
  lockedAt?: string;
  metadata: {
    viewCount: number;
    contentFormat: 'markdown' | 'richtext';
  };
}
```

#### Comment Schema
```typescript
interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
}
```

#### User Schema (Mock)
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'reader' | 'actor' | 'author' | 'editor';
  avatarUrl?: string;
}
```

---

### Role-Based Access Control Matrix

| Action | Reader | Actor | Author | Editor |
|--------|--------|-------|--------|--------|
| View published articles | ✅ | ✅ | ✅ | ✅ |
| Search/Filter | ✅ | ✅ | ✅ | ✅ |
| View drafts (own) | ❌ | ❌ | ✅ | ✅ |
| View drafts (all) | ❌ | ❌ | ❌ | ✅ |
| Add comments | ❌ | ✅ | ✅ | ✅ |
| Create articles | ❌ | ❌ | ✅ | ✅ |
| Edit own articles | ❌ | ❌ | ✅ | ✅ |
| Edit any article | ❌ | ❌ | ❌ | ✅ |
| Delete own articles | ❌ | ❌ | ✅ | ✅ |
| Delete any article | ❌ | ❌ | ❌ | ✅ |
| Restore from trash | ❌ | ❌ | ✅ (own) | ✅ |
| Publish articles | ❌ | ❌ | ✅ (own) | ✅ |
| Archive articles | ❌ | ❌ | ❌ | ✅ |
| View version history | ✅ | ✅ | ✅ | ✅ |
| Restore version | ❌ | ❌ | ✅ (own) | ✅ |

---

### API Endpoints

```
# Articles
GET    /api/articles              # List with search/filter/pagination
GET    /api/articles/:id          # Get single article
POST   /api/articles              # Create new article
PUT    /api/articles/:id          # Update article
DELETE /api/articles/:id          # Soft delete (move to trash)
POST   /api/articles/:id/publish  # Publish draft
POST   /api/articles/:id/archive  # Archive article
POST   /api/articles/:id/restore  # Restore from trash

# Locking
POST   /api/articles/:id/lock     # Acquire edit lock
DELETE /api/articles/:id/lock     # Release edit lock
GET    /api/articles/:id/lock     # Check lock status

# Versions
GET    /api/articles/:id/versions         # List version history
GET    /api/articles/:id/versions/:ver    # Get specific version
POST   /api/articles/:id/versions/:ver/restore  # Restore version

# Comments
GET    /api/articles/:id/comments   # List comments
POST   /api/articles/:id/comments   # Add comment
PUT    /api/comments/:id            # Edit comment
DELETE /api/comments/:id            # Delete comment

# Categories & Tags
GET    /api/categories              # List all categories
GET    /api/tags                    # List all tags

# Auth (stubbed)
GET    /api/auth/me                 # Current user info
POST   /api/auth/switch-role        # Dev: switch mock user role
```

---

### UX Design Recommendations

#### 1. **Responsive Layout Strategy**
- Use CSS Container Queries for true component-level responsiveness
- Three layout modes: Full (>1200px), Compact (600-1200px), Sidebar (<600px)
- Article list collapses to card view in sidebar mode
- Editor toolbar becomes floating/minimal in sidebar mode

#### 2. **Create Mode UX**
- Start with minimal fields (title + content)
- "Progressive disclosure" - show advanced fields (tags, expiration, related) on demand
- Auto-save drafts every 30 seconds with visual indicator
- Preview pane toggle for markdown content
- Inline validation with helpful suggestions

#### 3. **View Mode UX**
- Clean reading experience with good typography
- Floating table of contents for long articles
- "Last updated" and "Author" displayed prominently
- Related articles shown as cards at bottom
- Quick actions (Edit, Share, Print) in sticky header

#### 4. **Edit Mode UX**
- Visual "locked for editing" banner showing who's editing
- Side-by-side diff view when restoring versions
- Unsaved changes warning on navigation
- Conflict resolution UI if lock expires while editing
- Rich text toolbar with markdown shortcuts (Ctrl+B for bold, etc.)

#### 5. **Search & Filter UX**
- Instant search with debouncing (300ms)
- Filter chips that are easy to add/remove
- Saved searches for power users
- Recent searches dropdown
- Clear visual feedback for active filters

#### 6. **Status Workflow Visualization**
```
[Draft] → [Published] → [Archived]
           ↓
        [Deleted/Trash] → [Restored to Draft] or [Permanently Deleted by Editor]
```

---

### Error Handling Strategy

1. **Client-Side**
   - Retry with exponential backoff (3 attempts, 1s/2s/4s delays)
   - Offline detection with queue for pending changes
   - User-friendly error messages with "Try Again" actions
   - Toast notifications for transient errors
   - Modal dialogs for critical errors requiring action

2. **Server-Side**
   - Centralized error handling middleware
   - Structured error responses with correlation IDs
   - Detailed logging (Winston) with context but no secrets
   - Graceful degradation when file system is unavailable
   - Request timeout handling (30s default)

---

### Files to Create (in order)

**Phase 1: Backend Foundation**
1. `server/package.json` - Dependencies & scripts
2. `server/tsconfig.json` - TypeScript config
3. `server/src/config/index.ts` - Environment configuration
4. `server/src/utils/logger.ts` - Winston logging setup
5. `server/src/utils/errors.ts` - Custom error classes
6. `server/src/models/*.ts` - Data interfaces
7. `server/src/repositories/*.ts` - Data access layer
8. `server/src/services/*.ts` - Business logic
9. `server/src/middleware/*.ts` - Auth, RBAC, error handling
10. `server/src/controllers/*.ts` - Route handlers
11. `server/src/routes/*.ts` - API routes
12. `server/src/app.ts` - Express app setup
13. `server/src/index.ts` - Entry point

**Phase 2: Frontend Foundation**
14. `client/package.json` - Dependencies
15. `client/tsconfig.json` - TypeScript config
16. `client/src/types/*.ts` - Shared interfaces
17. `client/src/services/*.ts` - API client with retry logic
18. `client/src/contexts/*.tsx` - Auth & Article contexts
19. `client/src/hooks/*.ts` - Custom hooks

**Phase 3: Frontend Components**
20. `client/src/components/common/*.tsx` - Shared components
21. `client/src/components/layout/*.tsx` - Layout system
22. `client/src/components/editor/*.tsx` - Rich text editor
23. `client/src/components/articles/*.tsx` - Article CRUD
24. `client/src/components/search/*.tsx` - Search & filter
25. `client/src/components/comments/*.tsx` - Comments
26. `client/src/App.tsx` - Main app
27. `client/src/index.tsx` - Entry point

**Phase 4: Finishing**
28. `README.md` - Documentation
29. `.gitignore` - Git ignore rules
30. Sample seed data

---

### Questions Before I Proceed

1. **Rich Text Editor**: Do you have a preference for the editor library? Options:
   - **TipTap** (modern, extensible, great DX)
   - **React-Quill** (simple, quick to implement)
   - **Slate** (most flexible, steeper learning curve)

2. **Styling**: Do you want:
   - **Tailwind CSS** (utility-first, fast development)
   - **CSS Modules** (scoped CSS, no dependencies)
   - **Styled Components** (CSS-in-JS)
   - Or should this match existing Nexus styling conventions?

3. **State Management**: 
   - **React Context + useReducer** (simpler, no extra deps)
   - **Redux Toolkit** (more powerful, better dev tools)
   - **Zustand** (lightweight, simple API)

Let me know your preferences on these three items, and I'll begin building the complete system!