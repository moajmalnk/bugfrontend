# BugRicer Frontend

A modern, high-performance React application built with TypeScript for the BugRicer bug tracking and project management platform. Features a beautiful, responsive UI with real-time updates, offline support, and comprehensive project management capabilities.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Styling](#styling)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Authentication](#authentication)
- [Performance Optimizations](#performance-optimizations)
- [Build & Deployment](#build--deployment)
- [Testing](#testing)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Functionality
- **Bug Tracking Interface**: Intuitive bug reporting, assignment, and tracking with rich media support
- **Project Dashboard**: Comprehensive project overview with analytics and activity feeds
- **Real-time Messaging**: In-app messaging with text, files, and voice notes
- **Task Management**: Full task lifecycle with assignment, tracking, and completion
- **Meeting Integration**: Video conferencing and meeting management
- **Activity Feed**: Real-time activity logging and notifications
- **User Management**: Role-based user interface with permission management
- **Documentation**: Google Docs integration for bug documentation
- **Feedback System**: User feedback collection and statistics

### Advanced Features
- **Offline Support**: Service Worker for offline functionality
- **Push Notifications**: Firebase Cloud Messaging (FCM) integration
- **OAuth Integration**: Google OAuth 2.0 single sign-on
- **Dark Mode**: System-aware theme switching
- **Responsive Design**: Mobile-first, fully responsive layout
- **Keyboard Shortcuts**: Power user keyboard navigation
- **Export Functionality**: PDF generation for bugs and reports
- **Real-time Updates**: Live updates via WebSocket/HTTP polling
- **Error Boundary**: Comprehensive error handling and recovery
- **Performance Monitoring**: Built-in performance metrics

## 🛠 Technology Stack

### Core Framework
- **React 18.3+**: Modern React with concurrent features
- **TypeScript 5.5+**: Type-safe JavaScript
- **Vite 5.4+**: Next-generation build tool and dev server

### UI Framework & Styling
- **Tailwind CSS 3.4+**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible component primitives
- **shadcn/ui**: High-quality component library built on Radix UI
- **Framer Motion 12+**: Production-ready motion library
- **Lucide React**: Beautiful icon library
- **next-themes**: Theme management with system preference detection

### Routing & Navigation
- **React Router DOM 6.26+**: Declarative routing for React

### State Management & Data Fetching
- **TanStack Query (React Query) 5.56+**: Powerful data synchronization
- **React Context API**: Global state management
- **React Hook Form 7.55+**: Performant forms with validation
- **Zod 3.23+**: TypeScript-first schema validation

### HTTP & API
- **Axios 1.8+**: Promise-based HTTP client
- **Interceptors**: Request/response interceptors for auth and error handling

### Authentication
- **JWT Tokens**: Token-based authentication
- **@react-oauth/google**: Google OAuth 2.0 integration
- **Magic Links**: Passwordless authentication support

### Real-time & Notifications
- **Firebase 11.7+**: Push notifications via FCM
- **Service Worker**: Background sync and offline support

### Charts & Visualization
- **Recharts 2.12+**: Composable charting library

### Utilities & Helpers
- **date-fns 3.6+**: Modern JavaScript date utility library
- **clsx & tailwind-merge**: Conditional className utilities
- **jsPDF & jsPDF-AutoTable**: PDF generation
- **react-markdown**: Markdown rendering
- **input-otp**: OTP input component
- **sonner**: Toast notifications

### Development Tools
- **ESLint 9.9+**: Code linting
- **TypeScript ESLint**: TypeScript-specific linting rules
- **SWC**: Fast TypeScript/JavaScript compiler
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## 📦 System Requirements

### Minimum Requirements
- **Node.js**: 18.x or higher (LTS recommended)
- **npm**: 9.x or higher (or **yarn** / **pnpm** / **bun**)
- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Recommended
- **Node.js**: 20.x LTS
- **npm**: 10.x or **pnpm** 8.x
- **16GB RAM**: For optimal development experience
- **Fast Internet**: For package installation and API requests

## 🚀 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd BugRicer/frontend
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm (recommended for faster installs)
pnpm install

# Using bun (fastest)
bun install
```

### 3. Environment Configuration
Create a `.env` file in the `frontend` directory:
```env
# API Configuration
VITE_API_BASE_URL=http://localhost/BugRicer/backend/api
VITE_API_URL=http://localhost/BugRicer/backend/api

# Firebase Configuration (for push notifications)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# Google OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Environment
VITE_ENVIRONMENT=development
```

### 4. Verify Installation
```bash
# Check Node version
node --version

# Check npm version
npm --version

# Verify dependencies
npm list --depth=0
```

## 💻 Development

### Start Development Server
```bash
npm run dev
```

The application will be available at:
- **Local**: `http://localhost:8080`
- **Network**: `http://[your-ip]:8080`

### Development Scripts
```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Build with custom optimization
npm run build:custom

# Build with analysis
npm run build:analyze

# Preview production build locally
npm run preview

# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Performance audit (Lighthouse)
npm run perf:audit
```

### Hot Module Replacement (HMR)
Vite provides instant HMR for:
- React components
- TypeScript files
- CSS/SCSS changes
- Asset updates

Changes reflect instantly without full page reload.

### Development Tools
- **React DevTools**: Browser extension for React debugging
- **Redux DevTools**: For state inspection (if using Redux)
- **Network Tab**: Monitor API calls and responses
- **Console**: Enhanced error messages and warnings

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
│   ├── favicon.ico
│   ├── manifest.json
│   ├── service-worker.js
│   └── ...
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components
│   │   ├── forms/        # Form components
│   │   └── ...
│   ├── pages/            # Page components (routes)
│   │   ├── Dashboard.tsx
│   │   ├── Bugs.tsx
│   │   ├── Login.tsx
│   │   └── ...
│   ├── services/         # API service layer
│   │   ├── bugService.ts
│   │   ├── userService.ts
│   │   ├── messagingService.ts
│   │   └── ...
│   ├── context/          # React Context providers
│   │   ├── AuthContext.tsx
│   │   ├── BugContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── usePermissions.ts
│   │   ├── useApiErrorHandler.ts
│   │   └── ...
│   ├── lib/              # Utility libraries
│   │   ├── utils.ts
│   │   ├── api.ts
│   │   └── ...
│   ├── types/            # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── meetings.ts
│   │   └── ...
│   ├── utils/            # Helper functions
│   │   ├── googleOAuthUtils.ts
│   │   ├── chunkLoader.ts
│   │   └── ...
│   ├── config/           # Configuration files
│   │   └── google-oauth-config.ts
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   ├── index.css         # Global styles
│   └── firebase-config.ts # Firebase configuration
├── dist/                 # Production build output
├── node_modules/         # Dependencies
├── scripts/              # Build and deployment scripts
├── .gitignore
├── index.html            # HTML template
├── package.json
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── README.md
```

## 🏗 Architecture

### Component Architecture
The application follows a component-based architecture:

```
Pages (Route Components)
  ↓
Layout Components
  ↓
Feature Components
  ↓
UI Components (shadcn/ui)
```

### Service Layer Pattern
All API interactions go through service layers:
```typescript
// Example: src/services/bugService.ts
export const bugService = {
  getAll: (params) => api.get('/bugs/getAll.php', { params }),
  getById: (id) => api.get(`/bugs/get.php?id=${id}`),
  create: (data) => api.post('/bugs/create.php', data),
  update: (id, data) => api.put('/bugs/update.php', { id, ...data }),
  delete: (id) => api.delete(`/bugs/delete.php?id=${id}`)
};
```

### Context Providers
Global state managed through React Context:
- **AuthContext**: Authentication state and user data
- **BugContext**: Bug-related global state
- **ThemeContext**: Theme (light/dark) management
- **NotificationContext**: Notification state
- **NotificationSettingsContext**: Notification preferences

### Custom Hooks
Reusable logic encapsulated in custom hooks:
- `usePermissions`: Permission checking
- `useApiErrorHandler`: Centralized error handling
- `useActivityLogger`: Activity logging
- `useFeedback`: Feedback management
- `useLoadingErrorModal`: Loading and error state management

### Data Fetching Strategy
Using TanStack Query for:
- **Caching**: Automatic response caching
- **Background Refetching**: Keep data fresh
- **Optimistic Updates**: Instant UI updates
- **Error Retry**: Automatic retry on failure
- **Request Deduplication**: Prevent duplicate requests

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['bugs', projectId],
  queryFn: () => bugService.getAll({ project_id: projectId }),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000,   // 10 minutes
});
```

## 🎨 Styling

### Tailwind CSS
Utility-first CSS framework for rapid UI development:
```tsx
<div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
    Bug Title
  </h2>
</div>
```

### Component Styling
- **Utility Classes**: Primary styling method
- **CSS Modules**: For component-specific styles (if needed)
- **Tailwind Plugins**: Custom utilities and components
- **Dark Mode**: Automatic dark mode via `next-themes`

### Design System
Built on **shadcn/ui** principles:
- **Accessible**: WCAG 2.1 compliant components
- **Customizable**: Fully customizable via Tailwind
- **Themeable**: Dark mode support built-in
- **Type-safe**: Full TypeScript support

### Responsive Design
Mobile-first responsive design:
- **Breakpoints**: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- **Touch-friendly**: Optimized for mobile interactions
- **Progressive Enhancement**: Works on all devices

## 📊 State Management

### Global State (Context API)
- **Authentication**: User session, tokens, permissions
- **Theme**: Light/dark mode preference
- **Notifications**: Notification state and settings
- **Bug State**: Active bug selection, filters

### Server State (TanStack Query)
- **API Data**: Cached API responses
- **Optimistic Updates**: Immediate UI updates
- **Background Sync**: Keep data fresh

### Local State (useState/useReducer)
- **Form State**: React Hook Form
- **UI State**: Modal open/close, dropdowns, etc.
- **Component State**: Isolated component data

### State Persistence
- **LocalStorage**: User preferences, theme
- **SessionStorage**: Temporary session data
- **Cookies**: Authentication tokens (if applicable)

## 🔌 API Integration

### API Client Setup
Centralized Axios instance in `src/lib/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401, 403, 500, etc.
    return Promise.reject(error);
  }
);
```

### Service Pattern
Services encapsulate API endpoints:
```typescript
// src/services/bugService.ts
import { api } from '@/lib/api';

export const bugService = {
  getAll: async (params = {}) => {
    const response = await api.get('/bugs/getAll.php', { params });
    return response.data;
  },
  // ... other methods
};
```

### Error Handling
Centralized error handling via:
- **Interceptors**: Global error handling
- **Error Boundaries**: React error boundaries
- **Custom Hooks**: `useApiErrorHandler` for component-level handling

## 🔐 Authentication

### Authentication Methods
1. **Email/Password**: Traditional login
2. **Google OAuth**: Single sign-on
3. **Magic Link**: Passwordless email authentication
4. **OTP**: One-time password via SMS/Email

### Token Management
- **JWT Tokens**: Stored in localStorage
- **Token Refresh**: Automatic token refresh before expiration
- **Token Validation**: Client-side token validation

### Protected Routes
```typescript
// Example protected route
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Permission Checking
```typescript
const { hasPermission } = usePermissions();
const canCreateBug = hasPermission('BUGS_CREATE', projectId);
```

## ⚡ Performance Optimizations

### Code Splitting
- **Route-based Splitting**: Each route loaded on demand
- **Component Lazy Loading**: React.lazy() for large components
- **Dynamic Imports**: Load heavy libraries on demand

### Bundle Optimization
- **Tree Shaking**: Remove unused code
- **Minification**: Production build minification
- **Chunk Optimization**: Optimized chunk sizes
- **Asset Optimization**: Image and asset optimization

### Caching Strategy
- **API Caching**: TanStack Query automatic caching
- **Static Assets**: Browser caching with cache headers
- **Service Worker**: Offline caching and preloading

### React Optimizations
- **Memoization**: React.memo(), useMemo(), useCallback()
- **Virtual Scrolling**: For long lists
- **Lazy Loading**: Images and components
- **Debouncing/Throttling**: For search and scroll events

### Build Optimizations
```bash
# Analyze bundle size
npm run build:analyze

# Custom optimization build
npm run build:custom
```

## 🚢 Build & Deployment

### Production Build
```bash
# Standard build
npm run build

# Optimized build with custom settings
npm run build:custom

# Build with bundle analysis
npm run build:analyze
```

### Build Output
Production build creates optimized files in `dist/`:
- **HTML**: Single-page application
- **JavaScript**: Minified, chunked, and tree-shaken
- **CSS**: Minified and optimized
- **Assets**: Optimized images and fonts

### Environment Variables
Set production environment variables:
```env
VITE_API_BASE_URL=https://bugbackend.bugricer.com/api
VITE_FIREBASE_API_KEY=production_key
VITE_ENVIRONMENT=production
```

### Deployment Options

#### Vercel (Recommended)
```bash
npm run deploy:vercel
```

#### Custom Server
1. Build the application: `npm run build`
2. Upload `dist/` contents to web server
3. Configure server for SPA routing
4. Set up environment variables

#### Server Configuration
Ensure your server is configured for SPA routing:
- **Apache**: `.htaccess` file included
- **Nginx**: Configure `try_files` directive
- **All routes**: Redirect to `index.html`

### Deployment Scripts
```bash
# Safe deployment with checks
npm run deploy:safe

# Vercel deployment
npm run deploy:vercel

# Fix MIME type issues
npm run deploy:mime-fix
```

## 🧪 Testing

### Manual Testing
- Test all user flows
- Verify responsive design on multiple devices
- Check accessibility features
- Test offline functionality
- Verify push notifications

### Performance Testing
```bash
# Lighthouse audit
npm run perf:audit

# Bundle analysis
npm run build:analyze
```

### Browser Testing
Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## ♿ Accessibility

### Accessibility Features
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliant
- **Skip Links**: Skip to main content
- **Alt Text**: All images have descriptive alt text

### Accessibility Tools
- **React A11y**: Accessibility linter
- **axe DevTools**: Browser extension for testing
- **Lighthouse**: Accessibility auditing

### Best Practices
- Use semantic HTML elements
- Provide ARIA labels where needed
- Ensure sufficient color contrast
- Test with keyboard-only navigation
- Test with screen readers

## 🔧 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

#### CORS Errors
- Verify API server CORS configuration
- Check `VITE_API_BASE_URL` environment variable
- Ensure API server allows your origin

#### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Port Already in Use
```bash
# Change port in vite.config.ts
server: {
  port: 3000, // or another available port
}
```

#### Hot Module Replacement Not Working
- Check browser console for errors
- Verify Vite server is running
- Clear browser cache
- Restart dev server

#### TypeScript Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Verify types are installed
npm install --save-dev @types/react @types/react-dom
```

#### Service Worker Issues
```bash
# Unregister service worker in browser DevTools
# Application > Service Workers > Unregister
```

### Debugging

#### Enable Debug Mode
```typescript
// In browser console
localStorage.setItem('debug', 'true');
```

#### React DevTools
Install React DevTools browser extension for:
- Component tree inspection
- Props and state inspection
- Performance profiling

#### Network Debugging
- Monitor API calls in Network tab
- Check request/response headers
- Verify authentication tokens

## 📚 Additional Resources

### Documentation
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)

### Code Style
- **ESLint**: Follows React and TypeScript best practices
- **Prettier**: Code formatting (if configured)
- **TypeScript**: Strict mode enabled

### Contributing Guidelines
1. Follow existing code style
2. Write TypeScript types for all props
3. Add JSDoc comments for complex functions
4. Test your changes thoroughly
5. Ensure accessibility compliance

## 📝 Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run build:custom` | Build with custom optimization |
| `npm run build:analyze` | Build with bundle analysis |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Fix linting issues |
| `npm run deploy:safe` | Safe deployment script |
| `npm run deploy:vercel` | Deploy to Vercel |
| `npm run perf:audit` | Run Lighthouse audit |

## 🎯 Key Features Implementation

### Real-time Updates
- WebSocket connections for live updates
- Polling fallback for compatibility
- Optimistic UI updates

### Offline Support
- Service Worker for offline functionality
- Cached API responses
- Offline queue for actions

### Push Notifications
- Firebase Cloud Messaging integration
- Browser notification API
- Notification preferences

### Theme Management
- System preference detection
- Manual theme switching
- Persistent theme selection

## 📞 Support

For issues, questions, or contributions:
- Create an issue in the repository
- Contact the development team
- Review existing documentation

---

**Built with ❤️ using React, TypeScript, and modern web technologies**

