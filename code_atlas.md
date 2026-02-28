# 🗺️ CODEBASE ATLAS
**Generated:** 2026-01-28 15:13:20

**Quick Navigation:** This is Layer 1 (overview). For details, see children/ folder.

---

Legend: │=sep ►=internal ●=external ⚡=entry 🔴=HIGH 🟡=MED 🟢=LOW ⚪=SAFE

## Codebase size
Total files processed: 64
Total lines of code: 7816
Total tokens: 77630
## End Codebase size

Entries: F005

HighRisk: F059:formatLargeNumber🔴,F060:formatLargeNumber🔴,F063:useSocket🔴,F064:useAuth🔴

Children: backend.md,utils.md,middleware.md,routes.md,tests.md,frontend.md,app.md,saved-posts.md,[communityId].md,communities.md,options.md,search.md,services.md,marriage.md,[id].md,markets.md,create.md,[marketId].md,forms.md,fill.md,responses.md,create-post.md,notifications.md,forgot-password.md,login.md,reset-password.md,register.md,chats.md,[userId].md,profile.md,components.md,context.md,lib.md

## Directory Structure 
- **Project path:** `/home/manigupt/Hello/React/reddit-clone`
### FILE_MAP Tree
├── backend/
│   ├── utils/
│   │   ├── [] socketHandlers.js [225 LOC, 2145 tokens]
│   │   └── [] postQueries.js [18 LOC, 261 tokens]
│   ├── middleware/
│   │   └── [] auth.js [40 LOC, 283 tokens]
│   ├── routes/
│   │   ├── [] notifications.js [67 LOC, 504 tokens]
│   │   ├── [] forms.js [201 LOC, 1732 tokens]
│   │   ├── [] users.js [176 LOC, 1329 tokens]
│   │   ├── [] auth.js [110 LOC, 1038 tokens]
│   │   ├── [] markets.js [150 LOC, 1367 tokens]
│   │   ├── [] chats.js [180 LOC, 1560 tokens]
│   │   ├── [] posts.js [573 LOC, 5726 tokens]
│   │   └── [] communities.js [205 LOC, 1708 tokens]
│   ├── tests/
│   │   ├── [] auth.test.js [99 LOC, 650 tokens]
│   │   ├── [] users.test.js [125 LOC, 1002 tokens]
│   │   ├── [] markets.test.js [105 LOC, 838 tokens]
│   │   ├── [] chats.test.js [81 LOC, 697 tokens]
│   │   ├── [] forms.test.js [101 LOC, 764 tokens]
│   │   ├── [] communities.test.js [97 LOC, 788 tokens]
│   │   ├── [] posts.test.js [236 LOC, 1735 tokens]
│   │   └── [] comments.test.js [93 LOC, 745 tokens]
│   ├── [] jest.config.js [7 LOC, 50 tokens]
│   ├── [] package.json [28 LOC, 224 tokens]
│   ├── [] output.log [37 LOC, 278 tokens]
│   ├── [] app.js [47 LOC, 301 tokens]
│   ├── [] database.js [311 LOC, 2300 tokens]
│   ├── [] server.js [105 LOC, 805 tokens]
│   └── [] reddit_clone.db [0 LOC, 0 tokens]
├── children/
│   ├── [] backend.md [23 LOC, 113 tokens]
│   ├── [] create.md [28 LOC, 243 tokens]
│   ├── [] [id].md [22 LOC, 249 tokens]
│   ├── [] utils.md [14 LOC, 74 tokens]
│   ├── [] [communityId].md [23 LOC, 196 tokens]
│   ├── [] create-post.md [16 LOC, 148 tokens]
│   ├── [] options.md [12 LOC, 70 tokens]
│   ├── [] forms.md [15 LOC, 125 tokens]
│   ├── [] login.md [14 LOC, 97 tokens]
│   ├── [] components.md [46 LOC, 496 tokens]
│   ├── [] services.md [10 LOC, 56 tokens]
│   ├── [] [userId].md [29 LOC, 311 tokens]
│   ├── [] saved-posts.md [16 LOC, 167 tokens]
│   ├── [] responses.md [15 LOC, 136 tokens]
│   ├── [] chats.md [15 LOC, 136 tokens]
│   ├── [] middleware.md [12 LOC, 77 tokens]
│   ├── [] search.md [12 LOC, 73 tokens]
│   ├── [] app.md [19 LOC, 130 tokens]
│   ├── [] fill.md [16 LOC, 152 tokens]
│   ├── [] notifications.md [13 LOC, 94 tokens]
│   ├── [] [marketId].md [17 LOC, 181 tokens]
│   ├── [] tests.md [50 LOC, 318 tokens]
│   ├── [] context.md [45 LOC, 520 tokens]
│   ├── [] profile.md [21 LOC, 234 tokens]
│   ├── [] communities.md [11 LOC, 64 tokens]
│   ├── [] markets.md [15 LOC, 130 tokens]
│   ├── [] forgot-password.md [12 LOC, 74 tokens]
│   ├── [] reset-password.md [12 LOC, 74 tokens]
│   ├── [] marriage.md [11 LOC, 63 tokens]
│   ├── [] register.md [12 LOC, 71 tokens]
│   ├── [] lib.md [14 LOC, 57 tokens]
│   ├── [] frontend.md [21 LOC, 84 tokens]
│   └── [] routes.md [43 LOC, 259 tokens]
├── frontend/
│   ├── app/
│   │   ├── saved-posts/
│   │   │   └── [] page.tsx [89 LOC, 703 tokens]
│   │   ├── edit-community/
│   │   │   └── [communityId]/
│   │   │       └── [] page.tsx [163 LOC, 1175 tokens]
│   │   ├── communities/
│   │   │   ├── [communityId]/
│   │   │   │   └── [] page.tsx [93 LOC, 799 tokens]
│   │   │   └── [] page.tsx [54 LOC, 341 tokens]
│   │   ├── options/
│   │   │   └── [] page.tsx [65 LOC, 708 tokens]
│   │   ├── search/
│   │   │   └── [] page.tsx [76 LOC, 553 tokens]
│   │   ├── services/
│   │   │   ├── marriage/
│   │   │   │   └── [] page.tsx [60 LOC, 500 tokens]
│   │   │   └── [] page.tsx [115 LOC, 1053 tokens]
│   │   ├── posts/
│   │   │   └── [id]/
│   │   │       └── [] page.tsx [301 LOC, 2583 tokens]
│   │   ├── markets/
│   │   │   ├── create/
│   │   │   │   └── [] page.tsx [161 LOC, 1190 tokens]
│   │   │   ├── [marketId]/
│   │   │   │   └── [] page.tsx [228 LOC, 2020 tokens]
│   │   │   └── [] page.tsx [111 LOC, 949 tokens]
│   │   ├── forms/
│   │   │   ├── create/
│   │   │   │   └── [] page.tsx [258 LOC, 2162 tokens]
│   │   │   ├── [formId]/
│   │   │   │   ├── fill/
│   │   │   │   │   └── [] page.tsx [177 LOC, 1432 tokens]
│   │   │   │   └── responses/
│   │   │   │       └── [] page.tsx [111 LOC, 907 tokens]
│   │   │   └── [] page.tsx [87 LOC, 720 tokens]
│   │   ├── create-post/
│   │   │   └── [] page.tsx [144 LOC, 987 tokens]
│   │   ├── notifications/
│   │   │   └── [] page.tsx [112 LOC, 942 tokens]
│   │   ├── auth/
│   │   │   ├── forgot-password/
│   │   │   │   └── [] page.tsx [61 LOC, 515 tokens]
│   │   │   ├── login/
│   │   │   │   └── [] page.tsx [85 LOC, 697 tokens]
│   │   │   ├── reset-password/
│   │   │   │   └── [] page.tsx [85 LOC, 642 tokens]
│   │   │   └── register/
│   │   │       └── [] page.tsx [98 LOC, 782 tokens]
│   │   ├── chats/
│   │   │   ├── [userId]/
│   │   │   │   └── [] page.tsx [399 LOC, 4550 tokens]
│   │   │   └── [] page.tsx [142 LOC, 1048 tokens]
│   │   ├── profile/
│   │   │   ├── [userId]/
│   │   │   │   └── [] page.tsx [244 LOC, 2415 tokens]
│   │   │   └── [] page.tsx [371 LOC, 3422 tokens]
│   │   ├── [] 3d-rocket.png [0 LOC, 0 tokens]
│   │   ├── [] globals.css [26 LOC, 144 tokens]
│   │   ├── [] layout.tsx [52 LOC, 330 tokens]
│   │   └── [] page.tsx [216 LOC, 1901 tokens]
│   ├── components/
│   │   ├── [] TopAppBar.tsx [53 LOC, 761 tokens]
│   │   ├── [] PostCard.tsx [268 LOC, 3407 tokens]
│   │   ├── [] CommentCard.tsx [214 LOC, 2882 tokens]
│   │   └── [] BottomAppBar.tsx [66 LOC, 1649 tokens]
│   ├── context/
│   │   ├── [] NotificationContext.tsx [109 LOC, 749 tokens]
│   │   ├── [] SocketContext.tsx [66 LOC, 475 tokens]
│   │   ├── [] AuthContext.tsx [108 LOC, 700 tokens]
│   │   └── [] PostContext.tsx [133 LOC, 999 tokens]
│   ├── lib/
│   │   ├── [] utils.ts [30 LOC, 290 tokens]
│   │   ├── [] types.ts [154 LOC, 892 tokens]
│   │   └── [] constants.ts [1 LOC, 9 tokens]
│   ├── [] package.json [30 LOC, 239 tokens]
│   └── [] README.md [36 LOC, 357 tokens]
├── [] agent_harness.md [71 LOC, 883 tokens]
├── [] code_atlas.md [25 LOC, 308 tokens]
└── [] project_tools.md [16 LOC, 544 tokens]
### End Tree
