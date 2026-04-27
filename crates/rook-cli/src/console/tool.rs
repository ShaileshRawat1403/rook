use crate::console::style as style_mod;
use crate::console::style::bold;
use console::Style;
use console::Color;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ToolState {
    Pending,
    Running,
    Success,
    Error,
    Cancelled,
}

impl ToolState {
    pub fn render(&self, tool_name: &str, duration_ms: Option<u64>) -> String {
        match self {
            ToolState::Pending => format!(
                "  {} {}",
                style_mod::dim("○"),
                style_mod::dim(tool_name)
            ),
            ToolState::Running => format!(
                "  {} {}...",
                style_mod::info("▸"),
                bold(tool_name)
            ),
            ToolState::Success => {
                let check = style_mod::success("✓");
                if let Some(ms) = duration_ms {
                    if ms < 1000 {
                        format!("  {} {} completed in {}ms", check, tool_name, ms)
                    } else {
                        format!(
                            "  {} {} completed in {:.1}s",
                            check, tool_name, ms as f64 / 1000.0
                        )
                    }
                } else {
                    format!("  {} {}", check, tool_name)
                }
            }
            ToolState::Error => {
                let cross = style_mod::error("✗");
                format!("  {} {} failed", cross, tool_name)
            }
            ToolState::Cancelled => {
                let cancel = style_mod::warning("⊘");
                format!("  {} {} cancelled", cancel, tool_name)
            }
        }
    }
}

pub fn render_error_detailed(message: &str, cause: Option<&str>, hint: Option<&str>) -> String {
    let err_icon = style_mod::error("✗");
    let mut lines = vec![format!("{} {}", err_icon, message)];

    if let Some(c) = cause {
        let arrow = style_mod::dim("→");
        lines.push(format!("  {} {}", arrow, c));
    }

    if let Some(h) = hint {
        let d = style_mod::dim(h);
        lines.push(format!("  {}", d));
    }

    lines.join("\n")
}

pub fn render_tool_header(name: &str, extension: Option<&str>) -> String {
    let tool = pretty_tool_name(name);
    let icon = style_mod::info("▸");
    if let Some(ext) = extension {
        format!(
            "  {} {}  {}",
            icon,
            bold(&tool),
            style_mod::dim(format!("· {}", ext))
        )
    } else {
        format!("  {} {}", icon, bold(&tool))
    }
}

pub fn render_shell_command(command: &str) -> String {
    let dol = style_mod::dim("$");
    format!("    {} {}", dol, style_mod::code(command))
}

pub fn render_file_operation(path: &str, operation: &str) -> String {
    let op = style_mod::dim(operation);
    let arrow = style_mod::info("→");
    format!("    {} {} {}", op, arrow, style_mod::highlight(path))
}

pub fn render_tool_success(duration_ms: Option<u64>) -> String {
    let check = style_mod::success("✓");
    if let Some(ms) = duration_ms {
        if ms < 1000 {
            format!("  {} completed in {}ms", check, ms)
        } else {
            format!("  {} completed in {:.1}s", check, ms as f64 / 1000.0)
        }
    } else {
        format!("  {}", check)
    }
}

pub fn render_tool_running() -> String {
    let arrow = style_mod::dim("▸");
    format!("  {} running...", arrow)
}

pub fn render_tool_start(tool_name: &str) -> String {
    let arrow = style_mod::info("▸");
    format!("  {} {}", arrow, bold(tool_name))
}

pub fn render_tool_error(err_msg: &str) -> String {
    let cross = style_mod::error("✗");
    format!("  {} {}", cross, err_msg)
}

pub fn render_tool_progress(current: usize, total: usize, label: &str) -> String {
    let percentage = if total > 0 {
        (current as f64 / total as f64 * 100.0) as usize
    } else {
        0
    };
    let bar = style_mod::dim("▌");
    format!(
        "  {} [{}{}] {}% {}",
        bar,
        "█".repeat(current.min(20)),
        "░".repeat(20 - current.min(20)),
        percentage,
        label
    )
}

pub fn render_tool_waiting() -> String {
    let circle = style_mod::dim("○");
    format!("  {} waiting for approval...", circle)
}

pub fn render_tool_approval(tool_name: &str, risk_level: &str) -> String {
    let (icon, color) = match risk_level.to_lowercase().as_str() {
        "low" => ("🟢", Color::Green),
        "medium" => ("🟡", Color::Yellow),
        "high" => ("🟠", Color::Yellow),
        "critical" => ("🔴", Color::Red),
        _ => ("⚪", Color::White),
    };

    let arrow = style_mod::info("▸");
    format!(
        "  {} {}  {}  [{}]",
        arrow,
        bold(tool_name),
        Style::new().fg(color).apply_to(icon),
        Style::new().fg(color).apply_to(risk_level.to_uppercase())
    )
}

pub fn format_duration_ms(ms: u64) -> String {
    if ms < 1000 {
        format!("{}ms", ms)
    } else if ms < 60000 {
        format!("{:.1}s", ms as f64 / 1000.0)
    } else {
        let mins = ms / 60000;
        let secs = (ms % 60000) / 1000;
        format!("{}m {}s", mins, secs)
    }
}

pub fn pretty_tool_name(name: &str) -> String {
    match name {
        "todo_write" => "update todo".to_string(),
        "tree" => "inspect tree".to_string(),
        "write" => "write file".to_string(),
        "edit" => "edit file".to_string(),
        "shell" => "run shell".to_string(),
        "delegate" | "subagent" => "delegate task".to_string(),
        "mcp__execute" => "execute MCP".to_string(),
        "mcp__list_tools" => "list MCP tools".to_string(),
        "mcp__list_prompts" => "list MCP prompts".to_string(),
        other => other.replace('_', " ").replace("__", ": "),
    }
}

pub fn format_command_output(output: &str, max_lines: usize) -> Vec<String> {
    let lines: Vec<&str> = output.lines().collect();

    if lines.len() <= max_lines {
        lines.iter().map(|s| s.to_string()).collect()
    } else {
        let head = max_lines / 2;
        let tail = max_lines - head;
        let mut result = Vec::new();

        for line in lines.iter().take(head) {
            result.push(line.to_string());
        }

        let remaining = lines.len() - head - tail;
        if remaining > 0 {
            let d = style_mod::dim("⋮");
            result.push(format!("  {} ... {} more lines ...", d, remaining));
        }

        for line in lines.iter().skip(lines.len() - tail) {
            result.push(line.to_string());
        }

        result
    }
}

pub fn render_mcp_tool_call(server: &str, tool_name: &str) -> String {
    let arrow = style_mod::info("▸");
    format!(
        "  {} {} {}",
        arrow,
        bold("MCP"),
        style_mod::dim(format!("{}:{}", server, tool_name))
    )
}

pub fn render_mcp_tool_result(server: &str, success: bool) -> String {
    let ok = style_mod::success("✓");
    let err = style_mod::error("✗");
    format!(
        "  {} MCP {} {}",
        if success { ok } else { err },
        server,
        if success { "done" } else { "error" }
    )
}

pub fn render_tool_output_block(output: &str, max_lines: usize) {
    let lines = format_command_output(output, max_lines);
    for line in lines {
        println!("  {}", style_mod::dim(line));
    }
}

pub fn render_exit_code(exit_code: i32) -> String {
    let ok = style_mod::success("0");
    if exit_code == 0 {
        format!("exited {}", ok)
    } else {
        let err = style_mod::error("✗");
        format!("exited {} with code {}", err, exit_code)
    }
}

pub fn render_signal(signal: &str) -> String {
    format!("terminated by {}", style_mod::warning(signal))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pretty_tool_name() {
        assert_eq!(pretty_tool_name("shell"), "run shell");
        assert_eq!(pretty_tool_name("todo_write"), "update todo");
        assert_eq!(pretty_tool_name("write"), "write file");
        assert_eq!(pretty_tool_name("mcp__execute"), "execute MCP");
    }

    #[test]
    fn test_format_duration_ms() {
        assert_eq!(format_duration_ms(500), "500ms");
        assert_eq!(format_duration_ms(1500), "1.5s");
        assert_eq!(format_duration_ms(65000), "1m 5s");
    }

    #[test]
    fn test_tool_state_render() {
        assert!(ToolState::Pending.render("test", None).starts_with("  ○"));
        assert!(ToolState::Running.render("test", None).contains("▸"));
        assert!(ToolState::Success.render("test", Some(500)).contains("✓"));
        assert!(ToolState::Error.render("test", None).contains("✗"));
        assert!(ToolState::Cancelled.render("test", None).contains("⊘"));
    }

    #[test]
    fn test_error_detailed() {
        let msg = render_error_detailed("failed", Some("timeout"), None);
        assert!(msg.contains("timeout"));

        let with_hint = render_error_detailed("failed", Some("timeout"), Some("try again"));
        assert!(with_hint.contains("try again"));
    }

    #[test]
    fn test_mcp_tool_call() {
        let call = render_mcp_tool_call("filesystem", "read_file");
        assert!(call.contains("MCP"));
        assert!(call.contains("filesystem"));
    }
}