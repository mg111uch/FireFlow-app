## Project specific tool usage commands

- **Make Codebase_atlas:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/atlas_output && conda run -n myenv python -m codebase_atlas.main --project-dir /home/manigupt/Hello/reddit-clone --output-dir /home/manigupt/Hello/reddit-clone`

- **Add markers:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && python add_markers.py --md_file /home/manigupt/Hello/reddit-clone/codefiles_map.md --project_path "/home/manigupt/Hello/reddit-clone"`

- **Codebase size:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && conda run -n myenv python codebase_size.py --directory /home/manigupt/Hello/reddit-clone --extensions .js .ts .tsx .json --output-file /home/manigupt/Hello/reddit-clone/codefiles_map.md --start-marker "## Codebase size" --end-marker "## End Codebase size" --ignore-dir node_modules .git .next .swc public images uploads screenshots --ignore-files package-lock.json .gitignore .env .env.local tsconfig.tsbuildinfo postcss.config.mjs next-env.d.ts favicon.ico`

- **Make directory:** 
`cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && conda run -n myenv python make_directree.py --reverse --base_path /home/manigupt/Hello/reddit-clone --md_file /home/manigupt/Hello/reddit-clone/codefiles_map.md --start_marker '### FILE_MAP Tree' --end_marker '### End Tree' --ignore_dir node_modules .git .next .swc public images uploads screenshots --ignore_files package-lock.json .gitignore .env .env.local tsconfig.tsbuildinfo postcss.config.mjs next-env.d.ts favicon.ico reddit_clone.db`

- **Copy Content:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && conda run -n myenv python copyContent.py --mode dump --md_file /home/manigupt/Hello/reddit-clone/codefiles_map.md --base_path /home/manigupt/Hello/reddit-clone --output_file /home/manigupt/Hello/Agentic_Unit_PIE/generated_reports/code_dump.txt --start_marker '### FILE_MAP Tree' --end_marker '### End Tree'`

- **Count Tokens in file:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && conda run -n myenv python token_count.py /home/manigupt/Hello/reddit-clone/codefiles_map.md`

- **Check if file exists:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && conda run -n myenv python path_file_exists.py /home/manigupt/Hello/reddit-clone/codefiles_map.md`

- **Navigate test flow:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools && conda run -n myenv python navigation.py --test_md_file /home/manigupt/Hello/reddit-clone/tests/send_msg.md`

- **Record screen:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools && conda run -n myenv python record_screen.py --x 0 --y 150 --width 675 --height 925 --duration 30 --fps 30 --output /home/manigupt/Hello/Agentic_Unit_PIE/codebase/utils_files/reddit-clone.avi`

- **Run and record video:** `cd /home/manigupt/Hello/ai_agent/agent_tools && conda run -n myenv python run_and_record.py --tools_file_path /home/manigupt/Hello/reddit-clone/project_tools.md --app_cmd_name "Navigate test flow" --record_cmd_name "Record screen" --record_init_delay 1`

- **Ask Gemini:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools && export $(cat .env | xargs) && conda run -n myenv python reason_video.py --video_file /home/manigupt/Hello/ai_agent/videos/reddit-clone.avi --response_file /home/manigupt/Hello/reddit-clone/video_test.md`

- **Execute in order:** `cd /home/manigupt/Hello/Agentic_Unit_PIE/codebase/agent_tools/atlas_tools && python run_cmds.py /home/manigupt/Hello/reddit-clone/project_tools.md "Make Codebase_atlas" "Add markers" "Codebase size" "Make directory" "Count Tokens in file"`

- `python run_cmds.py /home/manigupt/Hello/reddit-clone/project_tools.md "Codebase size" "Make directory"`


