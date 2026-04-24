# Terminal Integration

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Talk to rook directly from your shell prompt. Instead of switching to a separate REPL session, stay in your terminal and call rook when you need it.

## Setup

<Tabs groupId="shells">
<TabItem value="zsh" label="zsh" default>

Add to `~/.zshrc`:
```bash
eval "$(rook term init zsh)"
```

</TabItem>
<TabItem value="bash" label="bash">

Add to `~/.bashrc`:
```bash
eval "$(rook term init bash)"
```

</TabItem>
<TabItem value="fish" label="fish">

Add to `~/.config/fish/config.fish`:
```fish
rook term init fish | source
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

Add to `$PROFILE`:
```powershell
Invoke-Expression (rook term init powershell)
```

</TabItem>
</Tabs>

Restart your terminal or source the config, and that's it!

## Usage

Just type `@goose` (or `@g` for short) followed by your question:

```bash
npm install express
    npm ERR! code EACCES
    npm ERR! permission denied

@rook "how do I fix this error?"
```

rook automatically sees the commands you've run since your last question, so you don't need to explain what you've been doing. Use quotes around your prompt if it contains special characters like `?`, `*`, or `'`:

```bash
@rook "what's in this directory?"
@g "analyze the error: 'permission denied'"
```

## Named Sessions
By default, each terminal gets its own rook session that lasts until you close it. Named sessions let you continue conversations across terminal restarts and share context between windows.

<Tabs groupId="shells">
<TabItem value="zsh" label="zsh" default>

```bash
eval "$(rook term init zsh --name my-project)"
```

</TabItem>
<TabItem value="bash" label="bash">

```bash
eval "$(rook term init bash --name my-project)"
```

</TabItem>
<TabItem value="fish" label="fish">

```fish
rook term init fish --name my-project | source
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

```powershell
Invoke-Expression (rook term init powershell --name my-project)
```

</TabItem>
</Tabs>

Named sessions persist in goose's database, so they're available anytime, even after restarting your computer. Reopen later and run the same command to continue:

```bash
# Start debugging
eval "$(rook term init zsh --name auth-bug)"
@rook help me debug this login timeout

# Close terminal, come back later
eval "$(rook term init zsh --name auth-bug)"
@rook "what was the solution we discussed?"
# Continues the same conversation with context
```

## Show Context Status in Your Prompt

Add `rook term info` to your prompt to see how much context you've used and which model is active during a terminal rook session. 

<Tabs groupId="shells">
<TabItem value="zsh" label="zsh" default>

```bash
PROMPT='$(rook term info) %~ $ '
```

</TabItem>
<TabItem value="bash" label="bash">

```bash
PS1='$(rook term info) \w $ '
```

</TabItem>
<TabItem value="fish" label="fish">

```fish
function fish_prompt
    rook term info
    echo -n ' '(prompt_pwd)' $ '
end
```

</TabItem>
<TabItem value="powershell" label="PowerShell">

```powershell
function prompt {
    $gooseInfo = & rook term info
    "$gooseInfo $(Get-Location) PS> "
}
```

</TabItem>
</Tabs>

Your terminal prompt now shows the context usage and model name (shortened for readability) for the active rook session. For example:

```bash
●●○○○ sonnet ~/projects $
```
## Shell Completion for rook Commands

`@goose` provides context-aware assistance based on your command history. To enable tab completion of rook CLI commands (like `rook session`, `rook run`, etc.), see the [shell completion documentation](/docs/guides/goose-cli-commands#completion).

## Troubleshooting

**rook doesn't see recent commands:**
If you run commands but rook says it doesn't see any recent activity, check if terminal integration is properly [set up in your shell config](#setup).
You can also check the id of the rook session in your current terminal:
```bash
# Check if session ID exists
echo $AGENT_SESSION_ID
# Should show something like: 20251209_151730
```
To share context across terminal windows, use a [named session](#named-sessions) instead.

**Session getting too full** (prompt shows `●●●●●`):
If goose's responses are getting slow or hitting context limits, start a fresh rook session in the terminal. The new rook session sees your command history, but not the conversation history from the previous session. 
```bash
# Start a new rook session in the same shell
eval "$(rook term init zsh)"
```
