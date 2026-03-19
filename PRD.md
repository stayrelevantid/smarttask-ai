# MASTER PRD: SmartTask AI (React 19 Edition)

## 1. Product Vision

SmartTask AI is an "AI-First" productivity platform designed to transform abstract goals into engineered technical roadmaps. It leverages Generative AI to decompose goals, estimate effort, and map technical dependencies, all served within a high-performance React 19 interface and a cloud-native (k3d) infrastructure.

## 2. User Flow (The Golden Path)

- **Onboarding**: User authenticates via Supabase Auth (Email/Google).
- **Goal Entry**: User inputs a high-level goal (e.g., "Setup Grafana monitoring on Kubernetes").
- **AI Decomposition**: System invokes the AI, displays a Skeleton loader, and renders 5–10 sub-tasks.
- **Refinement (Iteration 1)**: User adjusts the list via a chat interface (e.g., "Use Prometheus as the data source").
- **Execution (Iteration 2 & 6)**: User views time estimations and "Locked Tasks" (Dependency Mapping).
- **Progress Tracking**: User checks off tasks; the Progress Bar updates in real-time, and data syncs to Supabase.

## 3. Technical Stack

| Layer       | Technology          | Specification |
|-------------|---------------------|----------------|
| Frontend   | React 19           | Concurrent Rendering, use hooks, useOptimistic. |
| UI Kit     | shadcn/ui          | Tailwind CSS based (Slate/Zinc Palette - Light Mode). |
| State      | Zustand            | Centralized, lightweight reactive state management. |
| Backend/DB | Supabase           | PostgreSQL, Real-time engine, RLS, and Auth. |
| AI SDK     | Vercel AI SDK      | Streaming responses and Structured JSON Output. |
| Container  | Docker             | Multi-stage build (Node Build -> Nginx Runtime). |
| Orchestrator | k3d (K3s)        | Local Kubernetes cluster with Traefik Ingress. |

## 4. Project Structure

```
smarttask-ai/
├── k8s/                    <-- Kubernetes Manifests (k3d)
│   ├── deployment.yaml     <-- 2 Replicas, Health Probes
│   ├── service.yaml        <-- ClusterIP
│   └── ingress.yaml        <-- Host: smarttask.local
├── src/
│   ├── components/
│   │   ├── ui/             <-- shadcn primitives (Button, Progress, Card)
│   │   ├── dashboard/      <-- Sidebar, Navbar, ProgressHeader
│   │   └── tasks/          <-- TaskItem, TaskInput, RefinerInput
│   ├── store/              <-- useTodoStore.ts (Zustand Logic)
│   ├── lib/                <-- supabase.ts, ai-client.ts, utils.ts
│   ├── types/              <-- goal.d.ts, task.d.ts
│   └── App.tsx             <-- Main Layout & Provider Setup
├── Dockerfile              <-- Multi-stage build (Alpine-based)
└── vite.config.ts          <-- Vite + PWA Plugin Configuration
```

## 5. Core Components & Logic

### A. Component: ProgressHeader

- **Logic**: Calculates percentage via $$( \frac{completed\_tasks}{total\_tasks} \times 100 )$$.
- **Visual**: Sticky top Progress bar using shadcn (Slate-900 on White background).

### B. Component: TaskItem (Dependency & Time)

- **Logic 1 (Time Estimation)**: Renders a Badge containing the `est_min` value.
- **Logic 2 (Dependency Mapping)**: Task is disabled (locked) if the `depends_on` (Prerequisite ID) is not `is_completed`.
- **Logic 3 (React 19)**: Implements `useOptimistic` for instant checkbox toggling and UI responsiveness.

### C. Component: AIRefiner

- **Logic**: Sends the current task array + user refinement prompt to the AI to retrieve an updated, structured JSON list.

## 6. Database Schema (Supabase SQL)

```sql
-- Goals: Groups a set of AI-generated tasks
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks: Individual actionable units
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  est_min INTEGER DEFAULT 15,
  depends_on UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Self-reference for dependency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 7. Infrastructure Specs (DevOps Integration)

- **Containerization**: Stage 1 (Build via Node 20-alpine), Stage 2 (Serve via Nginx-alpine on port 80).
- **k3d Ingress**: Maps `smarttask.local` to the Nginx container service.
- **Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` injected via Kubernetes ConfigMap or Secret.
- **PWA**: Configured for offline access with a white theme color (#ffffff).

## 8. Execution Phase (Implementation & Deployment)

### Step 1: Local Development
- Initialize React 19 via Vite and install shadcn/ui.
- Build the Zustand store to handle the "Lock/Unlock" logic for dependencies.

### Step 2: Database & Auth Integration
- Provision Supabase and run the SQL schema (Section 6).
- Link the React frontend to Supabase using the supabase-js client.

### Step 3: Containerization (Docker)
- Execute the multi-stage Dockerfile. Ensure the React build folder is mapped to `/usr/share/nginx/html`.
- Test the local image: `docker run -p 8080:80 [image_name]`.

### Step 4: k3d Orchestration
- Create cluster: `k3d cluster create smarttask -p "80:80@loadbalancer"`.
- Apply K8s manifests: `kubectl apply -f k8s/`.
- Validate Ingress via `smarttask.local`.

## 9. Technical Consistency Checks

- **API Contract**: AI must strictly return a JSON array: `[{ id, title, est_min, dep_id }]`.
- **State Logic**: Zustand must handle the unlocking of child tasks once a parent task is completed.
- **Monitoring**: Liveness and Readiness probes must be active on port 80 for k3d health checks.