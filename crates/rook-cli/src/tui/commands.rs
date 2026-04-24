use std::fmt;

#[derive(Debug, Clone, PartialEq)]
pub enum SlashCommand {
    New,
    Resume,
    Model,
    Config,
    Provider,
    Sandbox,
    Archive,
    Clear,
    Help,
}

impl fmt::Display for SlashCommand {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
            SlashCommand::New => "/new",
            SlashCommand::Resume => "/resume",
            SlashCommand::Model => "/model",
            SlashCommand::Config => "/config",
            SlashCommand::Provider => "/provider",
            SlashCommand::Sandbox => "/sandbox",
            SlashCommand::Archive => "/archive",
            SlashCommand::Clear => "/clear",
            SlashCommand::Help => "/help",
        };
        write!(f, "{}", s)
    }
}

impl SlashCommand {
    pub fn parse(input: &str) -> Option<Self> {
        if !input.starts_with('/') {
            return None;
        }

        let cmd_part = input.split_whitespace().next()?;
        match cmd_part {
            "/new" => Some(SlashCommand::New),
            "/resume" => Some(SlashCommand::Resume),
            "/model" => Some(SlashCommand::Model),
            "/config" => Some(SlashCommand::Config),
            "/provider" => Some(SlashCommand::Provider),
            "/sandbox" => Some(SlashCommand::Sandbox),
            "/archive" => Some(SlashCommand::Archive),
            "/clear" => Some(SlashCommand::Clear),
            "/help" => Some(SlashCommand::Help),
            _ => None,
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            SlashCommand::New => "Start a new conversation",
            SlashCommand::Resume => "Browse and resume previous sessions",
            SlashCommand::Model => "Switch the active AI model",
            SlashCommand::Config => "Open configuration settings",
            SlashCommand::Provider => "Connect or change AI providers",
            SlashCommand::Sandbox => "Toggle sandbox execution mode",
            SlashCommand::Archive => "Archive the current session",
            SlashCommand::Clear => "Clear the chat interaction stream",
            SlashCommand::Help => "Show available commands",
        }
    }

    pub fn all_commands() -> Vec<Self> {
        vec![
            SlashCommand::New,
            SlashCommand::Resume,
            SlashCommand::Model,
            SlashCommand::Provider,
            SlashCommand::Config,
            SlashCommand::Sandbox,
            SlashCommand::Archive,
            SlashCommand::Clear,
            SlashCommand::Help,
        ]
    }
}
