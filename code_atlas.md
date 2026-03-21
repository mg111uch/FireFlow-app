# 🗺️ CODEBASE ATLAS
**Generated:** 2026-01-28 15:13:20

**Quick Navigation:** This is Layer 1 (overview). For details, see children/ folder.

---

Legend: │=sep ►=internal ●=external ⚡=entry 🔴=HIGH 🟡=MED 🟢=LOW ⚪=SAFE

## Codebase size
Total files processed: 109
Total lines of code: 12713
Total tokens: 121225
## End Codebase size

Entries: F005

HighRisk: F059:formatLargeNumber🔴,F060:formatLargeNumber🔴,F063:useSocket🔴,F064:useAuth🔴

## Directory Structure 
- **Project path:** `/home/manigupt/Hello/React/reddit-clone`
### FILE_MAP Tree
├── backend/
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
│   │   ├── [] notifications.js [67 LOC, 504 tokens]
│   │   ├── [] payments.js [149 LOC, 1155 tokens]
│   │   ├── [] forms.js [580 LOC, 4769 tokens]
│   │   ├── [] agent.js [124 LOC, 924 tokens]
│   │   ├── [] users.js [204 LOC, 1563 tokens]
│   │   ├── [] auth.js [110 LOC, 1038 tokens]
│   │   ├── [] markets.js [150 LOC, 1367 tokens]
│   │   ├── [] chats.js [180 LOC, 1560 tokens]
│   │   ├── [] posts.js [22 LOC, 158 tokens]
│   │   └── [] communities.js [205 LOC, 1708 tokens]
│   ├── tests/
│   │   ├── [] auth.test.js [99 LOC, 650 tokens]
│   │   ├── [] users.test.js [125 LOC, 1002 tokens]
│   │   ├── [] markets.test.js [105 LOC, 838 tokens]
│   │   ├── [] chats.test.js [81 LOC, 697 tokens]
│   │   ├── [] payments.test.js [306 LOC, 2516 tokens]
│   │   ├── [] forms.test.js [212 LOC, 1583 tokens]
│   │   ├── [] communities.test.js [97 LOC, 788 tokens]
│   │   ├── [] posts.test.js [236 LOC, 1735 tokens]
│   │   ├── [] comments.test.js [93 LOC, 745 tokens]
│   │   └── [] forms-service.test.js [252 LOC, 1930 tokens]
│   ├── [] jest.config.js [12 LOC, 76 tokens]
│   ├── [] package.json [29 LOC, 239 tokens]
│   ├── [] app.js [61 LOC, 449 tokens]
│   ├── [] database.js [362 LOC, 2826 tokens]
│   ├── [] server.js [108 LOC, 858 tokens]
│   └── [] reddit_clone.db [0 LOC, 0 tokens]
├── agentic_ui/
│   ├── [] parse_action.js [233 LOC, 1620 tokens]
│   ├── [] agent.js [287 LOC, 2161 tokens]
│   ├── [] generate_feed.js [182 LOC, 1443 tokens]
│   ├── [] feed.md [57 LOC, 655 tokens]
│   ├── [] agent_skill.md [411 LOC, 3226 tokens]
│   └── [] send_msg.md [34 LOC, 176 tokens]
├── frontend/
│   ├── __tests__/
│   │   ├── [] PaymentCallbackPage.test.tsx [277 LOC, 2008 tokens]
│   │   └── [] useRazorpayPayment.test.ts [348 LOC, 2835 tokens]
│   ├── app/
│   │   ├── saved-posts/
│   │   │   └── [] page.tsx [87 LOC, 699 tokens]
│   │   ├── edit-community/
│   │   │   └── [communityId]/
│   │   │       └── [] page.tsx [160 LOC, 1171 tokens]
│   │   ├── communities/
│   │   │   ├── [communityId]/
│   │   │   │   └── [] page.tsx [91 LOC, 795 tokens]
│   │   │   └── [] page.tsx [49 LOC, 312 tokens]
│   │   ├── options/
│   │   │   └── [] page.tsx [63 LOC, 705 tokens]
│   │   ├── search/
│   │   │   └── [] page.tsx [74 LOC, 549 tokens]
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
│   │   │   │   └── [] page.tsx [133 LOC, 1064 tokens]
│   │   │   ├── [] ResponsesCard.tsx [72 LOC, 622 tokens]
│   │   │   └── [] page.tsx [27 LOC, 236 tokens]
│   │   ├── posts/
│   │   │   ├── [id]/
│   │   │   │   └── [] page.tsx [299 LOC, 2597 tokens]
│   │   │   └── [] CommentCard.tsx [199 LOC, 1790 tokens]
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
│   │   │   ├── [] CreateServicePage.tsx [360 LOC, 2476 tokens]
│   │   │   ├── [] QuestionEditor.tsx [174 LOC, 1419 tokens]
│   │   │   ├── [] FormPreview.tsx [82 LOC, 639 tokens]
│   │   │   └── [] page.tsx [203 LOC, 1474 tokens]
│   │   ├── notifications/
│   │   │   └── [] page.tsx [110 LOC, 939 tokens]
│   │   ├── auth/
│   │   │   ├── forgot-password/
│   │   │   │   └── [] page.tsx [58 LOC, 511 tokens]
│   │   │   ├── login/
│   │   │   │   └── [] page.tsx [84 LOC, 694 tokens]
│   │   │   ├── reset-password/
│   │   │   │   └── [] page.tsx [83 LOC, 638 tokens]
│   │   │   └── register/
│   │   │       └── [] page.tsx [96 LOC, 778 tokens]
│   │   ├── chats/
│   │   │   ├── [userId]/
│   │   │   │   └── [] page.tsx [384 LOC, 3512 tokens]
│   │   │   └── [] page.tsx [140 LOC, 1042 tokens]
│   │   ├── profile/
│   │   │   ├── [userId]/
│   │   │   │   ├── followers/
│   │   │   │   │   └── [] page.tsx [121 LOC, 853 tokens]
│   │   │   │   └── [] page.tsx [177 LOC, 1422 tokens]
│   │   │   ├── [] CommunitiesList.tsx [250 LOC, 1866 tokens]
│   │   │   ├── [] ProfileHeader.tsx [93 LOC, 730 tokens]
│   │   │   └── [] page.tsx [181 LOC, 1512 tokens]
│   │   ├── [] 3d-rocket.png [0 LOC, 0 tokens]
│   │   ├── [] globals.css [26 LOC, 144 tokens]
│   │   ├── [] layout.tsx [50 LOC, 327 tokens]
│   │   └── [] page.tsx [346 LOC, 2940 tokens]
│   ├── components/
│   │   ├── ui/
│   │   │   ├── [] OptionsDrawer.tsx [128 LOC, 805 tokens]
│   │   │   ├── [] Snackbar.tsx [31 LOC, 195 tokens]
│   │   │   └── [] Tabs.tsx [44 LOC, 255 tokens]
│   │   ├── [] FormCard.tsx [85 LOC, 613 tokens]
│   │   ├── [] TopAppBar.tsx [68 LOC, 612 tokens]
│   │   ├── [] PostCard.tsx [374 LOC, 2823 tokens]
│   │   ├── [] MarketCard.tsx [75 LOC, 594 tokens]
│   │   └── [] BottomAppBar.tsx [61 LOC, 572 tokens]
│   ├── hooks/
│   │   └── [] useRazorpayPayment.ts [177 LOC, 1277 tokens]
│   ├── context/
│   │   ├── [] NotificationContext.tsx [106 LOC, 745 tokens]
│   │   ├── [] SocketContext.tsx [64 LOC, 469 tokens]
│   │   ├── [] AuthContext.tsx [106 LOC, 696 tokens]
│   │   └── [] PostContext.tsx [131 LOC, 995 tokens]
│   ├── cypress/
│   │   ├── support/
│   │   │   ├── [] commands.ts [29 LOC, 192 tokens]
│   │   │   └── [] e2e.ts [33 LOC, 194 tokens]
│   │   └── e2e/
│   │       └── [] payment-flow.cy.ts [259 LOC, 2307 tokens]
│   ├── lib/
│   │   ├── [] utils.ts [64 LOC, 559 tokens]
│   │   ├── [] types.ts [159 LOC, 924 tokens]
│   │   ├── [] icons.tsx [200 LOC, 6490 tokens]
│   │   ├── [] config.ts [5 LOC, 37 tokens]
│   │   └── [] services-data.ts [216 LOC, 2272 tokens]
│   ├── [] package.json [46 LOC, 443 tokens]
│   ├── [] next.config.js [5 LOC, 32 tokens]
│   ├── [] .env.local [7 LOC, 69 tokens]
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
├── [] agent_harness.md [48 LOC, 548 tokens]
├── [] code_atlas.md [206 LOC, 3093 tokens]
├── [] code_dump.txt [0 LOC, 0 tokens]
├── [] README.md [160 LOC, 840 tokens]
├── [] project_tools.md [30 LOC, 1038 tokens]
└── [] Issues and Fixes.md [38 LOC, 375 tokens]
### End Tree
