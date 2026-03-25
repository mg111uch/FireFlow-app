# FireFlow App - Development Guide

## Prerequisites

- Node.js (v18+)
- npm or yarn
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

## Features Todo:

- Websocket connection keep disconnecting and connecting. Not stable.
- Self hosting in raspberry pipeline   
- Google Maps not integrated,
- Fill form option doesnot show for user own forms, only view responses.
- Add @username modal which lists users to mention in create post.
- Quick post button.
- 1-Click on reaction to remove.
- Media Sharing: Enable sending and receiving photos and videos within chats.
- Voice Messages: Allow users to record and  send short audio messages.
- Ephemeral Messages: Introduce an option for messages to disappear after a certain time or after being viewed.
- Group Chats: Extend the functionality to support multiple participants in a single chat.
- Add emoji picker in create post.
- Post and comments editing
- Guidelines and Ads on homepage as posts.
- Live talking spaces.
- Upi added, transfer credits as money quickly for retention.
- Offer 10 credits for every new user added, posts cost credits.  
- Paid comments, load pinned comment with post, country flag, location.   
- Buy and sell followers. Paid subscriber page.
- Select theme and city options
- Locked communities, One free community, one post per day in free.
- Vote Updates: The handleVoteUpdate function re-fetches a post's full vote count after every vote.  For a more efficient approach, you could use an UPDATE query to increment or decrement the vote count directly in a posts table column, rather than performing a SUM on the votes table for every update.  
- 

- Stories — Temporary 24h text/pic stories (view counts, replies). Easy add via existing PostCard logic

- Explore/Discover Tab — Algorithmic "For You" feed mixing trending/general posts + interest-based

- Bookmarks Collection — Organized saved posts (expand current saved).

- Moderation & Safety — Report/block/mute users/posts, content filters (text/pic moderation via simple AI or rules).

- Analytics Dashboard — For users: post insights (reach, engagement); for premium: service performance.

- Profile Polish — Bio links, pinned posts, header image, edit profile with pic upload.

- Additional Revenue Streams (low effort): 

    Subscription for premium communities or ad-free experience.
    In-app tips/boosts for posts (pay to promote visibility).
    Marketplace commissions on service form submissions.
    Creator tools: Sell access to custom generative-UI templates.

- Explore tab with simple ML (or rule-based) recommendations using likes/views.

- Virality & Retention: Notifications for mentions/reposts. Algorithm tweaks favoring comments/saves over raw likes.

- Tech Next Steps:Image upload/optimization (compress pics, CDN if scales).
Rate limiting & spam prevention.
Offline support (basic caching).
Dark mode + accessibility.

- Growth Ideas: Invite system, referral rewards (free premium credits). Community challenges with voting.





