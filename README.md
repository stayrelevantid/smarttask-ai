# SmartTask AI

AI-First Productivity Platform that transforms abstract goals into engineered technical roadmaps.

## Overview

SmartTask AI leverages Generative AI to decompose high-level goals into actionable sub-tasks, complete with effort estimation and dependency mapping. Built with React 19 and deployed on cloud-native infrastructure using k3d.

## Features

### 🤖 AI Features
- **AI Goal Decomposition**: Transform goals into 5-8 unique, actionable sub-tasks using Google Gemini
- **Smart Deduplication**: AI automatically removes duplicate and redundant tasks
- **Effort Estimation**: Automatic time estimation (15-240 minutes) for each task
- **Task Refinement**: Chat-based interface to adjust AI-generated tasks
- **Multi-language Support**: AI generates tasks in English or Indonesian based on user preference

### ✅ Task Management
- **Sequential Completion**: Tasks must be completed in order (top to bottom)
- **Dependency Mapping**: Visual indicators for locked tasks and prerequisites
- **Drag & Drop Reordering**: Reorder tasks with intuitive drag and drop
- **Undo Delete**: Restore accidentally deleted tasks with 5-second undo window

### 📊 Progress Tracking
- **Real-time Progress**: Progress bar with percentage calculation
- **Goal Completion**: "COMPLETED" stamp with celebration animation
- **Visual Indicators**: Trophy icons and green styling for finished goals
- **Sidebar Progress**: Mini progress bars in goal list

### 🔐 Authentication & Sync
- **Multi-provider Auth**: Email/Password + Google OAuth
- **Real-time Sync**: Instant updates across all clients via Supabase Realtime
- **Protected Routes**: Secure access with JWT tokens

### 📱 PWA Support
- **Offline-capable**: Progressive Web App functionality
- **Responsive Design**: Works on desktop and mobile

### 🌐 Internationalization
- **Language Toggle**: Switch between English and Indonesian
- **Context API**: Shared language state across all components
- **AI Language Consistency**: Tasks generated in selected language
- **UI Translation**: All interface elements translated

### 🎨 UI/UX
- **Modern Interface**: Built with shadcn/ui and Tailwind CSS
- **Light Mode**: Clean, professional design
- **Animations**: Smooth transitions and celebration effects
- **Loading States**: Skeleton loaders for better UX

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 (Concurrent Rendering) |
| UI Kit | shadcn/ui + Tailwind CSS |
| State | Zustand |
| Drag & Drop | @dnd-kit (Core, Sortable, Utilities) |
| Backend | Supabase (PostgreSQL, Auth, Real-time) |
| AI | Vercel AI SDK + Google Gemini |
| Validation | Zod |
| Container | Docker (Multi-stage) |
| Orchestration | k3d (K3s Kubernetes) |

## Quick Start

### Prerequisites

- Node.js 20+
- Docker
- k3d (optional, for Kubernetes deployment)

### Local Development

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev

# Build for production
npm run build
```

### Docker Deployment

```bash
# Build Docker image
docker build -t smarttask-ai .

# Run container locally
docker run -p 8080:80 smarttask-ai
```

### Kubernetes Deployment (k3d)

```bash
# Create k3d cluster with loadbalancer
k3d cluster create smarttask -p "80:80@loadbalancer"

# Update ConfigMap and Secret with your Supabase credentials
# Edit k8s/config.yaml with your values

# Apply Kubernetes manifests
kubectl apply -f k8s/

# Access the application
curl http://smarttask.local
```

## Project Structure

```
smarttask-ai/
├── k8s/                    # Kubernetes manifests
│   ├── deployment.yaml     # 2 Replicas with health probes
│   ├── service.yaml        # ClusterIP service
│   ├── ingress.yaml        # Traefik ingress
│   └── config.yaml         # ConfigMap and Secret
├── src/
│   ├── components/
│   │   ├── ui/            # shadcn/ui primitives
│   │   ├── auth/          # AuthPage, AuthForm, GoogleAuthButton
│   │   ├── dashboard/     # ProgressHeader
│   │   ├── goals/         # DeleteGoalDialog
│   │   └── tasks/         # TaskItem, TaskInput, AIRefiner, etc.
│   ├── hooks/             # Custom hooks
│   │   ├── useAuth.tsx    # Authentication context
│   │   ├── useLanguage.tsx # Language context (i18n)
│   │   ├── useAllTasks.ts # All tasks for progress
│   │   ├── useGoals.ts    # Goals management
│   │   ├── useTasks.ts    # Tasks management
│   │   └── useAIIntegration.ts # AI service
│   ├── store/             # Zustand store
│   ├── lib/               # Supabase client, utilities, AI service
│   ├── types/             # TypeScript definitions
│   ├── App.tsx            # Main application
│   └── main.tsx           # Entry point
├── supabase/              # Database schema
│   ├── schema.sql         # Main schema
│   └── migrations/        # Database migrations
├── Dockerfile             # Multi-stage build
├── nginx.conf             # Nginx configuration
└── vite.config.ts         # Vite + PWA config
```

## Core Components

### ProgressHeader
Sticky progress bar showing completion percentage:
```
Progress: ████████░░ 80%
12 of 15 tasks completed
```

### TaskItem
Task display with:
- Checkbox with optimistic updates (React 19 `useOptimistic`)
- Time estimation badge (e.g., "15m", "1h 30m")
- Lock status for dependent tasks
- Dependency chain indicators

### AIRefiner
Chat interface for refining tasks:
- Input field for natural language prompts
- Loading state indicator
- Sends task array + prompt to AI backend

## State Management

The Zustand store handles:
- Goals and tasks CRUD operations
- Dependency resolution (Lock/Unlock logic)
- Progress calculation
- Optimistic updates

```typescript
// Check if a task is locked
const isLocked = useTodoStore((state) => state.isTaskLocked(taskId));

// Get progress percentage
const progress = useTodoStore((state) => state.getProgressPercentage());
```

## Database Schema

### Goals Table
```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  est_min INTEGER DEFAULT 15,
  depends_on UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables

### Local Development

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your Supabase credentials from [https://app.supabase.com](https://app.supabase.com):

```env
# Required
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key-here
VITE_GOOGLE_API_KEY=your-google-api-key-here

# Optional
VITE_AI_MODEL=gemini-1.5-flash
VITE_APP_NAME=SmartTask AI
VITE_APP_VERSION=0.1.0
```

**Note**: `.env` is gitignored. Never commit actual credentials to version control.

### Kubernetes Deployment

For k3d/Kubernetes deployment, update `k8s/config.yaml` with your credentials:

```yaml
# ConfigMap - Safe for non-sensitive data
apiVersion: v1
kind: ConfigMap
metadata:
  name: smarttask-config
data:
  supabase-url: "https://your-project.supabase.co"

---
# Secret - For sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: smarttask-secrets
type: Opaque
stringData:
  supabase-publishable-key: "your-publishable-key-here"
```

Then apply:
```bash
kubectl apply -f k8s/config.yaml
```

## Development Phases

### Phase 1: Local Development ✅
- React 19 + Vite setup
- shadcn/ui integration
- Zustand state management
- Environment configuration (.env setup)
- Docker containerization
- Kubernetes manifests
- Security vulnerability fixes

### Phase 2: Database & Auth ✅
- Supabase provisioning
- SQL schema deployment with RLS
- Authentication (Email/Google OAuth)
- Real-time subscriptions
- TypeScript database types

### Phase 3: AI Integration ✅
- Vercel AI SDK with Google Gemini
- Goal decomposition logic
- Task refinement API
- Duplicate detection & merging
- Sequential task dependencies

### Phase 4: Polish & UX ✅
- Undo feature for task deletion
- Drag & drop reordering
- Completed goal stamp & celebration
- Progress indicators
- Error boundaries
- Loading skeletons

### Phase 5: Internationalization ✅
- Language toggle (English/Indonesian)
- Context API for state sharing
- AI task generation in selected language
- UI translation system
- Bug fixes for state synchronization

**Status**: ✅ **ALL PHASES COMPLETE** - Production Ready!

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Recent Updates

### March 19, 2025

#### 🐛 Bug Fixes
- **Language Toggle State**: Fixed issue where language changes required page refresh. Now uses React Context API for instant state sharing.
- **Progress Animation**: Fixed sidebar progress bars disappearing when switching goals. Added `useAllTasks` hook to maintain progress visibility for all goals.

#### ✨ New Features
- **Bilingual Support**: Full UI translation between English and Indonesian
- **AI Language Consistency**: Tasks generated in user's selected language
- **Context API Implementation**: Shared language state across all components

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

Built with ❤️ using React 19, TypeScript, Zustand, Supabase, and Google Gemini AI
