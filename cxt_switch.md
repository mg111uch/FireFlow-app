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

## Testing Mandates (Non-Negotiable)

Every feature/change **must** include:

- **Unit tests** for new/altered systems & controllers (mock event bus, components).
- **Integration smoke tests** for core loops (input → ECS tick → render).
- **View tests** — at minimum property assertions (position, visibility) + visual smoke checklist.
- Controller examples: input → command/event mapping, mode switching, buffering.
- **Red → Green → Refactor**: Agent first writes failing test → implements → passes.
- Aim for **>80% coverage** on logic-heavy files (systems/controllers).

Use your language's test framework (e.g., pytest/unittest).