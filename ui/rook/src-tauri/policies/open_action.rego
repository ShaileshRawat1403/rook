package rook.open_action

import rego.v1

# Default deny
default allow := false
default needs_approval := false

# Input shape:
# {
#   "workspace_path": "/Users/someone/my-project",
#   "target_path": "/Users/someone/my-project/src/main.rs",
#   "target_path_lower": "/users/someone/my-project/src/main.rs",
#   "action": "editor" | "terminal",
#   "is_inside_workspace": true,
#   "is_workspace_root": false
# }

# Allow if it's inside the workspace and doesn't need approval
allow if {
	input.is_inside_workspace
	not needs_approval
}

# Require approval for .env files, secrets, or private keys
needs_approval if {
	contains(input.target_path_lower, "/.env")
}

needs_approval if {
	contains(input.target_path_lower, "secret")
}

needs_approval if {
	endswith(input.target_path_lower, ".pem")
}

needs_approval if {
	endswith(input.target_path_lower, ".key")
}

# Require approval for GitHub workflows
needs_approval if {
	contains(input.target_path_lower, "/.github/workflows/")
}

# Require approval for opening the root directory itself (often a terminal action)
needs_approval if {
	input.action == "terminal"
	input.is_workspace_root
}
