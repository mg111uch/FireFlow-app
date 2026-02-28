# Project: Social and E-commerce app
# AI Agent Development Guidelines 

## TASK

How to add a post in `services->rent-buy->rent`.

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

## Codebase Atlas Navigation Flow

- You are not allowed to understand full source code. Only work with task based scope.
- Use this flow to read relevant source files instead of reading full source code.
    1. Agent reads code_atlas.md → Gets overview, entry points, critical deps
    2. Agent identifies relevant module → Reads specific children/X.md
    3. Agent needs implementation details → Reads actual source file

## Workflow for video understanding

- First ask user when you need to run this workflow along with the reason why some visual feature cannot tested using test script alone.
- Run the app using `Run Combined Project App:` command given above.
- Execute `Run and record video` command to record the video of working app feature.
- Replace the `## Reasoning Question` content in `video_test.md` with the list of features based questions you want to verify in the video. Include expected output format.
- Run `Ask Gemini` command. Response may take few minutes.
- Read the `## Reasoning Answer` from `video_test.md` and verify the behaviour you were expecting. Then Take action accordingly.

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

## Testing Mandates (Non-Negotiable)

Every feature/change **must** include:

- **Unit tests** for new/altered systems & controllers (mock event bus, components).
- **Integration smoke tests** for core loops (input → ECS tick → render).
- **View tests** — at minimum property assertions (position, visibility) + visual smoke checklist.
- Controller examples: input → command/event mapping, mode switching, buffering.
- **Red → Green → Refactor**: Agent first writes failing test → implements → passes.
- Aim for **>80% coverage** on logic-heavy files (systems/controllers).

Use your language's test framework (e.g., pytest/unittest).