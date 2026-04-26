---
draft: false
title: "Previewing rook v1.0 Beta"
description: "rook v1.0 Beta is here! Learn about the latest features and improvements."
date: 2024-12-06
authors:
  - adewale
---

![rook v1.0 Beta](rook-v1.0-beta.png)
We are excited to share a preview of the new updates coming to rook with rook v1.0 Beta!

This major update comes with a bunch of new features and improvements that make rook more powerful and user-friendly. Here are some of the key highlights.

<!-- truncate -->


## Exciting Features of rook 1.0 Beta

### 1. Transition to Rust

The core of rook has been rewritten in Rust. Why does this matter? Rust allows for a more portable and stable experience. This change means that rook can run smoothly on different systems without the need for Python to be installed, making it easier for anyone to start using it.

### 2. Contextual Memory

rook will remember previous interactions to better understand ongoing projects. This means you won’t have to keep repeating yourself. Imagine having a conversation with someone who remembers every detail—this is the kind of support rook aims to offer.

### 3. Improved Plugin System

In rook v1.0, the rook toolkit system is being replaced with Extensions. Extensions are modular daemons that rook can interact with dynamically. As a result, rook will be able to support more complex plugins and integrations. This will make it easier to extend rook with new features and functionality.

### 4. Headless mode

You can now run rook in headless mode - this is useful for running rook on servers or in environments where a graphical interface is not available.

```sh
cargo run --bin rook -- run -i instructions.md
```

### 5. rook now has a GUI

rook now has an electron-based GUI macOS application that provides and alternative to the CLI to interact with rook and manage your projects.

![rook GUI](rook-gui.png)

### 6. rook alignment with open protocols

rook v1.0 Beta now uses a custom protocol, that is designed in parallel with [Anthropic’s Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) (MCP) to communicate with Systems. This makes it possible for developers to create their own systems (e.g Jira, ) that Goose can integrate with. 

Excited for many more feature updates and improvements? Stay tuned for more updates on Goose! Check out the [rook repo](https://github.com/aaif-rook/rook) and join our [Discord community](https://discord.gg/rook-oss).


<head>
  <meta property="og:title" content="Previewing Goose v1.0 Beta" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://rook-docs.ai/blog/2024/12/06/previewing-rook-v10-beta" />
  <meta property="og:description" content="AI Agent uses screenshots to assist in styling." />
  <meta property="og:image" content="https://rook-docs.ai/assets/images/rook-v1.0-beta-5d469fa73edea37cfccfe8a8ca0b47e2.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="twitter:domain" content="rook-docs.ai" />
  <meta name="twitter:title" content="Screenshot-Driven Development" />
  <meta name="twitter:description" content="AI Agent uses screenshots to assist in styling." />
  <meta name="twitter:image" content="https://rook-docs.ai/assets/images/rook-v1.0-beta-5d469fa73edea37cfccfe8a8ca0b47e2.png" />
</head>