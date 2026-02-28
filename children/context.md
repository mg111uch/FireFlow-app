# 📂 context
**Generated:** 2026-01-28 15:13:20
**Files:** 4

---

F064│AuthContext.tsx│95│⚛
D: ●@lib,axios,jwt-decode,next,react
F: login(loginData)│useAuth()
F: login(loginData)
   ↳Called by: F051:Login,F051:handleLogin
   ↳Impact: 🟡MEDIUM (2 dependents) | Breaks: [F051:Login],[F051:handleLogin]
F: useAuth()
   ↳Called by: F062:NotificationProvider,F060:CommentCard,F056:ProfilePage
   ↳Impact: 🔴HIGH (8 dependents) | Breaks: [F062:NotificationProvider],[F060:CommentCard],[F056:ProfilePage]
---

F062│NotificationContext.tsx│93│⚛
D: ►F063,F064 ●@lib,axios,react
F: NotificationProvider({ children })│handleNewNotification(notification)│useNotification()
F: NotificationProvider({ children })
   ↳Calls: F063:useSocket,F064:useAuth
F: handleNewNotification(notification)
F: useNotification()
   ↳Called by: F049:NotificationsPage,F058:TopAppBar
   ↳Impact: 🟡MEDIUM (2 dependents) | Breaks: [F049:NotificationsPage],[F058:TopAppBar]
---

F065│PostContext.tsx│118│⚛
D: ►F064 ●@lib,axios,react
F: PostProvider({ children })│usePosts()
F: PostProvider({ children })
   ↳Calls: F064:useAuth
F: usePosts()
   ↳Called by: F031:Home,F040:PostDetail
   ↳Impact: 🟡MEDIUM (2 dependents) | Breaks: [F031:Home],[F040:PostDetail]
---

F063│SocketContext.tsx│57│⚛
D: ●@context,next,react,socket.io-client
F: useSocket()
F: useSocket()
   ↳Called by: F062:NotificationProvider,F031:Home,F040:PostDetail
   ↳Impact: 🔴HIGH (3 dependents) | Breaks: [F062:NotificationProvider],[F031:Home],[F040:PostDetail]
---
