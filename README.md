# FireFlow App - Development Guide

## Prerequisites

- Next.js 15.3.3
- Node.js (v18+) and npm 
- SQLite database (included)

## Running the Application

### Option 1: Run Both (Recommended)

```bash
cd project-dir
npm run app
```

This starts both backend (port 3001) and frontend (port 3000).

### Option 2: Run Separately

#### Backend Only

```bash
cd project-dir/backend
npm start
```

- API runs at: http://localhost:5000

#### Frontend Only

```bash
cd project-dir/frontend
npm run dev
```

- App runs at: http://localhost:3000

---

## Testing

### Backend Tests (Jest)

```bash
# Run all backend tests
cd project-dir/backend
npm test

# Run specific test file
npm test -- forms.test.js

# Run specific test
npm test -- forms.test.js -t "should submit form successfully"
```

### Frontend Tests

#### Unit Tests (Jest)

```bash
cd project-dir/frontend
npm test

# Watch mode
npm run test:watch

# Run specific test file
npm test -- payment-modal.test.tsx
```

#### E2E Tests (Playwright)

```bash
cd project-dir/frontend

# Install browsers (first time only)
npx playwright install chromium

# Run E2E tests
npm run test:e2e

# To run only this specific test file
npm run test:e2e -- payment-flow.spec.ts

# Run E2E tests with UI
npm run test:e2e:ui

# Note: E2E tests require the app to be running.

# Cypress E2E test in watch mode
npm run test:cypress:open
```

---

## Features & App Pages 

- **Auth** Login, Register, forgot-password, reset-password.

- **Main** Contains list of general and community posts with like,dislike,save,share,comment,views,options button in each post. A create post button.A filter button for posts. A stats button which shows total users and online users number.

- **Create Posts** General 280 word post, Community post, Form post (General and Service type), Voting post arranged in tabs

- **Chats** Chats list, user chat

- **Communities** Community list and page with community posts, Create,Edit,Delete community

- **Generative-UI** Create custom forms with LLM generated components. Form page arranged in editable grid of 16px resolution so that user can place generated componenets at desired location and edit its properties by clicking on it.

- **Markets** Detailed page for posts shows live voting trends of a particular question and bets (kalshi polymarket type)

- **Notifications** All in app notifications

- **Options** Account settings, saved posts, About app, Logout

- **Payments** Service forms have a cost to make.

- **Posts** Post with comment threads.

- **Profile** Header card with name, email, user pic, followers and following number, total posts. Page has User created communities, posts and forms. Followers page show list of follower and following.

- **Search** Showcase of posts and a search bar to find users.

- **Services** List of all services each with subservices. Subservices has list of posts and form for creating post in that subservice. Services is a premium feature.

- **Global Context** Auth, Notification, Post, Socket

- **Lib** Config, icons, service-data, types, utils

- **Components** BottomAppBar (Home, Chats, Showcase, Services, Profile), FormCard, MarketCard, PostCard, TopAppBar (Notification and Options button)

