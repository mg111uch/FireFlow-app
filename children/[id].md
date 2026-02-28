# 📂 [id]
**Generated:** 2026-01-28 15:13:20
**Files:** 1

---

F040│page.tsx│262│⚛
D: ●@components,@context,@lib,axios,react
F: PostDetail({ params })│fetchComments()│handleNewComment(newCommentData)│handleCommentVote(data)│handleCommentDeleted({ commentId })│handleCommentPin(data)│handlePostComment(e)│handleCommentUpdate(updatedComment)│handleReplyClick(comment)
F: PostDetail({ params })
   ↳Calls: F065:usePosts,F063:useSocket,F064:useAuth
F: fetchComments()
   ↳Called by: F040:fetchComments | Calls: F040:fetchComments
   ↳Impact: 🟢LOW (1 dependents) | Breaks: [F040:fetchComments]
F: handleNewComment(newCommentData)
F: handleCommentVote(data)
F: handleCommentDeleted({ commentId })
F: handleCommentPin(data)
F: handlePostComment(e)
F: handleCommentUpdate(updatedComment)
F: handleReplyClick(comment)
---
