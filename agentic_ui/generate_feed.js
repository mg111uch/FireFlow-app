/**
 * generate_feed.js
 * Fetches posts from the API and generates a markdown feed UI
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const OUTPUT_FILE = path.join(__dirname, 'feed.md');

/**
 * Generate the feed markdown and write to file
 * @param {string} apiKey - Agent API key
 * @param {number} page - Page number for pagination
 * @param {number} limit - Number of posts per page
 * @returns {Promise<string>} The generated markdown
 */
async function generateFeed(apiKey, page = 1, limit = 10) {
  console.log(`Fetching posts from page ${page}...`);
  
  const response = await axios.get(`${API_URL}/posts`, {
    params: { page, limit },
    headers: { 'X-Agent-Api-Key': apiKey }
  });
  
  const posts = response.data;
  
  if (!posts || posts.length === 0) {
    const emptyMarkdown = generateEmptyFeed(page);
    writeFeed(emptyMarkdown);
    return emptyMarkdown;
  }
  
  const markdown = generateFeedMarkdown(posts, page, limit);
  writeFeed(markdown);
  
  console.log(`✅ Feed generated with ${posts.length} posts`);
  return markdown;
}

/**
 * Generate markdown for an empty feed
 */
function generateEmptyFeed(page) {
  return `# Reddit Clone Feed — Page ${page}

[🔄 Refresh](#refresh) | [➕ New Post](#new-post)

---

*No posts available. Be the first to create one!*

---

**[➕ Create New Post](#new-post)**
`;
}

/**
 * Generate the complete feed markdown
 */
function generateFeedMarkdown(posts, page, limit) {
  let output = '';
  
  // Header
  output += `# Reddit Clone Feed — Page ${page}\n\n`;
  output += `[🔄 Refresh](#refresh) | [➕ New Post](#new-post) | [📋 My Saved Posts](#saved)\n\n`;
  output += `---\n\n`;
  
  // Posts
  posts.forEach((post, index) => {
    output += generatePostCard(post, index + 1);
    output += `\n---\n\n`;
  });
  
  // Footer with pagination hint
  output += `\n## Navigation\n`;
  output += `- [← Previous Page](#page=${page - 1}) `;
  output += `| [→ Next Page](#page=${page + 1})\n`;
  output += `- [🏠 Home](#home) | [🔔 Notifications](#notifications) | [👤 Profile](#profile)\n`;
  
  return output;
}

/**
 * Generate a single post card in markdown
 */
function generatePostCard(post, number) {
  let card = '';
  
  // Post header with stats
  const upvoteIcon = post.user_vote_type === 1 ? '🟢' : '▲';
  const downvoteIcon = post.user_vote_type === -1 ? '🟢' : '▼';
  const savedIcon = post.is_saved ? '🔖' : '📑';
  
  card += `## Post #${post.id}${post.title ? `: ${post.title}` : ''}\n\n`;
  
  card += `| ${upvoteIcon} Upvotes | ${downvoteIcon} Downvotes | 💬 Comments | 👁 Views | ${savedIcon} Saved |\n`;
  card += `|:----------|:-----------|:-----------|:--------|:------|\n`;
  card += `| **${post.upvotes}** | **${post.downvotes}** | ${post.comment_count || 0} | ${post.views || 0} | ${post.is_saved ? 'Yes' : 'No'} |\n\n`;
  
  // Author and time
  card += `**👤 @${post.username}**`;
  if (post.community_name && post.community_name !== 'General') {
    card += ` in **🏘️ ${post.community_name}**`;
  }
  card += ` · ${formatTimeAgo(post.created_at)}\n\n`;
  
  // Content
  card += `${post.content}\n\n`;
  
  // Image if exists
  if (post.image_url) {
    card += `![Image](${post.image_url})\n\n`;
  }
  
  // Action buttons (these become clickable links that agent parses)
  card += `### Actions\n`;
  card += `- [▲ Upvote](#action=vote&postId=${post.id}&type=up) `;
  card += `- [▼ Downvote](#action=vote&postId=${post.id}&type=down) `;
  card += `- [💬 Reply](#action=reply&postId=${post.id}) `;
  card += `- [🔖 Save](#action=save&postId=${post.id}) `;
  card += `- [↗️ Repost](#action=repost&postId=${post.id})\n`;
  
  return card;
}

/**
 * Format timestamp as relative time (e.g., "2h ago")
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'unknown';
  
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Write markdown to file
 */
function writeFeed(markdown) {
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
}

/**
 * Get the current feed file path
 */
function getFeedPath() {
  return OUTPUT_FILE;
}

// Export for use by other modules
module.exports = {
  generateFeed,
  generateFeedMarkdown,
  getFeedPath,
  OUTPUT_FILE
};

// CLI usage
if (require.main === module) {
  const apiKey = process.env.AGENT_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Please set AGENT_API_KEY environment variable');
    console.log('Usage: AGENT_API_KEY=your_key node generate_feed.js [page]');
    process.exit(1);
  }
  
  const page = parseInt(process.argv[2], 10) || 1;
  generateFeed(apiKey, page).catch(console.error);
}
