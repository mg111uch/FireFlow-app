/**
 * agent.js
 * Main agent script for Reddit Clone - handles dynamic markdown feed
 * 
 * Usage:
 *   AGENT_API_KEY=your_key node agent.js <command> [args]
 * 
 * Commands:
 *   refresh              - Regenerate the feed markdown
 *   action <json>       - Execute an action (vote, reply, etc.)
 *   read <file>         - Read a markdown file and process actions
 *   serve               - Start a simple HTTP server for interactive mode
 */

const { generateFeed, getFeedPath } = require('./generate_feed');
const { handleAction, detectAction, processMarkdownActions } = require('./parse_action');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

// Get API key from environment
const apiKey = process.env.AGENT_API_KEY;

if (!apiKey) {
  console.error('❌ AGENT_API_KEY environment variable is required');
  console.log('\n📋 Usage:');
  console.log('  AGENT_API_KEY=your_key node agent.js <command> [args]');
  console.log('\n📝 Commands:');
  console.log('  refresh              - Generate/regenerate feed.md');
  console.log('  action <json>       - Execute an action');
  console.log('  read <file>         - Process actions in a markdown file');
  console.log('  serve               - Start HTTP server for interactive mode');
  console.log('\n💡 To get an API key:');
  console.log('  1. Login to the app');
  console.log('  2. POST /api/agent/keys with your JWT');
  process.exit(1);
}

// Parse command
const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    switch (command) {
      case 'refresh':
        await cmdRefresh(args);
        break;
        
      case 'action':
        await cmdAction(args);
        break;
        
      case 'read':
        await cmdRead(args);
        break;
        
      case 'serve':
        await cmdServe(args);
        break;
        
      case 'help':
        showHelp();
        break;
        
      default:
        console.log(`❓ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Command: refresh - Generate/regenerate the feed
 */
async function cmdRefresh(args) {
  const page = parseInt(args[0], 10) || 1;
  console.log(`🔄 Refreshing feed (page ${page})...`);
  
  await generateFeed(apiKey, page);
  
  console.log(`✅ Feed updated: ${getFeedPath()}`);
  console.log(`📄 View at: https://raw.githubusercontent.com/.../tests/feed.md`);
}

/**
 * Command: action - Execute an action
 * Usage: node agent.js action '{"action":"vote","params":{"postId":1,"type":"up"}}'
 */
async function cmdAction(args) {
  if (args.length === 0) {
    console.error('❌ Action JSON is required');
    console.log('Usage: node agent.js action \'{"action":"vote","params":{"postId":1,"type":"up"}}\'');
    process.exit(1);
  }
  
  let actionData;
  try {
    actionData = JSON.parse(args[0]);
  } catch (e) {
    console.error('❌ Invalid JSON:', args[0]);
    process.exit(1);
  }
  
  const { action, params } = actionData;
  
  console.log(`⚡ Executing action: ${action}`);
  console.log(`   Params:`, params);
  
  const result = await handleAction(action, params, apiKey);
  
  console.log('\n📊 Result:', result);
  
  // Refresh feed if needed
  if (result.shouldRefresh) {
    console.log('\n🔄 Regenerating feed...');
    await generateFeed(apiKey);
  }
}

/**
 * Command: read - Read a markdown file and process any actions
 * Usage: node agent.js read feed.md
 */
async function cmdRead(args) {
  if (args.length === 0) {
    console.error('❌ File path is required');
    console.log('Usage: node agent.js read <file>');
    process.exit(1);
  }
  
  const filePath = path.resolve(args[0]);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  const markdown = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📄 Processing file: ${filePath}`);
  console.log(`   Size: ${markdown.length} bytes`);
  
  const result = await processMarkdownActions(markdown, apiKey);
  
  if (!result.actionDetected) {
    console.log('ℹ️ No actions detected in file');
    return;
  }
  
  console.log(`\n✅ Action processed:`);
  console.log(`   Action: ${result.action}`);
  console.log(`   Result:`, result.result);
}

/**
 * Command: serve - Start a simple HTTP server
 */
async function cmdServe(args) {
  const port = parseInt(args[0], 10) || 3001;
  
  // First generate the feed
  await generateFeed(apiKey);
  
  const http = require('http');
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    const url = req.url.split('?')[0];
    
    if (url === '/' || url === '/feed') {
      // Serve the feed markdown
      const feedPath = getFeedPath();
      const feed = fs.existsSync(feedPath) ? fs.readFileSync(feedPath, 'utf8') : '# No feed yet';
      
      res.writeHead(200, { 'Content-Type': 'text/markdown' });
      res.end(feed);
    } else if (url === '/api/refresh') {
      // Refresh the feed
      generateFeed(apiKey).then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
    } else if (url.startsWith('/api/action')) {
      // Handle action
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const result = await handleAction(data.action, data.params, apiKey);
          
          if (result.shouldRefresh) {
            await generateFeed(apiKey);
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  server.listen(port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Reddit Clone Agent Server                       ║
╠══════════════════════════════════════════════════════════════╣
║  🌐 Server running at: http://localhost:${port}                ║
║  📄 Feed URL:        http://localhost:${port}/feed             ║
║  🔄 Refresh API:     POST /api/refresh                         ║
║  ⚡ Action API:      POST /api/action                           ║
╚══════════════════════════════════════════════════════════════╝

Example API call to refresh:
  curl -X POST http://localhost:${port}/api/refresh

Example API call to vote:
  curl -X POST http://localhost:${port}/api/action \\
    -H "Content-Type: application/json" \\
    -d '{"action":"vote","params":{"postId":1,"type":"up"}}'
`);
  });
}

function showHelp() {
  console.log(`
📋 Reddit Clone Agent - Help

Usage:
  AGENT_API_KEY=your_key node agent.js <command> [args]

Commands:
  refresh              Generate/regenerate feed.md
  action <json>       Execute an action (vote, reply, etc.)
  read <file>        Process actions in a markdown file
  serve               Start HTTP server for interactive mode

Examples:

  # Refresh the feed
  AGENT_API_KEY=xxx node agent.js refresh

  # Vote on a post
  AGENT_API_KEY=xxx node agent.js action '{"action":"vote","params":{"postId":1,"type":"up"}}'

  # Reply to a post
  AGENT_API_KEY=xxx node agent.js action '{"action":"reply","params":{"postId":1,"content":"Hello!"}}'

  # Start interactive server
  AGENT_API_KEY=xxx node agent.js serve 3001

Action Types:
  - vote     : Vote on a post (type: "up" or "down")
  - reply    : Add a comment (content: "your reply")
  - repost   : Repost with optional quote (quote: "optional quote")
  - save     : Save/unsave a post

Environment Variables:
  AGENT_API_KEY    Your agent API key (required)
  API_URL          Backend URL (default: http://localhost:5000/api)
`);
}

// Run main
main();
