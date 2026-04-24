# Krashaq Frontend Documentation

## Overview

Krashaq Frontend is a Next.js 16 web application that provides a modern, responsive interface for the smart farming assistant platform. It features real-time weather data, AI-powered chat with multi-agent system, irrigation advice, comprehensive user authentication, and a full admin dashboard with analytics and system monitoring.

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **State Management**: React Context API
- **Authentication**: JWT + Google OAuth 2.0
- **Icons**: Lucide React
- **HTTP Client**: Native Fetch API
- **Linting**: ESLint v9 with TypeScript, React, and Next.js plugins
- **Formatting**: Prettier with ESLint integration
- **Testing**: Jest with React Testing Library

## Project Structure

```
frontend/
├── app/
│   ├── api/              # API routes (server-side)
│   ├── auth/             # Authentication pages
│   ├── farmers/          # Farmers management
│   ├── profile/          # User profile pages
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/
│   ├── auth/             # Authentication components
│   ├── chat/             # Chat interface components
│   ├── dashboard/        # Dashboard components
│   ├── layout/           # Layout components
│   ├── theme/            # Theme provider
│   └── ui/               # Reusable UI components
├── contexts/             # React contexts
├── lib/                  # Utility functions
├── public/               # Static assets
└── package.json          # Dependencies
```

## Core Modules

### 1. App Router Structure (`app/`)

#### 1.1 Root Layout (`app/layout.tsx`)

**Purpose**: Root layout wrapper for the entire application

**Features**:

- ThemeProvider for dark/light mode support
- AuthProvider for authentication state management
- Global metadata configuration
- HTML structure with hydration warning suppression

**Providers**:

- `ThemeProvider`: Manages theme (light/dark/system)
- `AuthProvider`: Manages user authentication state

---

#### 1.2 Home Page (`app/page.tsx`)

**Purpose**: Main dashboard page

**Features**:

- Auto-loads user's location from hierarchy (locality > tehsil > district > state)
- Fetches weather data with location hierarchy parameters
- Displays weather card and irrigation panel
- Integrated chat interface
- Protected route (requires authentication)

**Components Used**:

- `MainLayout`: Main application layout
- `WeatherCard`: Weather information display
- `IrrigationPanel`: Irrigation advice panel
- `ChatInterface`: AI chat interface
- `ProtectedRoute`: Authentication wrapper

**State Management**:

- `location`: Current location for weather queries
- `fullLocation`: Full location string with hierarchy
- `weather`: Weather data from API

**API Calls**:

- `GET /api/weather`: Fetches weather with location parameters

---

### 2. Authentication Pages (`app/auth/`)

#### 2.1 Login Page (`app/auth/login/page.tsx`)

**Purpose**: User login page

**Features**:

- Email/password login
- Google OAuth login
- Form validation
- Error handling
- Redirect to dashboard on success

**API Calls**:

- `POST /api/auth/login/email`: Email/password authentication
- Google OAuth flow (redirects to Google)

**Remaining Features**:

- Remember me functionality
- Forgot password link
- Social login buttons (other than Google)

---

#### 2.2 Signup Page (`app/auth/signup/page.tsx`)

**Purpose**: User registration page

**Features**:

- Email/password registration
- Location hierarchy selection (state, district, tehsil, locality, pincode)
- Form validation
- Phone number input
- Error handling

**API Calls**:

- `POST /api/auth/signup`: Create new user

**Form Fields**:

- Email
- Name
- Password
- Phone (optional)
- State (required)
- District (required)
- Tehsil (required)
- Locality (optional)
- Pincode (optional)

---

#### 2.3 Register Page (`app/auth/register/page.tsx`)

**Purpose**: Complete registration after Google OAuth

**Features**:

- Completes user registration after Google OAuth
- Location hierarchy selection
- Profile information
- Phone number input

**API Calls**:

- `POST /api/auth/register`: Complete registration

---

#### 2.4 Callback Page (`app/auth/callback/page.tsx`)

**Purpose**: Google OAuth callback handler

**Features**:

- Handles Google OAuth redirect
- Exchanges authorization code for tokens
- Redirects to registration or dashboard
- Error handling

**API Calls**:

- `POST /api/auth/google/login`: Exchange code for tokens

---

### 3. API Routes (`app/api/`)

#### 3.1 Chat API (`app/api/chat/route.ts`)

**Purpose**: Server-side proxy for chat API

**Features**:

- Proxies chat requests to backend
- Handles authentication
- Error handling

**API Calls**:

- `POST /api/chat`: Backend chat endpoint

**Remaining Features**:

- Request/response logging
- Rate limiting
- Caching

---

#### 3.2 Weather API (`app/api/weather/route.ts`)

**Purpose**: Server-side proxy for weather API

**Features**:

- Proxies weather requests to backend
- Supports location hierarchy parameters
- Error handling

**API Calls**:

- `GET /api/weather`: Backend weather endpoint

**Parameters**:

- `city`: City name (fallback)
- `locality`: Locality name (highest priority)
- `tehsil`: Tehsil name
- `district`: District name
- `state`: State name

---

### 4. Farmers Page (`app/farmers/page.tsx`)

**Purpose**: Farmers management page

**Features**:

- List all farmers
- Add new farmer
- Edit farmer details
- Delete farmer
- Search/filter functionality

**API Calls**:

- `GET /api/farmers`: Get all farmers
- `POST /api/farmers`: Create farmer
- `PUT /api/farmers/{id}`: Update farmer
- `DELETE /api/farmers/{id}`: Delete farmer

**Components Used**:

- `FarmerForm`: Farmer form component
- Table component for listing

**Remaining Features**:

- Farmer analytics dashboard
- Export to CSV
- Bulk operations
- Advanced filtering

---

### 5. Admin Pages (`app/admin/`)

#### 5.1 Admin Dashboard (`app/admin/page.tsx`)

**Purpose**: Main admin dashboard

**Features**:

- Overview of system metrics
- Quick access to admin features
- Navigation to admin sub-pages

#### 5.2 Analytics Dashboard (`app/admin/analytics/page.tsx`)

**Purpose**: System analytics and metrics

**Features**:

- User activity metrics
- Chat statistics
- LLM provider usage
- Agent performance metrics
- System performance charts

**API Calls**:

- `GET /api/admin/analytics`: Get analytics data

#### 5.3 Audit Logs (`app/admin/audit/page.tsx`)

**Purpose**: Audit log viewer

**Features**:

- View system audit logs
- Filter by user, action, date
- Export logs

**API Calls**:

- `GET /api/admin/audit-logs`: Get audit logs

#### 5.4 System Configuration (`app/admin/config/page.tsx`)

**Purpose**: System configuration management

**Features**:

- View and update system configuration
- LLM provider settings
- Cache settings
- Feature flags

**API Calls**:

- `GET /api/admin/config`: Get configuration
- `POST /api/admin/config`: Update configuration

#### 5.5 System Health (`app/admin/health/page.tsx`)

**Purpose**: System health monitoring

**Features**:

- Database health status
- Redis health status
- LLM provider availability
- System resource usage

**API Calls**:

- `GET /api/admin/health`: Get system health

#### 5.6 Scheduler Configuration (`app/admin/scheduler/page.tsx`)

**Purpose**: Background job scheduler management

**Features**:

- View scheduled jobs
- Update job schedules
- Pause/resume jobs
- View job execution history

**API Calls**:

- `GET /api/admin/scheduler`: Get scheduler config
- `POST /api/admin/scheduler`: Update scheduler config
- `POST /api/admin/jobs/{job_id}/pause`: Pause job
- `POST /api/admin/jobs/{job_id}/resume`: Resume job

#### 5.7 User Management (`app/admin/users/page.tsx`)

**Purpose**: User management for admins

**Features**:

- List all users
- View user details
- Delete users
- Filter and search

**API Calls**:

- `GET /api/admin/users`: Get all users
- `DELETE /api/admin/users/{id}`: Delete user

### 6. Profile Pages (`app/profile/`)

#### 6.1 Profile Page (`app/profile/page.tsx`)

**Purpose**: User profile page

**Features**:

- Display user information
- Edit profile
- Update location hierarchy
- Change password
- 2FA settings (UI only, not functional)

**API Calls**:

- `GET /api/auth/me`: Get current user
- `PUT /api/auth/me`: Update profile
- `PUT /api/auth/me/password`: Update password

**Sections**:

- Personal information
- Location details
- Account settings
- Security settings

---

#### 5.2 Settings Page (`app/profile/settings/page.tsx`)

**Purpose**: User settings page

**Features**:

- Theme selection
- Language preference
- Notification settings
- Privacy settings

**Remaining Features**:

- Save preferences to backend
- Email notification settings
- SMS notification settings
- Data export
- Account deletion

---

### 7. Components

#### 7.1 Authentication Components (`components/auth/`)

**ProtectedRoute Component**

- Wraps routes that require authentication
- Redirects to login if not authenticated
- Loading state handling

**AuthForm Component**

- Generic authentication form
- Handles login/signup forms
- Validation
- Error display

---

#### 7.2 Chat Components (`components/chat/`)

**ChatInterface Component**

- Main chat interface
- Message display
- Input field
- Send button
- Auto-scroll to latest message
- Loading state

**ChatMessage Component**

- Individual message display
- User vs assistant styling
- Timestamp
- Tools used indicator

**ChatInput Component**

- Message input field
- Send button
- Enter key support
- Character count

**Remaining Features**:

- Message reactions
- Message editing
- Message deletion
- File/image upload
- Voice message input
- Typing indicator

---

#### 7.3 Dashboard Components (`components/dashboard/`)

**WeatherCard Component**

- Displays current weather
- Temperature, humidity, wind speed
- Weather icon
- Location display
- Refresh button
- Location change input

**IrrigationPanel Component**

- Displays irrigation advice
- Based on weather data
- Water requirement calculation
- Crop-specific recommendations

**Remaining Features**:

- Weather forecast (multi-day)
- Historical weather data
- Weather alerts
- Irrigation schedule
- Water usage tracking

---

#### 7.4 Layout Components (`components/layout/`)

**MainLayout Component**

- Main application layout
- Header with navigation
- Sidebar (if applicable)
- Main content area
- Responsive design

**Header Component**

- Logo
- Navigation links
- User menu
- Theme toggle
- Logout button

**Sidebar Component**

- Navigation menu
- Collapsible
- Active state indication

---

#### 7.5 Theme Components (`components/theme/`)

**ThemeProvider Component**

- Manages theme state
- Persists to localStorage
- System theme detection
- Theme toggle button

**ThemeToggle Component**

- Toggle between light/dark mode
- Icon display
- Smooth transitions

---

#### 7.6 Admin Components (`components/admin/`)

**AdminDashboard Component**

- Main admin dashboard layout
- Navigation to admin sub-pages
- Quick stats overview

**AnalyticsDashboard Component**

- Analytics charts and graphs
- Metrics display
- Performance indicators

**AuditLogView Component**

- Audit log table
- Filtering and search
- Export functionality

**ConfigPanel Component**

- Configuration form
- System settings editor
- Save/apply changes

**SchedulerConfigPanel Component**

- Scheduler job list
- Job configuration forms
- Pause/resume controls

**SystemHealth Component**

- Health status indicators
- Resource usage displays
- Service availability checks

**UserList Component**

- User table with actions
- User details view
- Delete confirmation

#### 7.7 UI Components (`components/ui/`)

Based on shadcn/ui components:

- Button
- Input
- Card
- Dialog
- Dropdown Menu
- Form
- Label
- Select
- Tabs
- Toast
- And more...

All components are customizable and follow the shadcn/ui pattern.

---

### 8. Contexts

#### 8.1 AuthContext (`contexts/AuthContext.tsx`)

**Purpose**: Global authentication state management

**Features**:

- User state management
- Login/logout functions
- Token management
- Auto-refresh tokens
- Persist to localStorage
- Protected route checking

**API Calls**:

- `GET /api/auth/me`: Fetch user data
- `POST /api/auth/refresh`: Refresh access token

**State**:

- `user`: Current user object
- `loading`: Loading state
- `authenticated`: Authentication status

**Functions**:

- `login(email, password)`: Login with credentials
- `logout()`: Logout user
- `refreshToken()`: Refresh access token

**Remaining Features**:

- Session timeout handling
- Concurrent login detection
- Token revocation

---

### 9. Utility Functions (`lib/`)

**API Client**

- Base API configuration
- Request/response interceptors
- Error handling
- Token injection

**Formatters**

- Date formatting
- Number formatting
- Currency formatting

**Validators**

- Email validation
- Phone validation
- Form validation helpers

**Remaining Features**:

- Comprehensive error handling
- Request retry logic
- Offline support
- Request caching

---

## Pages and Routes

### Public Routes

- `/` - Redirect to login if not authenticated
- `/auth/login` - Login page
- `/auth/signup` - Signup page
- `/auth/callback` - OAuth callback

### Protected Routes

- `/` - Dashboard (home)
- `/farmers` - Farmers management
- `/admin` - Admin dashboard (admin only)
- `/admin/analytics` - Analytics dashboard (admin only)
- `/admin/audit` - Audit logs (admin only)
- `/admin/config` - System configuration (admin only)
- `/admin/health` - System health (admin only)
- `/admin/scheduler` - Scheduler configuration (admin only)
- `/admin/users` - User management (admin only)
- `/profile` - User profile
- `/profile/settings` - User settings

---

## API Integration

### Backend API Base URL

- Development: `http://localhost:8000`
- Configured via environment variable

### Authentication

All protected API calls include the JWT access token:

```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`
}
```

### Key API Endpoints Used

**Authentication**

- `POST /api/auth/login/email` - Login
- `POST /api/auth/signup` - Signup
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get user
- `PUT /api/auth/me` - Update user
- `POST /api/auth/refresh` - Refresh token

**Chat**

- `POST /api/chat` - Send message

**Weather**

- `GET /api/weather` - Get weather

**Farmers**

- `GET /api/farmers` - Get farmers
- `POST /api/farmers` - Create farmer
- `PUT /api/farmers/{id}` - Update farmer
- `DELETE /api/farmers/{id}` - Delete farmer

**Admin**

- `GET /api/admin/analytics` - Get analytics
- `GET /api/admin/audit-logs` - Get audit logs
- `GET /api/admin/config` - Get configuration
- `POST /api/admin/config` - Update configuration
- `GET /api/admin/health` - Get system health
- `GET /api/admin/scheduler` - Get scheduler config
- `POST /api/admin/scheduler` - Update scheduler config
- `GET /api/admin/users` - Get users
- `DELETE /api/admin/users/{id}` - Delete user

---

## State Management

### Authentication State

Managed by `AuthContext`:

- User object
- Authentication status
- Token management
- Auto-refresh

### Component State

Managed by React hooks:

- `useState`: Local component state
- `useEffect`: Side effects and API calls
- `useContext`: Access to AuthContext

### Remaining Features

- Global state management (Zustand/Redux)
- Optimistic updates
- State persistence
- State synchronization

---

## Styling

### TailwindCSS

- Utility-first CSS framework
- Responsive design
- Dark mode support
- Custom theme configuration

### Theme Configuration

- Colors: Custom color palette
- Spacing: Consistent spacing scale
- Typography: Custom font families
- Components: shadcn/ui theme

### Global Styles (`globals.css`)

- Base styles
- Tailwind directives
- Custom CSS variables
- Dark mode styles

---

## Responsive Design

### Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile Features

- Touch-friendly UI
- Responsive navigation
- Mobile-optimized forms
- Swipe gestures (future)

---

## Accessibility

### Features

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

### Remaining Features

- WCAG 2.1 AA compliance
- Color contrast validation
- Accessibility testing
- Alternative text for images

---

## Performance

### Optimizations

- Code splitting (automatic with Next.js)
- Image optimization (next/image)
- Lazy loading
- Static generation where possible
- API route caching

### Remaining Features

- Service worker for offline support
- Asset caching strategy
- Performance monitoring
- Bundle size optimization

---

## Code Quality

### Linting

ESLint v9 with strict configuration for:
- TypeScript support
- React best practices
- Next.js specific rules
- Prettier integration

```bash
npm run lint       # Check for linting errors
npm run lint:fix   # Auto-fix linting errors
```

### Formatting

Prettier ensures consistent code style:
- Semi-colons enabled
- Single quotes
- Trailing commas (ES5)
- Print width: 100

```bash
npm run format      # Check formatting
npm run format:fix  # Fix formatting issues
```

### Type Checking

TypeScript in strict mode:
- No implicit any
- Strict null checks
- All components fully typed

```bash
npx tsc --noEmit    # Type check without emitting files
```

### Type Safety Improvements

- All `any` types replaced with proper interfaces
- Error handling uses `unknown` with type guards
- Proper type definitions for API responses
- Component props fully typed

---

## Development Guide

### Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. Run development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

5. Start production server:

```bash
npm start
```

### Adding New Pages

1. Create a new folder in `app/`
2. Add `page.tsx` file
3. Export default component
4. Add to navigation if needed

### Adding New Components

1. Create component file in `components/`
2. Export as default
3. Import and use in pages
4. Follow existing patterns

### Adding New API Routes

1. Create folder in `app/api/`
2. Add `route.ts` file
3. Export GET, POST, PUT, DELETE handlers
4. Handle authentication if needed

---

## Testing

### Unit Tests

```bash
npm run test          # Run tests in watch mode
npm run test:ci       # Run tests in CI mode
```

**Test Framework**: Jest with React Testing Library
- Configured with Next.js integration
- jsdom environment for component testing
- @testing-library/jest-dom for custom matchers
- Coverage collection enabled
- Test files in `__tests__/` directory

### E2E Tests

```bash
npm run test:e2e      # Planned
```

### Implemented Features

- Component testing setup
- Jest configuration
- Sample test for FarmerForm component
- TypeScript support in tests

### Remaining Features

- Comprehensive test coverage
- Integration testing
- Visual regression testing
- E2E testing setup

---

## CI/CD

### Automated Pipeline

The frontend includes a comprehensive CI/CD pipeline that ensures code quality:

**Pipeline Steps**:
1. Install dependencies
2. Run ESLint (linting checks)
3. Run TypeScript type checking
4. Run Prettier formatting check
5. Run Jest tests
6. Build Next.js application

**Quality Gates**:
- Pipeline fails on any check failure
- Build runs only after all checks pass
- Ensures consistent code quality across all commits

**Configuration**:
- `.github/workflows/ci.yml` - CI/CD pipeline definition
- Runs on push/PR to main and develop branches

---

## Deployment

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID

### Deployment Platforms

- Vercel (recommended)
- Netlify
- AWS
- Docker

### Build Process

- Next.js build optimization
- Static page generation
- API route compilation
- Asset optimization

---

## Future Enhancements

### Short Term

- Complete 2FA UI
- Add password reset flow
- Implement email verification
- Add loading skeletons
- Improve error handling
- Complete admin dashboard features
- Add real-time updates for admin metrics

### Medium Term

- Add file upload support
- Implement voice messages
- Enhance admin dashboard with more analytics
- Add advanced analytics charts
- Implement notifications
- Add real-time WebSocket updates

### Long Term

- PWA support
- Offline mode
- Multi-language support
- Advanced animations
- Mobile app (React Native)

---

## Browser Support

### Supported Browsers

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Minimum Requirements

- ES6 support
- CSS Grid support
- Flexbox support
- LocalStorage support

---

## Security

### Features

- JWT authentication
- Secure HTTP-only cookies (future)
- XSS protection
- CSRF protection (future)
- Content Security Policy (future)

### Remaining Features

- Security headers
- Input sanitization
- Output encoding
- Dependency scanning

---

## Support

For issues and questions, please refer to the main project README or contact the development team.
