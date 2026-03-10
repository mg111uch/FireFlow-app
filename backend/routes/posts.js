// Posts router - Entry point that combines all modular sub-routers
const express = require('express');

// Import sub-routers
const postsRouter = require('./posts/posts.router');
const votesRouter = require('./posts/votes.router');
const commentsRouter = require('./posts/comments.router');
const viewsRouter = require('./posts/views.router');
const savesRouter = require('./posts/saves.router');

module.exports = (io, onlineUsers) => {
  const router = express.Router();

  // Mount sub-routers with io and onlineUsers dependencies
  router.use('/', postsRouter(io));
  router.use('/', votesRouter(io));
  router.use('/', commentsRouter(io, onlineUsers));
  router.use('/', viewsRouter(io));
  router.use('/', savesRouter(io));

  return router;
};
