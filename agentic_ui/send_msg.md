# Navigation to test chat message

# Open chat panel
- run_conductor click 192 1053

# Wait for chat panel to open
- action_pause 3

# Select first conversation/contact
- run_conductor click 80 300

# Wait for conversation to load
- action_pause 3

# Click on message input field
- run_conductor click 90 975

# Wait for input field to focus
- action_pause 1

# Move cursor to message input area
- run_conductor move 510 975

# Wait for cursor position
- action_pause 1

# Type the message content
- type_text "Automated message 101"

# Wait for text to appear in input
- action_pause 1

# Click send button to submit message
- run_conductor click 605 975
