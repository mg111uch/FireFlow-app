# 📂 components
**Generated:** 2026-01-28 15:13:20
**Files:** 4

---

F061│BottomAppBar.tsx│60│⚛
D: ●next
F: BottomAppBar()
F: BottomAppBar()
---

F060│CommentCard.tsx│192│⚛
D: ●axios,next,react
F: CommentCard({ comment,post,onCommentUpdate,onReplyClick,onCommentDelete,onFetchReplies })│formatLargeNumber(num)│handleVote(voteType)│handleDelete()│handleSave()│handlePin()
F: CommentCard({ comment,post,onCommentUpdate,onReplyClick,onCommentDelete,onFetchReplies })
   ↳Calls: F064:useAuth
F: formatLargeNumber(num)
   ↳Called by: F060:handleSave,F060:handlePin,F059:handleSave
   ↳Impact: 🔴HIGH (3 dependents) | Breaks: [F060:handleSave],[F060:handlePin],[F059:handleSave]
F: handleVote(voteType)
F: handleDelete()
F: handleSave()
   ↳Calls: F060:formatLargeNumber,F059:formatLargeNumber
F: handlePin()
   ↳Calls: F060:formatLargeNumber,F059:formatLargeNumber
---

F059│PostCard.tsx│240│⚛
D: ●axios,next,react
F: PostCard({ post,onPostUpdate })│formatLargeNumber(num)│handleVote(postId,voteType)│handleSave(postId)
F: PostCard({ post,onPostUpdate })
F: formatLargeNumber(num)
   ↳Called by: F060:handleSave,F060:handlePin,F059:handleSave
   ↳Impact: 🔴HIGH (3 dependents) | Breaks: [F060:handleSave],[F060:handlePin],[F059:handleSave]
F: handleVote(postId,voteType)
F: handleSave(postId)
   ↳Calls: F060:formatLargeNumber,F059:formatLargeNumber
---

F058│TopAppBar.tsx│44│⚛
D: ●@context,@lib,next
F: TopAppBar()
F: TopAppBar()
   ↳Calls: F062:useNotification
---
