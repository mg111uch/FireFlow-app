# Project Development Guidelines 

## TASK

Check why in `reddit-clone/frontend/app/agent/page.tsx` starting a new session using /new slash command resets the selected model to default.

Do not give code or make any changes, just a concise plan or answer.

## Code Execution & Validation Environment

- **Command to Run combined App:** `cd /home/manigupt/Hello/reddit-clone && npm run app`.
- **Command to Run only Backend:** `cd /home/manigupt/Hello/reddit-clone/backend && npm start`.
- **Command to Run only Frontend:** `cd /home/manigupt/Hello/reddit-clone/frontend && npm run dev`.
- **Command to Run Backend Test :** `cd /home/manigupt/Hello/reddit-clone/backend && npm test`

## Project files

- **Backend Source_code:** (Working directory) `/home/manigupt/Hello/reddit-clone/backend`
- **Frontend Source_code:** (Working directory) `/home/manigupt/Hello/reddit-clone/frontend`

## Prerequisites

- Next.js 15.3.3
- Node.js (v18+) and npm 
- SQLite database (included)

## Project related tools

- **Tool usage command** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && python run_cmds.py /home/manigupt/Hello/reddit-clone/project_tools.md <Tool_name>`
- **Tools available** (Tool_name)
    - Run and record video
    - Ask Gemini

## Rules

- Do not build the frontend unless user asks explicitly.
- Never read .env* files. Ask user for whatever changes you want to make in them.

## Core principles

- **Small scope always** — Never ask the agent to change >3 files at once or understand the full codebase.
- **Strict modularity** — Single responsibility, clear interfaces, minimal coupling.
- **Test-first mindset** — Tests are the safety net for AI-generated code.
- **Human-in-the-loop** — Agent proposes → you review → apply → test → commit.
- Optimize for handling large codebases while maintaining output quality.

## File & Module Size Rules

- Max **400–500 lines** per file (including tests & comments).
- **One public class/struct/interface** per file (ECS: one component OR one system).
- Split large files ruthlessly when they exceed 500 LOC or violate single responsibility.

