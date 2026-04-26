use crate::console::style::{bold, dim, info, success, warning};
use console::Color;
use console::Style;

pub struct SessionSummary {
    pub success: bool,
    pub duration_secs: u64,
    pub total_tokens: Option<i32>,
    pub input_tokens: Option<i32>,
    pub output_tokens: Option<i32>,
    pub tools_executed: usize,
    pub approvals_granted: usize,
    pub approvals_denied: usize,
    pub provider: Option<String>,
    pub model: Option<String>,
}

impl SessionSummary {
    pub fn new(success: bool) -> Self {
        Self {
            success,
            duration_secs: 0,
            total_tokens: None,
            input_tokens: None,
            output_tokens: None,
            tools_executed: 0,
            approvals_granted: 0,
            approvals_denied: 0,
            provider: None,
            model: None,
        }
    }

    pub fn with_duration(mut self, secs: u64) -> Self {
        self.duration_secs = secs;
        self
    }

    pub fn with_tokens(mut self, total: i32) -> Self {
        self.total_tokens = Some(total);
        self
    }

    pub fn with_io_tokens(mut self, input: i32, output: i32) -> Self {
        self.input_tokens = Some(input);
        self.output_tokens = Some(output);
        self
    }

    pub fn with_tools(mut self, executed: usize) -> Self {
        self.tools_executed = executed;
        self
    }

    pub fn with_approvals(mut self, granted: usize, denied: usize) -> Self {
        self.approvals_granted = granted;
        self.approvals_denied = denied;
        self
    }

    pub fn with_model_info(mut self, provider: &str, model: &str) -> Self {
        self.provider = Some(provider.to_string());
        self.model = Some(model.to_string());
        self
    }

    pub fn render(&self) {
        let status_style = if self.success {
            (Style::new().fg(Color::Green), "Session Complete")
        } else {
            (Style::new().fg(Color::Yellow), "Session Ended")
        };

        println!();
        println!("{}", dim("╭────────────────────────────────────────"));
        println!(
            "{}  {}  {}",
            dim("│"),
            status_style.0.bold().apply_to(status_style.1),
            dim("─".repeat(20))
        );
        println!("{}", dim("├────────────────────────────────────────"));

        println!(
            "{}  {}  {}",
            dim("│"),
            dim("Duration:"),
            bold(format!("{}s", self.duration_secs))
        );

        if let Some(total) = self.total_tokens {
            println!(
                "{}  {}  {}",
                dim("│"),
                dim("Tokens:"),
                info(total.to_string())
            );
        }

        if let (Some(inp), Some(out)) = (self.input_tokens, self.output_tokens) {
            println!(
                "{}  {}  {} in / {} out",
                dim("│"),
                dim("IO Tokens:"),
                info(inp.to_string()),
                info(out.to_string())
            );
        }

        if self.tools_executed > 0 {
            println!(
                "{}  {}  {}",
                dim("│"),
                dim("Tools:"),
                bold(self.tools_executed.to_string())
            );
        }

        if self.approvals_granted > 0 || self.approvals_denied > 0 {
            let granted = success(format!("✓ {}", self.approvals_granted));
            let denied = warning(format!("✗ {}", self.approvals_denied));
            println!(
                "{}  {}  {}  {}",
                dim("│"),
                dim("Approvals:"),
                granted,
                denied
            );
        }

        if let (Some(provider), Some(model)) = (&self.provider, &self.model) {
            println!("{}", dim("├────────────────────────────────────────"));
            println!(
                "{}  {} {} · {}",
                dim("│"),
                info(provider.clone()),
                dim("·"),
                bold(model.clone())
            );
        }

        println!("{}", dim("╰────────────────────────────────────────"));
        println!();
    }
}

pub fn format_elapsed(secs: u64) -> String {
    if secs < 60 {
        format!("{}s", secs)
    } else if secs < 3600 {
        format!("{}m {}s", secs / 60, secs % 60)
    } else {
        format!("{}h {}m {}s", secs / 3600, (secs % 3600) / 60, secs % 60)
    }
}
