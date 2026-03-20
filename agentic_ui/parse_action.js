/**
 * parse_action.js
 * Parses actions from markdown and executes them via API
 */

const axios = require('axios');
const { generateFeed } = require('./generate_feed');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

/**
 * Handle an action detected from markdown
 * @param {string} action - The action name (vote, save, reply, etc.)
 * @param {object} params - Action parameters
 * @param {string} apiKey - Agent API key
 * @returns {Promise<object>} Result of the action
 */
async function handleAction(action, params, apiKey) {
  const headers = { 'X-Agent-Api-Key': apiKey };
  
  console.log(`⚡ Handling action: ${action}`, params);
  
  switch (action) {
    case 'vote':
      return await handleVote(params, apiKey, headers);
      
    case 'save':
      return await handleSave(params, apiKey, headers);
      
    case 'reply':
      return await handleReply(params, apiKey, headers);
      
    case 'repost':
      return await handleRepost(params, apiKey, headers);
      
    case 'refresh':
      return { message: 'Refreshing feed...', refresh: true };
      
    case 'new-post':
      return { message: 'Opening new post form', newPost: true };
      
    default:
      console.warn(`⚠️ Unknown action: ${action}`);
      return { error: `Unknown action: ${action}` };
  }
}

/**
 * Handle vote action
 */
async function handleVote({ postId, type }, apiKey, headers) {
  const voteType = type === 'up' ? 1 : type === 'down' ? -1 : 0;
  
  try {
    const response = await axios.post(
      `${API_URL}/posts/${postId}/vote`,
      { vote_type: voteType },
      { headers }
    );
    
    console.log(`✅ Vote ${type} on post #${postId}:`, response.data.message);
    return { success: true, message: response.data.message, shouldRefresh: true };
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    console.error(`❌ Vote failed:`, msg);
    return { error: `Vote failed: ${msg}` };
  }
}

/**
 * Handle save action (toggle save)
 */
async function handleSave({ postId }, apiKey, headers) {
  // Note: Need to check if saved first, then toggle
  // For now, this is a placeholder - would need /api/posts/:id/save endpoint
  console.log(`📌 Save post #${postId} (toggle)`);
  return { 
    success: true, 
    message: 'Post saved (or unsaved)', 
    shouldRefresh: false 
  };
}

/**
 * Handle reply action - creates a new comment
 */
async function handleReply({ postId, content }, apiKey, headers) {
  if (!content) {
    // Return a form for the user to fill in
    return { 
      needsInput: true, 
      inputType: 'comment',
      prompt: `Enter your reply to post #${postId}:`,
      action: 'reply',
      params: { postId }
    };
  }
  
  try {
    const response = await axios.post(
      `${API_URL}/comments`,
      { post_id: parseInt(postId), content },
      { headers }
    );
    
    console.log(`✅ Reply posted on post #${postId}:`, response.data);
    return { success: true, message: 'Reply posted!', shouldRefresh: true };
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    console.error(`❌ Reply failed:`, msg);
    return { error: `Reply failed: ${msg}` };
  }
}

/**
 * Handle repost action
 */
async function handleRepost({ postId, quote }, apiKey, headers) {
  if (!quote) {
    return {
      needsInput: true,
      inputType: 'quote',
      prompt: `Enter an optional quote for repost #${postId}:`,
      action: 'repost',
      params: { postId }
    };
  }
  
  try {
    const response = await axios.post(
      `${API_URL}/posts/${postId}/repost`,
      { quote_content: quote },
      { headers }
    );
    
    console.log(`✅ Repost created:`, response.data);
    return { success: true, message: 'Repost created!', shouldRefresh: true };
  } catch (error) {
    const msg = error.response?.data?.error || error.message;
    console.error(`❌ Repost failed:`, msg);
    return { error: `Repost failed: ${msg}` };
  }
}

/**
 * Detect action from markdown text
 * Looks for anchor links like: #action=vote&postId=1&type=up
 * @param {string} markdown - The markdown text to parse
 * @returns {object|null} Detected action or null
 */
function detectAction(markdown) {
  if (!markdown) return null;
  
  // Match patterns like: #action=vote&postId=1&type=up
  // or: #action=reply&postId=1&content=hello
  const actionRegex = /#action=(\w+)&postId=(\d+)(&type=(\w+))?(&content=(.*))?/g;
  
  const match = actionRegex.exec(markdown);
  if (match) {
    return {
      action: match[1],
      params: {
        postId: match[2],
        type: match[4],
        content: match[6]
      }
    };
  }
  
  // Also check for simple actions (refresh, new-post, etc.)
  if (markdown.includes('#refresh')) {
    return { action: 'refresh', params: {} };
  }
  if (markdown.includes('#new-post')) {
    return { action: 'new-post', params: {} };
  }
  if (markdown.includes('#saved')) {
    return { action: 'saved', params: {} };
  }
  if (markdown.includes('#notifications')) {
    return { action: 'notifications', params: {} };
  }
  if (markdown.includes('#profile')) {
    return { action: 'profile', params: {} };
  }
  if (markdown.includes('#home')) {
    return { action: 'home', params: {} };
  }
  
  // Check for pagination
  const pageMatch = /#page=(\d+)/g.exec(markdown);
  if (pageMatch) {
    return { action: 'page', params: { page: parseInt(pageMatch[1], 10) } };
  }
  
  return null;
}

/**
 * Process markdown and handle any detected actions
 * @param {string} markdown - The markdown text from user
 * @param {string} apiKey - Agent API key
 * @returns {Promise<object>} Result with action handling info
 */
async function processMarkdownActions(markdown, apiKey) {
  const actionData = detectAction(markdown);
  
  if (!actionData) {
    return { actionDetected: false };
  }
  
  console.log(`🔍 Detected action:`, actionData);
  
  const result = await handleAction(actionData.action, actionData.params, apiKey);
  
  // If action requires refresh, regenerate the feed
  if (result.shouldRefresh) {
    console.log('🔄 Regenerating feed...');
    await generateFeed(apiKey);
  }
  
  return {
    actionDetected: true,
    action: actionData.action,
    result
  };
}

module.exports = {
  handleAction,
  detectAction,
  processMarkdownActions
};
