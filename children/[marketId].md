# 📂 [marketId]
**Generated:** 2026-01-28 15:13:20
**Files:** 1

---

F043│page.tsx│205│⚛
D: ●axios,jwt-decode,next,react,socket.io-client
F: MarketDetailPage({ params })│fetchMarketDetails(token)│handlePlaceTrade(e)
F: MarketDetailPage({ params })
   ↳Calls: F043:fetchMarketDetails
F: fetchMarketDetails(token)
   ↳Called by: F043:MarketDetailPage,F043:handlePlaceTrade
   ↳Impact: 🟡MEDIUM (2 dependents) | Breaks: [F043:MarketDetailPage],[F043:handlePlaceTrade]
F: handlePlaceTrade(e)
   ↳Calls: F043:fetchMarketDetails
---
