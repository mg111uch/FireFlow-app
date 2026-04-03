# 🗺️ CODEBASE ATLAS
**Generated:** 2026-01-28 15:13:20

**Quick Navigation:** This is Layer 1 (overview). For details, see children/ folder.

---

Legend: │=sep ►=internal ●=external ⚡=entry 🔴=HIGH 🟡=MED 🟢=LOW ⚪=SAFE

## Codebase size
Total files processed: 145
Total lines of code: 16418
Total tokens: 152870
## End Codebase size

Entries: F005

HighRisk: F059:formatLargeNumber🔴,F060:formatLargeNumber🔴,F063:useSocket🔴,F064:useAuth🔴

## Directory Structure 
- **Project path:** `/home/manigupt/Hello/React/reddit-clone`
### FILE_MAP Tree
├── backend/
│   ├── database/
│   │   ├── schema/
│   │   │   ├── [] payments.js [36 LOC, 228 tokens]
│   │   │   ├── [] forms.js [75 LOC, 465 tokens]
│   │   │   ├── [] users.js [41 LOC, 282 tokens]
│   │   │   ├── [] gigs.js [31 LOC, 218 tokens]
│   │   │   ├── [] auth.js [30 LOC, 169 tokens]
│   │   │   ├── [] markets.js [45 LOC, 286 tokens]
│   │   │   ├── [] marketplace.js [53 LOC, 309 tokens]
│   │   │   ├── [] social.js [165 LOC, 1055 tokens]
│   │   │   └── [] messaging.js [35 LOC, 235 tokens]
│   │   ├── [] index.js [106 LOC, 599 tokens]
│   │   └── [] reddit_clone.db [0 LOC, 0 tokens]
│   ├── utils/
│   │   ├── [] socketHandlers.js [225 LOC, 2145 tokens]
│   │   ├── [] notificationHelper.js [46 LOC, 443 tokens]
│   │   └── [] postQueries.js [18 LOC, 271 tokens]
│   ├── middleware/
│   │   ├── [] agentAuth.js [80 LOC, 525 tokens]
│   │   ├── [] auth.js [40 LOC, 283 tokens]
│   │   └── [] upload.js [36 LOC, 236 tokens]
│   ├── routes/
│   │   ├── posts/
│   │   │   ├── [] saves.router.js [53 LOC, 567 tokens]
│   │   │   ├── [] views.router.js [27 LOC, 266 tokens]
│   │   │   ├── [] votes.router.js [152 LOC, 1533 tokens]
│   │   │   ├── [] posts.router.js [257 LOC, 2380 tokens]
│   │   │   └── [] comments.router.js [226 LOC, 2367 tokens]
│   │   ├── [] shop-orders.js [191 LOC, 1595 tokens]
│   │   ├── [] notifications.js [67 LOC, 504 tokens]
│   │   ├── [] payments.js [207 LOC, 1637 tokens]
│   │   ├── [] shop-products.js [154 LOC, 1225 tokens]
│   │   ├── [] shops.js [166 LOC, 1137 tokens]
│   │   ├── [] forms.js [580 LOC, 4769 tokens]
│   │   ├── [] agent.js [124 LOC, 924 tokens]
│   │   ├── [] users.js [260 LOC, 2089 tokens]
│   │   ├── [] gigs.js [411 LOC, 3288 tokens]
│   │   ├── [] auth.js [110 LOC, 1038 tokens]
│   │   ├── [] markets.js [150 LOC, 1367 tokens]
│   │   ├── [] flowpay.js [154 LOC, 1131 tokens]
│   │   ├── [] chats.js [180 LOC, 1560 tokens]
│   │   ├── [] posts.js [22 LOC, 158 tokens]
│   │   └── [] communities.js [205 LOC, 1708 tokens]
│   ├── [] jest.config.js [12 LOC, 76 tokens]
│   ├── [] package.json [29 LOC, 239 tokens]
│   ├── [] app.js [61 LOC, 449 tokens]
│   └── [] server.js [113 LOC, 933 tokens]
├── agentic_ui/
│   ├── [] parse_action.js [233 LOC, 1620 tokens]
│   ├── [] agent.js [287 LOC, 2161 tokens]
│   ├── [] generate_feed.js [182 LOC, 1443 tokens]
│   ├── [] feed.md [57 LOC, 655 tokens]
│   ├── [] agent_skill.md [411 LOC, 3226 tokens]
│   └── [] send_msg.md [34 LOC, 176 tokens]
├── frontend/
│   ├── app/
│   │   ├── communities/
│   │   │   ├── edit-community/
│   │   │   │   └── [communityId]/
│   │   │   │       └── [] page.tsx [160 LOC, 1171 tokens]
│   │   │   ├── [communityId]/
│   │   │   │   └── [] page.tsx [91 LOC, 795 tokens]
│   │   │   └── [] page.tsx [49 LOC, 312 tokens]
│   │   ├── options/
│   │   │   ├── saved-posts/
│   │   │   │   └── [] page.tsx [86 LOC, 699 tokens]
│   │   │   ├── userdetails/
│   │   │   │   └── [] page.tsx [337 LOC, 2441 tokens]
│   │   │   ├── generative-ui/
│   │   │   │   ├── [] examplePrompts.ts [171 LOC, 1347 tokens]
│   │   │   │   ├── [] utils.ts [109 LOC, 1035 tokens]
│   │   │   │   ├── [] ComponentEditor.tsx [119 LOC, 972 tokens]
│   │   │   │   ├── [] ElementRenderer.tsx [82 LOC, 665 tokens]
│   │   │   │   └── [] page.tsx [197 LOC, 1582 tokens]
│   │   │   ├── premium/
│   │   │   │   └── [] page.tsx [118 LOC, 837 tokens]
│   │   │   ├── notifications/
│   │   │   │   └── [] page.tsx [110 LOC, 939 tokens]
│   │   │   └── [] page.tsx [61 LOC, 694 tokens]
│   │   ├── search/
│   │   │   └── [] page.tsx [73 LOC, 531 tokens]
│   │   ├── services/
│   │   │   ├── forms/
│   │   │   │   └── [formId]/
│   │   │   │       ├── fill/
│   │   │   │       │   └── [] page.tsx [198 LOC, 1606 tokens]
│   │   │   │       └── responses/
│   │   │   │           └── [] page.tsx [90 LOC, 706 tokens]
│   │   │   ├── [serviceName]/
│   │   │   │   ├── [subserviceName]/
│   │   │   │   │   └── [] page.tsx [145 LOC, 1113 tokens]
│   │   │   │   └── [] page.tsx [124 LOC, 966 tokens]
│   │   │   ├── [] ResponsesCard.tsx [72 LOC, 622 tokens]
│   │   │   ├── [] ShortcutSettings.tsx [204 LOC, 1587 tokens]
│   │   │   ├── [] ShortcutsContext.tsx [128 LOC, 872 tokens]
│   │   │   ├── [] ShortcutBar.tsx [49 LOC, 355 tokens]
│   │   │   ├── [] useShortcuts.ts [49 LOC, 309 tokens]
│   │   │   └── [] page.tsx [39 LOC, 320 tokens]
│   │   ├── posts/
│   │   │   ├── [id]/
│   │   │   │   └── [] page.tsx [299 LOC, 2597 tokens]
│   │   │   └── [] CommentCard.tsx [199 LOC, 1790 tokens]
│   │   ├── shop/
│   │   │   ├── [userId]/
│   │   │   │   └── [] page.tsx [90 LOC, 864 tokens]
│   │   │   ├── [] ShowCart.tsx [164 LOC, 1342 tokens]
│   │   │   ├── [] ProductsTab.tsx [81 LOC, 1020 tokens]
│   │   │   ├── [] CreateShopForm.tsx [27 LOC, 309 tokens]
│   │   │   ├── [] ProductCard.tsx [55 LOC, 495 tokens]
│   │   │   ├── [] ShopHeaderCard.tsx [22 LOC, 154 tokens]
│   │   │   ├── [] useShop.ts [165 LOC, 1156 tokens]
│   │   │   ├── [] Dashboard.tsx [44 LOC, 394 tokens]
│   │   │   ├── [] OrdersTab.tsx [91 LOC, 878 tokens]
│   │   │   └── [] page.tsx [130 LOC, 1012 tokens]
│   │   ├── payment/
│   │   │   └── callback/
│   │   │       ├── verify/
│   │   │       │   └── [] route.ts [24 LOC, 215 tokens]
│   │   │       ├── [] CallbackInner.tsx [127 LOC, 1138 tokens]
│   │   │       └── [] page.tsx [16 LOC, 92 tokens]
│   │   ├── markets/
│   │   │   └── [marketId]/
│   │   │       └── [] page.tsx [230 LOC, 1977 tokens]
│   │   ├── create-post/
│   │   │   ├── [] ServiceSelector.tsx [141 LOC, 1066 tokens]
│   │   │   ├── [] CreateMarketForm.tsx [148 LOC, 1103 tokens]
│   │   │   ├── [] CreateServicePage.tsx [354 LOC, 2429 tokens]
│   │   │   ├── [] QuestionEditor.tsx [174 LOC, 1419 tokens]
│   │   │   ├── [] FormPreview.tsx [82 LOC, 639 tokens]
│   │   │   └── [] page.tsx [203 LOC, 1474 tokens]
│   │   ├── auth/
│   │   │   ├── forgot-password/
│   │   │   │   └── [] page.tsx [58 LOC, 511 tokens]
│   │   │   ├── login/
│   │   │   │   └── [] page.tsx [84 LOC, 694 tokens]
│   │   │   ├── reset-password/
│   │   │   │   └── [] page.tsx [83 LOC, 638 tokens]
│   │   │   └── register/
│   │   │       └── [] page.tsx [96 LOC, 778 tokens]
│   │   ├── gigs/
│   │   │   ├── [] calculatePrice.ts [88 LOC, 581 tokens]
│   │   │   ├── [] useGigs.ts [250 LOC, 1974 tokens]
│   │   │   ├── [] MapView.tsx [71 LOC, 703 tokens]
│   │   │   ├── [] LocationPickerModal.tsx [159 LOC, 1277 tokens]
│   │   │   ├── [] GigCard.tsx [193 LOC, 1798 tokens]
│   │   │   ├── [] types.ts [34 LOC, 212 tokens]
│   │   │   ├── [] GigForm.tsx [457 LOC, 4069 tokens]
│   │   │   ├── [] Addons.md [27 LOC, 272 tokens]
│   │   │   ├── [] page.tsx [379 LOC, 3157 tokens]
│   │   │   └── [] InteractiveMap.tsx [76 LOC, 499 tokens]
│   │   ├── chats/
│   │   │   ├── [userId]/
│   │   │   │   └── [] page.tsx [432 LOC, 4078 tokens]
│   │   │   └── [] page.tsx [140 LOC, 1042 tokens]
│   │   ├── profile/
│   │   │   ├── [userId]/
│   │   │   │   ├── followers/
│   │   │   │   │   └── [] page.tsx [121 LOC, 853 tokens]
│   │   │   │   └── [] page.tsx [177 LOC, 1422 tokens]
│   │   │   ├── [] CommunitiesList.tsx [250 LOC, 1866 tokens]
│   │   │   ├── [] ProfileHeader.tsx [120 LOC, 954 tokens]
│   │   │   └── [] page.tsx [181 LOC, 1512 tokens]
│   │   ├── [] 3d-rocket.png [0 LOC, 0 tokens]
│   │   ├── [] globals.css [26 LOC, 144 tokens]
│   │   ├── [] layout.tsx [53 LOC, 349 tokens]
│   │   └── [] page.tsx [346 LOC, 2940 tokens]
│   ├── components/
│   │   ├── ui/
│   │   │   ├── [] OptionsDrawer.tsx [128 LOC, 805 tokens]
│   │   │   ├── [] Snackbar.tsx [31 LOC, 195 tokens]
│   │   │   └── [] Tabs.tsx [45 LOC, 260 tokens]
│   │   ├── [] FormCard.tsx [85 LOC, 613 tokens]
│   │   ├── [] TopAppBar.tsx [68 LOC, 612 tokens]
│   │   ├── [] PostCard.tsx [374 LOC, 2823 tokens]
│   │   ├── [] MarketCard.tsx [75 LOC, 594 tokens]
│   │   ├── [] FlowpayModal.tsx [230 LOC, 1783 tokens]
│   │   └── [] BottomAppBar.tsx [61 LOC, 572 tokens]
│   ├── hooks/
│   │   ├── [] useGemini.ts [77 LOC, 502 tokens]
│   │   └── [] useRazorpayPayment.ts [177 LOC, 1277 tokens]
│   ├── context/
│   │   ├── [] NotificationContext.tsx [106 LOC, 745 tokens]
│   │   ├── [] CartContext.tsx [78 LOC, 540 tokens]
│   │   ├── [] SocketContext.tsx [64 LOC, 469 tokens]
│   │   ├── [] AuthContext.tsx [110 LOC, 756 tokens]
│   │   └── [] PostContext.tsx [131 LOC, 995 tokens]
│   ├── cypress/
│   │   ├── support/
│   │   │   ├── [] commands.ts [29 LOC, 192 tokens]
│   │   │   └── [] e2e.ts [33 LOC, 194 tokens]
│   │   └── e2e/
│   │       └── [] payment-flow.cy.ts [259 LOC, 2307 tokens]
│   ├── lib/
│   │   ├── [] utils.ts [64 LOC, 559 tokens]
│   │   ├── [] api.ts [61 LOC, 691 tokens]
│   │   ├── [] types.ts [205 LOC, 1151 tokens]
│   │   ├── [] icons.tsx [200 LOC, 6490 tokens]
│   │   ├── [] config.ts [7 LOC, 54 tokens]
│   │   └── [] services-data.ts [216 LOC, 2272 tokens]
│   ├── [] package.json [50 LOC, 493 tokens]
│   ├── [] next.config.js [5 LOC, 32 tokens]
│   ├── [] tsconfig.json [27 LOC, 183 tokens]
│   ├── [] jest.config.ts [20 LOC, 144 tokens]
│   ├── [] cypress.config.ts [27 LOC, 169 tokens]
│   ├── [] manifest.json [21 LOC, 136 tokens]
│   ├── [] jest.setup.ts [7 LOC, 60 tokens]
│   ├── [] eslint.config.mjs [16 LOC, 95 tokens]
│   ├── [] README.md [36 LOC, 357 tokens]
│   └── [] playwright.config.ts [45 LOC, 291 tokens]
├── [] package.json [8 LOC, 52 tokens]
├── [] cxt_switch.md [29 LOC, 372 tokens]
├── [] agent_harness.md [54 LOC, 586 tokens]
├── [] code_atlas.md [239 LOC, 3731 tokens]
├── [] code_dump.txt [0 LOC, 0 tokens]
├── [] README.md [193 LOC, 1379 tokens]
├── [] project_tools.md [30 LOC, 1044 tokens]
└── [] Issues and Fixes.md [38 LOC, 375 tokens]
### End Tree
