# Nexus Knowledge Base

A modern Knowledge Management System (KMS) built for ITSM teams. Create, read, edit, and manage knowledge articles with role-based access control, version history, and collaborative features.

## Features

- 📝 **Rich Text Editor** - React-Quill powered WYSIWYG editor for creating formatted articles
- 🔐 **Role-Based Access Control** - Four-tier permission system (Reader, Actor, Author, Editor)
- 📚 **Version History** - Track all changes with ability to view and restore previous versions
- 💬 **Comments & Collaboration** - Nested comments with edit/delete capabilities
- 🔒 **Article Locking** - Prevent concurrent edits with automatic lock management
- 🏷️ **Categories & Tags** - Organize articles with ITSM-relevant categories and custom tags
- 🔍 **Search & Filter** - Full-text search with category and status filtering
- 📱 **Responsive Design** - Works in standalone mode or embedded in sidebars/panels
- 💾 **Autosave** - Never lose work with automatic draft saving

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexus-knowledge-base
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Configure environment** (optional)
   ```bash
   cd ../server
   cp .env.example .env
   # Edit .env as needed
   ```

### Running the Application

#### Development Mode

Start both servers in development mode:

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

#### Production Mode

Build and run for production:

```bash
# Build backend
cd server
npm run build

# Build frontend
cd ../client
npm run build

# Start backend (serves API)
cd ../server
npm start
```

## Project Structure

```
nexus-knowledge-base/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── common/       # Reusable components (Button, Modal, etc.)
│   │   │   ├── layout/       # Layout components (Header, Layout)
│   │   │   ├── articles/     # Article-specific components
│   │   │   └── comments/     # Comment components
│   │   ├── contexts/         # React Context providers
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API service layer
│   │   ├── types/            # TypeScript type definitions
│   │   ├── App.tsx           # Main application component
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── server/                   # Express backend
│   ├── src/
│   │   ├── config/           # Configuration management
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Express middleware
│   │   ├── models/           # TypeScript interfaces
│   │   ├── repositories/     # Data access layer
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic layer
│   │   ├── utils/            # Utilities (logger, errors, helpers)
│   │   ├── app.ts            # Express app setup
│   │   └── index.ts          # Server entry point
│   ├── data/                 # JSON data storage
│   ├── logs/                 # Application logs
│   └── package.json
│
└── README.md
```

## API Endpoints

### Articles

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/articles` | List all articles | Reader |
| GET | `/api/articles/:id` | Get article by ID | Reader |
| POST | `/api/articles` | Create new article | Author |
| PUT | `/api/articles/:id` | Update article | Author* |
| DELETE | `/api/articles/:id` | Delete article | Editor |
| POST | `/api/articles/:id/publish` | Publish article | Author* |
| POST | `/api/articles/:id/unpublish` | Unpublish article | Author* |

*Authors can only edit their own articles; Editors can edit any article

### Versions

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/versions/:articleId` | Get version history | Reader |
| GET | `/api/versions/:articleId/:version` | Get specific version | Reader |
| POST | `/api/versions/:articleId/:version/restore` | Restore version | Author |

### Comments

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/comments/:articleId` | Get article comments | Reader |
| POST | `/api/comments/:articleId` | Add comment | Actor |
| PUT | `/api/comments/:articleId/:commentId` | Update comment | Actor* |
| DELETE | `/api/comments/:articleId/:commentId` | Delete comment | Actor* |

*Users can only edit/delete their own comments

### Locks

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/locks/:articleId` | Get lock status | Reader |
| POST | `/api/locks/:articleId/acquire` | Acquire lock | Author |
| POST | `/api/locks/:articleId/release` | Release lock | Author |
| POST | `/api/locks/:articleId/renew` | Renew lock | Author |

### Categories

| Method | Endpoint | Description | Required Role |
|--------|----------|-------------|---------------|
| GET | `/api/categories` | List all categories | Reader |
| GET | `/api/categories/:id` | Get category by ID | Reader |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (mock) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

## Role-Based Access Control

The system supports four roles with hierarchical permissions:

| Permission | Reader | Actor | Author | Editor |
|------------|--------|-------|--------|--------|
| View published articles | ✅ | ✅ | ✅ | ✅ |
| View draft articles | ❌ | ❌ | Own only | ✅ |
| Add comments | ❌ | ✅ | ✅ | ✅ |
| Edit own comments | ❌ | ✅ | ✅ | ✅ |
| Create articles | ❌ | ❌ | ✅ | ✅ |
| Edit own articles | ❌ | ❌ | ✅ | ✅ |
| Edit any article | ❌ | ❌ | ❌ | ✅ |
| Delete articles | ❌ | ❌ | ❌ | ✅ |
| Publish/unpublish | ❌ | ❌ | Own only | ✅ |

### Mock Users for Development

The system includes mock users for testing:

| Username | Role | Description |
|----------|------|-------------|
| `reader` | Reader | Can only view published articles |
| `actor` | Actor | Can view and comment |
| `author` | Author | Can create and manage own articles |
| `editor` | Editor | Full access to all articles |

## Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server
PORT=3001
NODE_ENV=development

# Data Storage
DATA_STORAGE_PATH=./data

# Security
JWT_SECRET=your-secret-key

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug

# Article Locking
LOCK_TIMEOUT_MINUTES=30
```

### Layout Modes

The application supports two layout modes:

1. **Standalone Mode** - Full-width layout for desktop use
2. **Sidebar/Panel Mode** - Compact layout for embedding

The layout auto-detects based on viewport width but can be manually toggled in the header.

## Development

### Available Scripts

**Backend (server/):**
```bash
npm run dev       # Start development server with hot reload
npm run build     # Compile TypeScript
npm start         # Run production build
npm run lint      # Run ESLint
```

**Frontend (client/):**
```bash
npm run dev       # Start Vite dev server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Architecture Decisions

1. **File-Based Storage**: Uses JSON files for simplicity with a repository pattern that allows easy migration to databases (PostgreSQL, MongoDB, etc.)

2. **React Context + useReducer**: Chosen over Redux for simpler state management suitable for this application's scope

3. **CSS Modules**: Provides scoped styling without CSS-in-JS runtime overhead

4. **Repository Pattern**: Abstracts data access, making it easy to swap storage implementations

### Adding Database Support

The repository pattern makes it straightforward to add database support:

1. Create a new repository implementation (e.g., `PostgresArticleRepository`)
2. Implement the `IArticleRepository` interface
3. Update dependency injection in services

Example:
```typescript
// repositories/PostgresArticleRepository.ts
export class PostgresArticleRepository implements IArticleRepository {
  async findAll(): Promise<Article[]> {
    // PostgreSQL implementation
  }
  // ... other methods
}
```

## SSO Integration

The authentication system includes hooks for SSO integration:

```typescript
// In AuthContext, the ssoLogin method is ready for implementation
const ssoLogin = async (token: string): Promise<void> => {
  // Validate SSO token with your identity provider
  // Exchange for application session
};
```

To integrate with your SSO provider:
1. Implement the SSO callback endpoint in the backend
2. Update the `ssoLogin` method in `AuthContext`
3. Add SSO configuration to environment variables

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find and kill process on port 3001
npx kill-port 3001
```

**Data not persisting:**
- Ensure the `data/` directory exists and is writable
- Check `DATA_STORAGE_PATH` environment variable

**CORS errors:**
- Verify `CORS_ORIGIN` matches your frontend URL
- Check that the Vite proxy is configured correctly

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
