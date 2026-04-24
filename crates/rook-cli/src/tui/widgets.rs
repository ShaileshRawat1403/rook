use ratatui::{
    buffer::Buffer,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Paragraph, Widget},
};

const PANEL_BG: Color = Color::Rgb(12, 14, 18);
const PANEL_BORDER: Color = Color::Rgb(43, 50, 60);
const BLUE: Color = Color::Rgb(96, 146, 255);
const CYAN: Color = Color::Rgb(93, 201, 255);
const TEXT_PRIMARY: Color = Color::Rgb(224, 228, 235);
const TEXT_MUTED: Color = Color::Rgb(126, 133, 146);

pub struct ComposerWidget<'a> {
    pub title: &'a str,
    pub placeholder: &'a str,
    pub input: &'a str,
    pub is_processing: bool,
}

impl<'a> Widget for ComposerWidget<'a> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        if area.width < 4 || area.height < 3 {
            return;
        }

        fill_area(buf, area, PANEL_BG);

        let border_color = if self.is_processing {
            PANEL_BORDER
        } else {
            BLUE
        };
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(border_color))
            .title(Span::styled(
                format!(" {} ", self.title),
                Style::default()
                    .fg(TEXT_PRIMARY)
                    .add_modifier(Modifier::BOLD),
            ));

        let inner = block.inner(area);
        block.render(area, buf);
        if inner.width == 0 || inner.height == 0 {
            return;
        }

        let footer_height = u16::from(!self.is_processing && inner.height > 1);
        let rows = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Min(1), Constraint::Length(footer_height)])
            .split(inner);

        let body_text = if self.input.is_empty() && !self.is_processing {
            visible_tail(
                self.placeholder,
                rows[0].width as usize,
                rows[0].height as usize,
            )
        } else {
            visible_tail(self.input, rows[0].width as usize, rows[0].height as usize)
        };

        let body = if self.input.is_empty() && !self.is_processing {
            Paragraph::new(Span::styled(body_text, Style::default().fg(TEXT_MUTED)))
        } else {
            Paragraph::new(Span::styled(body_text, Style::default().fg(TEXT_PRIMARY)))
        };
        body.render(rows[0], buf);

        if footer_height == 1 {
            Paragraph::new(Line::from(vec![
                Span::styled(" Enter ", Style::default().bg(BLUE).fg(Color::Black)),
                Span::styled(" send", Style::default().fg(TEXT_MUTED)),
                Span::raw("  "),
                Span::styled("/", Style::default().fg(CYAN)),
                Span::styled(" commands", Style::default().fg(TEXT_MUTED)),
            ]))
            .render(rows[1], buf);
        }
    }
}

pub struct CommandPaletteWidget {
    pub commands: Vec<crate::tui::commands::SlashCommand>,
    pub selected_index: usize,
}

impl Widget for CommandPaletteWidget {
    fn render(self, area: Rect, buf: &mut Buffer) {
        fill_area(buf, area, PANEL_BG);
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(CYAN))
            .title(Span::styled(
                " QUICK ACTIONS ",
                Style::default()
                    .fg(TEXT_PRIMARY)
                    .add_modifier(Modifier::BOLD),
            ));
        let inner = block.inner(area);
        block.render(area, buf);

        let lines: Vec<Line> = self
            .commands
            .iter()
            .enumerate()
            .map(|(index, cmd)| {
                let selected = index == self.selected_index;
                let cmd_style = if selected {
                    Style::default()
                        .bg(BLUE)
                        .fg(Color::Black)
                        .add_modifier(Modifier::BOLD)
                } else {
                    Style::default().fg(TEXT_MUTED)
                };
                Line::from(vec![
                    Span::styled(format!(" {:<10} ", cmd), cmd_style),
                    Span::raw(" "),
                    Span::styled(cmd.description(), Style::default().fg(TEXT_MUTED)),
                ])
            })
            .collect();

        Paragraph::new(lines).render(inner, buf);
    }
}

pub struct SelectionModalWidget<'a> {
    pub title: &'a str,
    pub items: Vec<String>,
    pub details: Vec<String>,
    pub selected_index: usize,
}

impl<'a> Widget for SelectionModalWidget<'a> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        fill_area(buf, area, PANEL_BG);
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(CYAN))
            .title(Span::styled(
                format!(" {} ", self.title),
                Style::default()
                    .fg(TEXT_PRIMARY)
                    .add_modifier(Modifier::BOLD),
            ));
        let inner = block.inner(area);
        block.render(area, buf);

        if inner.height == 0 || self.items.is_empty() {
            return;
        }

        let selected_detail = self
            .details
            .get(self.selected_index)
            .filter(|detail| !detail.trim().is_empty())
            .cloned();
        let footer_rows = usize::from(selected_detail.is_some() && inner.height > 2);
        let indicator_rows = usize::from(
            self.items.len() as u16 > inner.height.saturating_sub(footer_rows as u16 + 1),
        ) * 2;
        let visible_rows = inner
            .height
            .saturating_sub((footer_rows + indicator_rows) as u16)
            .max(1) as usize;
        let start = self
            .selected_index
            .saturating_sub(visible_rows / 2)
            .min(self.items.len().saturating_sub(visible_rows));
        let end = (start + visible_rows).min(self.items.len());

        let mut lines = Vec::new();
        if start > 0 {
            lines.push(Line::from(Span::styled(
                "↑ more",
                Style::default().fg(TEXT_MUTED),
            )));
        }

        for (index, item) in self.items[start..end].iter().enumerate() {
            let item_index = start + index;
            let style = if item_index == self.selected_index {
                Style::default()
                    .bg(BLUE)
                    .fg(Color::Black)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(TEXT_MUTED)
            };
            lines.push(Line::from(Span::styled(format!("  {}  ", item), style)));
        }

        if end < self.items.len() {
            lines.push(Line::from(Span::styled(
                "↓ more",
                Style::default().fg(TEXT_MUTED),
            )));
        }

        if let Some(detail) = selected_detail {
            lines.push(Line::from(Span::styled(
                format!(" {}", detail),
                Style::default().fg(TEXT_MUTED),
            )));
        }

        Paragraph::new(lines).render(inner, buf);
    }
}

fn visible_tail(content: &str, width: usize, height: usize) -> String {
    if width == 0 || height == 0 {
        return String::new();
    }

    let mut rows = Vec::new();
    for line in content.lines() {
        if line.is_empty() {
            rows.push(String::new());
            continue;
        }

        let mut current = String::new();
        for word in line.split_whitespace() {
            let next_len = if current.is_empty() {
                word.chars().count()
            } else {
                current.chars().count() + 1 + word.chars().count()
            };

            if next_len > width && !current.is_empty() {
                rows.push(current);
                current = truncate_text(word, width);
            } else if word.chars().count() > width {
                if !current.is_empty() {
                    rows.push(current);
                    current = String::new();
                }
                rows.push(truncate_text(word, width));
            } else {
                if !current.is_empty() {
                    current.push(' ');
                }
                current.push_str(word);
            }
        }

        if !current.is_empty() {
            rows.push(current);
        } else if rows.is_empty() {
            rows.push(String::new());
        }
    }

    if rows.is_empty() {
        rows.push(String::new());
    }

    rows.into_iter()
        .rev()
        .take(height)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\n")
}

fn truncate_text(value: &str, width: usize) -> String {
    value.chars().take(width).collect()
}

fn fill_area(buf: &mut Buffer, area: Rect, bg: Color) {
    for y in area.top()..area.bottom() {
        for x in area.left()..area.right() {
            buf[(x, y)].set_style(Style::default().bg(bg));
            buf[(x, y)].set_char(' ');
        }
    }
}
