# 📂 profile
**Generated:** 2026-01-28 15:13:20
**Files:** 1

---

F056│page.tsx│343│⚛
D: ●@context,axios,next,react
F: ProfilePage()│fetchUserProfileData(userId,token)│fetchCommunities(userId,token)│handleCreateCommunity(e)│handleJoinCommunity(communityId)│handleUnJoinCommunity(communityId)│handleDeleteCommunity(communityId,communityName)│getInitials(name?)
F: ProfilePage()
   ↳Calls: F064:useAuth
F: fetchUserProfileData(userId,token)
F: fetchCommunities(userId,token)
   ↳Called by: F048:CreatePostPage
   ↳Impact: 🟢LOW (1 dependents) | Breaks: [F048:CreatePostPage]
F: handleCreateCommunity(e)
F: handleJoinCommunity(communityId)
F: handleUnJoinCommunity(communityId)
F: handleDeleteCommunity(communityId,communityName)
F: getInitials(name?)
---
