# Origin

## Where Rook started

Rook began as a fork of [goose](https://github.com/aaif-goose/goose) — the open-source AI agent now stewarded by the Agentic AI Foundation at the Linux Foundation. Goose gave Rook a real runtime to start from: a Rust core, multi-provider model access, MCP support, and a desktop surface worth studying. Without goose, Rook wouldn't be at this point in the road.

## Why a fork, not a feature branch

The work I wanted to do is structural, not cosmetic.

- I wanted execution to be visible by default — every tool choice, every file touched, every decision the agent made.
- I wanted a governance seat sitting next to the agent, not bolted on as a config flag. That became the relationship with [DAX](integrations/rook-dax-project-manifesto.md).
- I wanted the surface area to feel approachable to people who don't read code for a living. Solo maintainer building for solo operators.

A fork was the cleanest way to redirect the project toward those goals without negotiating them through someone else's roadmap.

## Why "rook," not "goose"

The new name had to carry the new intent.

A goose is a messenger and a flock-flier — gregarious, agreeable, often the friendliest face on a project. That fit goose's character well. It didn't fit what I was building.

A rook is a different kind of bird. Rooks select tools. They watch while others work. They forage and surface what's been hidden. They operate as a coordinated colony, not as a soloist. The behaviors I wanted from this software — tool-aware, sentinel-natured, collective in capability — were already encoded in the bird.

The full version of this thinking lives in the [Rook + DAX manifesto](integrations/rook-dax-project-manifesto.md).

## Who's building this

One person. Not a developer by training, not by trade. I'm building Rook because the era of AI-assisted work makes that possible for people like me — people who can describe what good software should feel like, and now have the tools to draft it, govern it, and ship it honestly.

This isn't a traditional GitHub project. It's a record of what one non-developer can do when the tools meet the user halfway.

## What stays from goose, what becomes Rook

Rook keeps the open-source foundations where they continue to serve: the Rust runtime, the MCP and ACP integration patterns, the multi-provider model layer. Where goose's choices stop matching Rook's product direction — UX, governance posture, default behavior — those parts get rebuilt rather than wrapped.

The product identity, the documentation voice, the governance model, and the long-term direction belong to Rook. The [manifesto](integrations/rook-dax-project-manifesto.md) is the source of truth for product intent.
