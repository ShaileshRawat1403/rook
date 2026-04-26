---
sidebar_position: 105
title: Using rook in ACP Clients
sidebar_label: rook in ACP Clients
---

Client applications that support the [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) can connect natively to rook. This integration allows you to seamlessly interact with rook directly from the client.

:::warning Experimental Feature
ACP is an emerging specification that enables clients to communicate with AI agents like rook. This feature has limited adoption and may evolve as the protocol develops.
:::

## How It Works
After you configure rook as an agent in the ACP client, you gain access to rook's core agent functionality, including its extensions and tools. rook also automatically loads any [configured MCP servers](#using-mcp-servers-from-acp-clients) from your ACP client alongside its own extensions, making their tools available without additional configuration.

The client manages the rook lifecycle automatically, including:

- **Initialization**: The client runs the `rook acp` command to initialize the connection
- **Communication**: The client communicates with rook over stdio using JSON-RPC
- **Multiple Sessions**: The client manages multiple concurrent conversations, each with isolated state
- **Model and Mode Switching**: The client can switch models and modes mid-session without restarting
- **File Operations**: The client handles file reads and writes, so rook sees changes not yet saved to disk and edits show as native diffs
- **Terminal**: The client runs commands in its own terminal, so output appears alongside the conversation

:::info Session Persistence
ACP sessions are saved to rook's session history where you can access and manage them using rook. Access to session history in ACP clients might vary.
:::

:::tip Reference Implementation
The [rook for VS Code](/docs/experimental/vs-code-extension) extension uses ACP to communicate with rook. See the [vscode-rook](https://github.com/aaif-rook/vscode-rook) repository for implementation details.
:::

## Setup in ACP Clients
Any editor or IDE that supports ACP can connect to rook as an agent server. Check the [official ACP clients list](https://agentclientprotocol.com/overview/clients) for available clients with links to their documentation.

### Example: Zed Editor Setup

ACP was originally developed by [Zed](https://zed.dev/). Here's how to configure rook in Zed:

#### 1. Prerequisites

Ensure you have both Zed and rook CLI installed:

- **Zed**: Download from [zed.dev](https://zed.dev/)
- **rook CLI**: Follow the [installation guide](/docs/getting-started/installation)

  - Verify rook is installed: `rook --version`

  - Temporarily run `rook acp` to test that ACP support is working:

    ```
    ~ rook acp
    Rook ACP agent started. Listening on stdio...
    ```

    Press `Ctrl+C` to exit the test.

#### 2. Configure rook as a Custom Agent

Add rook to your Zed settings:

1. Open Zed
2. Press `Cmd+Option+,` (macOS) or `Ctrl+Alt+,` (Linux/Windows) to open the settings file
3. Add the following configuration:

```json
{
  "agent_servers": {
    "rook": {
      "command": "rook",
      "args": ["acp"],
      "env": {}
    }
  },
  // more settings
}
```

You should now be able to interact with rook directly in Zed. Your ACP sessions use the same extensions that are enabled in your rook configuration, and your tools (Developer, Computer Controller, etc.) work the same way as in regular rook sessions.

#### 3. Start Using rook in Zed

1. **Open the Agent Panel**: Click the sparkles agent icon in Zed's status bar
2. **Create New Thread**: Click the `+` button to show thread options
3. **Select rook**: Choose `New rook` to start a new conversation with rook
4. **Start Chatting**: Interact with rook directly from the agent panel

#### Advanced Configuration

##### Overriding Provider and Model

By default, rook will use the provider and model defined in your [configuration file](/docs/guides/config-files). You can override this for specific ACP configurations using the `GOOSE_PROVIDER` and `GOOSE_MODEL` environment variables.

The following Zed settings example configures two rook agent instances. This is useful for:
- Comparing model performance on the same task
- Using cost-effective models for simple tasks and powerful models for complex ones

```json
{
  "agent_servers": {
    "rook": {
      "command": "rook",
      "args": ["acp"],
      "env": {}
    },
    "rook (GPT-4o)": {
      "command": "rook",
      "args": ["acp"],
      "env": {
        "GOOSE_PROVIDER": "openai",
        "GOOSE_MODEL": "gpt-4o"
      }
    }
  },
  // more settings
}
```

## Using MCP Servers from ACP Clients

MCP servers configured in the ACP client's `context_servers` are automatically available to rook. This allows you to use those MCP servers when using both native client features and the rook agent integration.

**Example (Zed):**

```json
{
  "context_servers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/dir"
      ]
    }
  },
  "agent_servers": {
    "rook": {
      "command": "rook",
      "args": ["acp"],
      "env": {}
    }
  },
  // more settings
}
```

To find out what tools are available, just ask rook while it's running in the client.

:::info
All MCP servers in `context_servers` are automatically available to rook, provided that they use stdio (command-based) or HTTP transports. rook doesn't support servers that use the deprecated SSE transport.

If a server in `context_servers` has the same name as a rook extension, rook uses its own [configuration](/docs/guides/config-files).
:::
## TUI Client

For terminal-based workflows, rook provides a TUI (Terminal User Interface) client that communicates with rook via ACP. This is useful for developers who prefer working entirely in the terminal or need a lightweight alternative to the desktop app.

### Features

- **Full terminal-based chat interface** - Interactive conversation UI rendered directly in your terminal
- **Real-time streaming responses** - See rook's responses as they're generated
- **Tool call visualization** - View tool executions with status indicators, inputs, and outputs
- **Permission dialogs** - Approve or reject tool permissions inline
- **Keyboard navigation** - Navigate conversation history and scroll through responses
- **Markdown rendering** - Formatted output for code blocks, lists, and other markdown elements
- **Message queuing** - Queue messages while rook is processing

### Installation

```bash
cd ui/text
npm install
```

### Running the TUI

**Option 1: Auto-launch server (recommended)**

The TUI will automatically start the rook-acp-server if you have it installed:

```bash
npm start
```

**Option 2: Connect to a custom server**

For servers that support the draft standard ACP over Streamable HTTP https://github.com/agentclientprotocol/agent-client-protocol/pull/721

```bash
npm start -- --server http://HOST:PORT

# example server
cargo run -p rook-acp --bin rook-acp-server
```

### Single Prompt Mode

Send a single prompt and exit (useful for scripting):

```bash
npm start -- --text "What files are in this directory?"
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `↑` / `↓` | Scroll current response |
| `Shift+↑` / `Shift+↓` | Navigate conversation history |
| `Tab` | Expand/collapse tool call details |
| `Ctrl+C` or `Esc` | Exit (or cancel permission dialog) |

### Permission Dialog

When rook requests permission to use a tool, a dialog appears with these options:

| Key | Action |
|-----|--------|
| `y` | Allow once |
| `a` | Always allow |
| `n` | Reject once |
| `N` | Always reject |
| `↑` / `↓` | Navigate options |
| `Enter` | Confirm selection |
| `Esc` | Cancel |

## Additional Resources

import ContentCardCarousel from '@site/src/components/ContentCardCarousel';
import chooseYourIde from '@site/blog/2025-10-24-intro-to-agent-client-protocol-acp/choose-your-ide.png';

<ContentCardCarousel
  items={[
    {
      type: 'video',
      title: 'Intro to Agent Client Protocol (ACP) | Vibe Code with rook',
      description: 'Watch how ACP lets you seamlessly integrate rook into your code editor to streamline fragmented workflows.',
      thumbnailUrl: 'https://img.youtube.com/vi/Hvu5KDTb6JE/maxresdefault.jpg',
      linkUrl: 'https://www.youtube.com/watch?v=Hvu5KDTb6JE',
      date: '2025-10-16',
      duration: '50:23'
    },
   {
      type: 'blog',
      title: 'Intro to Agent Client Protocol (ACP): The Standard for AI Agent-Editor Integration',
      description: 'Learn how to integrate AI agents like rook directly into your code editor via ACP, eliminating window-switching and vendor lock-in.',
      thumbnailUrl: chooseYourIde,
      linkUrl: '/blog/2025/10/24/intro-to-agent-client-protocol-acp',
      date: '2025-10-24',
      duration: '7 min read'
    }
  ]}
/>
