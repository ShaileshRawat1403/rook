use crate::tui::state::{Item, MessageRole, Thread};
use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::Widget,
};

const CHAT_BG: Color = Color::Rgb(16, 18, 22);
const TEXT_PRIMARY: Color = Color::Rgb(224, 228, 235);
const TEXT_MUTED: Color = Color::Rgb(126, 133, 146);
const TEXT_SUBTLE: Color = Color::Rgb(94, 101, 112);
const ASSISTANT_ACCENT: Color = Color::Rgb(93, 201, 255);
const USER_ACCENT: Color = Color::Rgb(96, 146, 255);
const SYSTEM_ACCENT: Color = Color::Rgb(119, 126, 138);
const SUCCESS: Color = Color::Rgb(113, 209, 146);
const WARNING: Color = Color::Rgb(245, 204, 92);
const DANGER: Color = Color::Rgb(255, 120, 120);

pub struct ChatPanel {
    thread: Thread,
    scroll: u16,
}

impl ChatPanel {
    pub fn new(thread: Thread, scroll: u16) -> Self {
        Self { thread, scroll }
    }
}

impl Widget for ChatPanel {
    fn render(self, area: Rect, buf: &mut Buffer) {
        if area.width == 0 || area.height == 0 {
            return;
        }

        if self.thread.turns.is_empty() {
            let welcome = vec![
                Line::from(Span::styled(
                    "  Rook is ready.",
                    Style::default()
                        .fg(ASSISTANT_ACCENT)
                        .add_modifier(Modifier::BOLD),
                )),
                Line::from(Span::styled(
                    "  Start with a task or use /provider, /model, /help.",
                    Style::default().fg(TEXT_MUTED),
                )),
            ];

            ratatui::widgets::Paragraph::new(welcome)
                .style(Style::default().bg(CHAT_BG))
                .wrap(ratatui::widgets::Wrap { trim: false })
                .render(area, buf);
            return;
        }

        let lines = flatten_thread(&self.thread, area.width);

        let viewport_height = area.height as usize;
        let max_scroll = lines.len().saturating_sub(viewport_height) as u16;
        let scroll = self.scroll.min(max_scroll);
        let base_scroll = lines.len().saturating_sub(viewport_height) as u16;
        let offset = base_scroll.saturating_sub(scroll);
        let visible: Vec<Line<'static>> = lines
            .into_iter()
            .skip(offset as usize)
            .take(viewport_height)
            .collect();

        ratatui::widgets::Paragraph::new(visible)
            .style(Style::default().bg(CHAT_BG))
            .render(area, buf);
    }
}

fn flatten_thread(thread: &Thread, width: u16) -> Vec<Line<'static>> {
    let text_width = width.saturating_sub(4).max(12) as usize;
    let card_width = width.saturating_sub(8).max(12) as usize;
    let mut lines = Vec::new();

    for turn in &thread.turns {
        let (role_label, role_fg, role_hint) = match turn.role {
            MessageRole::User => (" YOU ", USER_ACCENT, "request"),
            MessageRole::Assistant => (" ROOK ", ASSISTANT_ACCENT, "working stream"),
            MessageRole::System => (" INFO ", SYSTEM_ACCENT, "session"),
        };

        lines.push(Line::from(vec![
            Span::styled(
                role_label.to_string(),
                Style::default()
                    .fg(Color::Black)
                    .bg(role_fg)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                format!(" {}", turn.timestamp.format("%H:%M:%S")),
                Style::default().fg(TEXT_SUBTLE),
            ),
            Span::raw("  "),
            Span::styled(role_hint.to_string(), Style::default().fg(TEXT_MUTED)),
        ]));

        for item in &turn.items {
            match item {
                Item::Text(content) => {
                    for row in wrap_text(content, text_width) {
                        lines.push(Line::from(Span::styled(
                            format!("  {}", row),
                            Style::default().fg(TEXT_PRIMARY),
                        )));
                    }
                }
                Item::Thinking(content) => {
                    push_card_header(&mut lines, "REASONING", TEXT_MUTED);
                    for row in wrap_text(content, card_width) {
                        lines.push(Line::from(Span::styled(
                            format!("    {}", row),
                            Style::default().fg(TEXT_MUTED),
                        )));
                    }
                }
                Item::Shell(activity) => {
                    let status = if activity.is_running {
                        "running".to_string()
                    } else if activity.exit_code == Some(0) {
                        "done".to_string()
                    } else {
                        format!("failed ({})", activity.exit_code.unwrap_or(1))
                    };
                    let status_color = if activity.is_running {
                        USER_ACCENT
                    } else if activity.exit_code == Some(0) {
                        SUCCESS
                    } else {
                        DANGER
                    };

                    push_card_header(&mut lines, &activity.label.to_uppercase(), status_color);
                    lines.push(kv_line(
                        "cmd",
                        &activity.command,
                        card_width,
                        ASSISTANT_ACCENT,
                    ));
                    lines.push(Line::from(vec![
                        Span::styled("    result ", Style::default().fg(TEXT_SUBTLE)),
                        Span::styled(status, Style::default().fg(status_color)),
                    ]));
                    for row in wrap_text(&activity.output, card_width).into_iter().take(4) {
                        lines.push(Line::from(Span::styled(
                            format!("    {}", row),
                            Style::default().fg(TEXT_MUTED),
                        )));
                    }
                }
                Item::FileChange(activity) => {
                    push_card_header(&mut lines, "CHANGE", ASSISTANT_ACCENT);
                    lines.push(kv_line(
                        "file",
                        &activity.file_path,
                        card_width,
                        TEXT_PRIMARY,
                    ));
                    lines.push(kv_line(
                        "action",
                        &activity.description,
                        card_width,
                        TEXT_MUTED,
                    ));
                    lines.push(Line::from(vec![
                        Span::styled("    state ", Style::default().fg(TEXT_SUBTLE)),
                        Span::styled(
                            activity.status.clone(),
                            Style::default().fg(ASSISTANT_ACCENT),
                        ),
                        Span::raw("  "),
                        Span::styled("risk ", Style::default().fg(TEXT_SUBTLE)),
                        Span::styled(activity.risk_level.clone(), Style::default().fg(WARNING)),
                    ]));
                }
            }
            lines.push(Line::from(""));
        }
    }

    if lines.last().map(|line| line.width()).unwrap_or_default() == 0 {
        lines.pop();
    }

    lines
}

fn push_card_header(lines: &mut Vec<Line<'static>>, title: &str, color: Color) {
    lines.push(Line::from(vec![
        Span::raw("  "),
        Span::styled("▍ ", Style::default().fg(color)),
        Span::styled(
            title.to_string(),
            Style::default().fg(color).add_modifier(Modifier::BOLD),
        ),
    ]));
}

fn kv_line(label: &str, value: &str, width: usize, color: Color) -> Line<'static> {
    let rendered = wrap_text(value, width)
        .into_iter()
        .next()
        .unwrap_or_default();
    Line::from(vec![
        Span::styled(format!("    {} ", label), Style::default().fg(TEXT_SUBTLE)),
        Span::styled(rendered, Style::default().fg(color)),
    ])
}

fn wrap_text(content: &str, width: usize) -> Vec<String> {
    if width == 0 {
        return vec![String::new()];
    }

    let sanitized_content = content.replace('\r', "").replace('\t', "    ");
    let mut rows = Vec::new();
    for raw_line in sanitized_content.lines() {
        if raw_line.is_empty() {
            rows.push(String::new());
            continue;
        }

        let mut current_line = String::new();
        for word in raw_line.split(' ') {
            let mut word = word;

            while !word.is_empty() {
                let space_left = width.saturating_sub(current_line.chars().count());

                if current_line.is_empty() {
                    // Start of a new line
                    let take = word.chars().count().min(width);
                    let (head, tail) = split_at_char_index(word, take);
                    current_line.push_str(head);
                    word = tail;

                    if word.is_empty() {
                        // Word finished
                    } else {
                        // Word was too long, push current line and continue with the rest of the word
                        rows.push(std::mem::take(&mut current_line));
                    }
                } else if word.chars().count() < space_left {
                    // Word fits in current line with a space
                    current_line.push(' ');
                    current_line.push_str(word);
                    word = "";
                } else {
                    // Word (or what's left of it) doesn't fit, push current line
                    rows.push(std::mem::take(&mut current_line));
                    // Next iteration will handle word on a new line
                }
            }
        }
        if !current_line.is_empty() {
            rows.push(current_line);
        }
    }

    if rows.is_empty() {
        rows.push(String::new());
    }

    rows
}

fn split_at_char_index(s: &str, index: usize) -> (&str, &str) {
    let mut char_indices = s.char_indices();
    if let Some((idx, _)) = char_indices.nth(index) {
        s.split_at(idx)
    } else {
        (s, "")
    }
}
