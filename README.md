# Reddit Clone - Development Guide

## Prerequisites

- Node.js (v18+)
- npm or yarn
- SQLite database (included)

## Project Structure

```
reddit-clone/
├── backend/           # Express.js API server
│   ├── tests/        # Jest unit tests
│   └── ...
└── frontend/         # Next.js 15 application
    ├── tests/        # Playwright E2E tests
    ├── components/   # React components
    └── ...
```

---

## Running the Application

### Option 1: Run Both (Recommended)

```bash
# From project root
cd /home/manigupt/Hello/React/reddit-clone
npm run app
```

This starts both backend (port 3001) and frontend (port 3000).

### Option 2: Run Separately

#### Backend Only

```bash
cd /home/manigupt/Hello/React/reddit-clone/backend
npm start
```

- API runs at: http://localhost:3001

#### Frontend Only

```bash
cd /home/manigupt/Hello/React/reddit-clone/frontend
npm run dev
```

- App runs at: http://localhost:3000

---

## Testing

### Backend Tests (Jest)

```bash
# Run all backend tests
cd /home/manigupt/Hello/React/reddit-clone/backend
npm test

# Run specific test file
npm test -- forms.test.js

# Run specific test
npm test -- forms.test.js -t "should submit form successfully"
```

### Frontend Tests

#### Unit Tests (Jest)

```bash
cd /home/manigupt/Hello/React/reddit-clone/frontend
npm test

# Watch mode
npm run test:watch

# Run specific test file
npm test -- payment-modal.test.tsx
```

#### E2E Tests (Playwright)

```bash
cd /home/manigupt/Hello/React/reddit-clone/frontend

# Install browsers (first time only)
npx playwright install chromium

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

---

## API Endpoints

### Forms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forms` | Get all forms |
| GET | `/api/forms/:id` | Get form by ID |
| POST | `/api/forms` | Create new form |
| PUT | `/api/forms/:id` | Update form |
| DELETE | `/api/forms/:id` | Delete form |
| POST | `/api/forms/:id/submit` | Submit form (with optional payment) |
| GET | `/api/forms/:id/submissions` | Get form submissions |
| GET | `/api/forms/:id/submissions/public` | Get public submissions |

### Service Forms

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forms/service/:name/:subservice` | Get service form |

---

## Payment Flow

The payment flow is implemented in the form fill page:

1. User fills out the form
2. If form has `price > 0`:
   - Payment modal opens
   - User completes payment (Google Pay or Mock UPI)
   - On success: Form is submitted with payment details
3. If form has `price = 0`:
   - Form is submitted directly

### Testing Payment Flow

**Backend:**
```bash
cd backend && npm test -- forms.test.js
```

**Frontend E2E:**
```bash
cd frontend && npm run test:e2e
```

---

## Environment Variables

### Backend (.env)
```
PORT=3001
DB_PATH=./reddit_clone.db
```

### Frontend (.env.local)
```
NEXT_PUBLIC_URL=http://localhost:3001
```

---

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Database Issues

```bash
# Reset database (deletes all data)
rm backend/reddit_clone.db
# Restart backend - will create new database
```

### Test Failures

```bash
# Clear Jest cache
cd frontend && npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```
