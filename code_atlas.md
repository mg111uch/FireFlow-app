# 🗺️ CODEBASE ATLAS
**Generated:** 2026-01-28 15:13:20

**Quick Navigation:** This is Layer 1 (overview). For details, see children/ folder.

---

Legend: │=sep ►=internal ●=external ⚡=entry 🔴=HIGH 🟡=MED 🟢=LOW ⚪=SAFE

## Codebase size
Total files processed: 91
Total lines of code: 10927
Total tokens: 104595
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
│   │   ├── [] auth.js [40 LOC, 283 tokens]
│   │   └── [] upload.js [36 LOC, 236 tokens]
│   ├── routes/
│   │   ├── posts/
│   │   │   ├── [] saves.router.js [53 LOC, 567 tokens]
│   │   │   ├── [] views.router.js [27 LOC, 266 tokens]
│   │   │   ├── [] votes.router.js [138 LOC, 1421 tokens]
│   │   │   ├── [] posts.router.js [240 LOC, 2235 tokens]
│   │   │   └── [] comments.router.js [226 LOC, 2367 tokens]
│   │   ├── [] notifications.js [67 LOC, 504 tokens]
│   │   ├── [] forms.js [576 LOC, 4687 tokens]
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
│   │   ├── [] forms.test.js [212 LOC, 1583 tokens]
│   │   ├── [] communities.test.js [97 LOC, 788 tokens]
│   │   ├── [] posts.test.js [236 LOC, 1735 tokens]
│   │   ├── [] comments.test.js [93 LOC, 745 tokens]
│   │   └── [] forms-service.test.js [252 LOC, 1930 tokens]
│   ├── [] package.json [28 LOC, 226 tokens]
│   ├── [] app.js [47 LOC, 301 tokens]
│   ├── [] database.js [314 LOC, 2350 tokens]
│   ├── [] server.js [105 LOC, 805 tokens]
│   └── [] reddit_clone.db [0 LOC, 0 tokens]
├── tests/
│   └── [] send_msg.md [34 LOC, 176 tokens]
├── frontend/
│   ├── app/
│   │   ├── saved-posts/
│   │   │   └── [] page.tsx [88 LOC, 700 tokens]
│   │   ├── edit-community/
│   │   │   └── [communityId]/
│   │   │       └── [] page.tsx [161 LOC, 1172 tokens]
│   │   ├── communities/
│   │   │   ├── [communityId]/
│   │   │   │   └── [] page.tsx [92 LOC, 796 tokens]
│   │   │   └── [] page.tsx [53 LOC, 338 tokens]
│   │   ├── options/
│   │   │   └── [] page.tsx [63 LOC, 705 tokens]
│   │   ├── search/
│   │   │   └── [] page.tsx [75 LOC, 550 tokens]
│   │   ├── services/
│   │   │   ├── forms/
│   │   │   │   └── [formId]/
│   │   │   │       ├── fill/
│   │   │   │       │   └── [] page.tsx [228 LOC, 1802 tokens]
│   │   │   │       └── responses/
│   │   │   │           └── [] page.tsx [91 LOC, 707 tokens]
│   │   │   ├── [serviceName]/
│   │   │   │   ├── [subserviceName]/
│   │   │   │   │   └── [] page.tsx [146 LOC, 1114 tokens]
│   │   │   │   └── [] page.tsx [64 LOC, 514 tokens]
│   │   │   ├── [] ResponsesCard.tsx [72 LOC, 622 tokens]
│   │   │   └── [] page.tsx [29 LOC, 231 tokens]
│   │   ├── posts/
│   │   │   ├── [id]/
│   │   │   │   └── [] page.tsx [300 LOC, 2598 tokens]
│   │   │   └── [] CommentCard.tsx [200 LOC, 1791 tokens]
│   │   ├── markets/
│   │   │   └── [marketId]/
│   │   │       └── [] page.tsx [231 LOC, 1980 tokens]
│   │   ├── create-post/
│   │   │   ├── [] ServiceSelector.tsx [138 LOC, 1038 tokens]
│   │   │   ├── [] CreateMarketForm.tsx [149 LOC, 1104 tokens]
│   │   │   ├── [] CreateServicePage.tsx [341 LOC, 2317 tokens]
│   │   │   ├── [] QuestionEditor.tsx [174 LOC, 1419 tokens]
│   │   │   ├── [] FormPreview.tsx [82 LOC, 639 tokens]
│   │   │   └── [] page.tsx [204 LOC, 1475 tokens]
│   │   ├── notifications/
│   │   │   └── [] page.tsx [110 LOC, 939 tokens]
│   │   ├── auth/
│   │   │   ├── forgot-password/
│   │   │   │   └── [] page.tsx [59 LOC, 512 tokens]
│   │   │   ├── login/
│   │   │   │   └── [] page.tsx [84 LOC, 694 tokens]
│   │   │   ├── reset-password/
│   │   │   │   └── [] page.tsx [84 LOC, 639 tokens]
│   │   │   └── register/
│   │   │       └── [] page.tsx [97 LOC, 779 tokens]
│   │   ├── chats/
│   │   │   ├── [userId]/
│   │   │   │   └── [] page.tsx [398 LOC, 4547 tokens]
│   │   │   └── [] page.tsx [141 LOC, 1045 tokens]
│   │   ├── profile/
│   │   │   ├── [userId]/
│   │   │   │   ├── followers/
│   │   │   │   │   └── [] page.tsx [122 LOC, 854 tokens]
│   │   │   │   └── [] page.tsx [178 LOC, 1423 tokens]
│   │   │   ├── [] CommunitiesList.tsx [251 LOC, 1867 tokens]
│   │   │   ├── [] ProfileHeader.tsx [94 LOC, 731 tokens]
│   │   │   └── [] page.tsx [182 LOC, 1513 tokens]
│   │   ├── [] 3d-rocket.png [0 LOC, 0 tokens]
│   │   ├── [] globals.css [26 LOC, 144 tokens]
│   │   ├── [] layout.tsx [50 LOC, 327 tokens]
│   │   └── [] page.tsx [347 LOC, 2936 tokens]
│   ├── components/
│   │   ├── ui/
│   │   │   ├── [] OptionsDrawer.tsx [128 LOC, 805 tokens]
│   │   │   ├── [] Snackbar.tsx [31 LOC, 195 tokens]
│   │   │   ├── [] Tabs.tsx [44 LOC, 255 tokens]
│   │   │   ├── [] alert-dialog.tsx [136 LOC, 718 tokens]
│   │   │   └── [] button.tsx [40 LOC, 354 tokens]
│   │   ├── [] FormCard.tsx [85 LOC, 615 tokens]
│   │   ├── [] TopAppBar.tsx [68 LOC, 612 tokens]
│   │   ├── [] PostCard.tsx [375 LOC, 2824 tokens]
│   │   ├── [] MarketCard.tsx [75 LOC, 594 tokens]
│   │   ├── [] BottomAppBar.tsx [61 LOC, 572 tokens]
│   │   └── [] PaymentModal.tsx [220 LOC, 1528 tokens]
│   ├── context/
│   │   ├── [] NotificationContext.tsx [107 LOC, 746 tokens]
│   │   ├── [] SocketContext.tsx [65 LOC, 472 tokens]
│   │   ├── [] AuthContext.tsx [107 LOC, 697 tokens]
│   │   └── [] PostContext.tsx [132 LOC, 996 tokens]
│   ├── tests/
│   │   ├── [] payment-modal.test.tsx [204 LOC, 1167 tokens]
│   │   └── [] payment-flow.spec.ts [205 LOC, 1717 tokens]
│   ├── types/
│   │   └── [] google-pay-button.d.ts [36 LOC, 240 tokens]
│   ├── lib/
│   │   ├── [] utils.ts [64 LOC, 559 tokens]
│   │   ├── [] types.ts [159 LOC, 923 tokens]
│   │   ├── [] icons.tsx [190 LOC, 6397 tokens]
│   │   ├── [] constants.ts [1 LOC, 9 tokens]
│   │   └── [] services-data.ts [216 LOC, 2272 tokens]
│   └── [] package.json [41 LOC, 389 tokens]
├── [] package.json [8 LOC, 52 tokens]
├── [] cxt_switch.md [29 LOC, 372 tokens]
├── [] Fixes.md [0 LOC, 0 tokens]
├── [] agent_harness.md [44 LOC, 572 tokens]
├── [] code_atlas.md [176 LOC, 2610 tokens]
├── [] code_dump.txt [0 LOC, 0 tokens]
├── [] Issues.md [0 LOC, 0 tokens]
└── [] project_tools.md [28 LOC, 1045 tokens]
### End Tree
