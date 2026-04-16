const formCreation = require('./formCreation');
const formRetrieval = require('./formRetrieval');
const formModification = require('./formModification');
const formSubmissions = require('./formSubmissions');

module.exports = (io, onlineUsers) => {
  const router = require('express').Router();

  // Mount all form-related routes
  router.use('/', formCreation(io, onlineUsers));
  router.use('/', formRetrieval(io, onlineUsers));
  router.use('/', formModification(io, onlineUsers));
  router.use('/', formSubmissions(io, onlineUsers));

  return router;
};