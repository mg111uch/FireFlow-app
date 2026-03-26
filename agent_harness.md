# Project: Social and E-commerce app
# AI Agent Development Guidelines 

## TASK

Can a common product card component be made which could be used to display products in both `React/reddit-clone/frontend/app/shop/page.tsx` and `React/reddit-clone/frontend/app/shop/[userId]/page.tsx`. All products card in outer tab should also show `Add to cart` button along with `View shop` button. Also cart button should also show in main page at the same position.
Do not give code, just a concise plan or answer.

## Code Execution & Validation Environment

- **Command to Run combined App:** `cd /home/manigupt/Hello/React/reddit-clone && npm run app`.
- **Command to Run only Backend:** `cd /home/manigupt/Hello/React/reddit-clone/backend && npm start`.
- **Command to Run only Frontend:** `cd /home/manigupt/Hello/React/reddit-clone/frontend && npm run dev`.
- **Command to Run Backend Test :** `cd /home/manigupt/Hello/React/reddit-clone/backend && npm test`

## Project files

- **Base_file_path:**  `/home/manigupt/Hello/React/reddit-clone/code_atlas.md`
- **Children_path:**  `/home/manigupt/Hello/React/reddit-clone/children`
- **Backend Source_code:** (Working directory) `/home/manigupt/Hello/React/reddit-clone/backend`
- **Frontend Source_code:** (Working directory) `/home/manigupt/Hello/React/reddit-clone/frontend`

## Project related tools

- **Tool usage command** `cd /home/manigupt/Hello/python/ai_agent/atlas_output && python run_cmds.py /home/manigupt/Hello/React/reddit-clone/project_tools.md <Tool_name>`
- **Tools available** (Tool_name)
    - Run and record video
    - Ask Gemini

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

