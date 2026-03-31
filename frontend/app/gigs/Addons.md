## Issues & Addon Features for Complete Ride Haile + Delivery Gigs

### Critical Issues to Fix

- **No real-time location tracking** - Drivers can't see pickup/dropoff on map
- **No ride/driver matching** - Manual acceptance only, no nearby driver detection
- **No payment integration** - Users pay full price but drivers get 80% (need wallet/settlement system)

## Must-Have Features

- **Live map integration** - Show pickup/dropoff locations (Google Maps/Mapbox)
- **Real-time driver location** - WebSocket updates for driver position
- **Nearby drivers** - Filter gigs by radius & show to drivers in range
- **Ride tracking** - OTP verification for ride start/complete
- **In-app messaging/chat** - Between rider and driver
- **Driver earnings wallet** - Track 80% payouts, withdrawal system
- **Trip history** - Detailed ride/delivery logs with receipts
- **Rating/review system** - Both drivers and riders rate each other
- **Surge pricing** - Dynamic pricing based on demand

## Nice-to-Have Features

- **Scheduled rides** - Book rides for later
- **Multiple stops** - Add intermediate stops
- **Share ride** - Share trip details with contacts
- **Delivery proof** - Photo capture on delivery completion
- **Vehicle selection** - Show driver vehicle info on ride acceptance
- **Admin dashboard** - Monitor gigs, earnings, disputes
- **Push notifications** - For gig updates, new offers
- **Cancellation reason** - Track why rides are cancelled

## Backend Additions Needed

- **gigs table:** add payout_price, otp, started_at, completed_at, rating, review
- **New table:** driver_locations (lat, lng, updated_at)
- **New table:** wallet_transactions (earnings, withdrawals)
- WebSocket for real-time updates