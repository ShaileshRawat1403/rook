use ratatui::{
    buffer::Buffer,
    layout::Rect,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, BorderType, Borders, Paragraph, Widget},
};
use crate::tui::state::{ApprovalRequest, TEXT_PRIMARY, TEXT_MUTED, CYAN, YELLOW};

pub struct ApprovalOverlayWidget<'a> {
    pub request: &'a ApprovalRequest,
}

impl<'a> Widget for ApprovalOverlayWidget<'a> {
    fn render(self, area: Rect, buf: &mut Buffer) {
        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(BorderType::Rounded)
            .border_style(Style::default().fg(YELLOW))
            .title(Span::styled(
                " GOVERNANCE INTERVENTION ",
                Style::default()
                    .fg(TEXT_PRIMARY)
                    .add_modifier(Modifier::BOLD),
            ));

        let inner = block.inner(area);
        block.render(area, buf);

        let lines = vec![
            Line::from(vec![
                Span::styled("Action required for tool: ", Style::default().fg(TEXT_MUTED)),
                Span::styled(&self.request.tool_name, Style::default().fg(CYAN).add_modifier(Modifier::BOLD)),
            ]),
            Line::from(vec![
                Span::styled("Risk level: ", Style::default().fg(TEXT_MUTED)),
                Span::styled(self.request.risk_level.to_string(), Style::default().fg(YELLOW)),
            ]),
            Line::from(""),
            Line::from(vec![
                Span::styled("Command: ", Style::default().fg(TEXT_MUTED)),
                Span::styled(self.request.command.as_deref().unwrap_or("N/A"), Style::default().fg(TEXT_PRIMARY)),
            ]),
            Line::from(vec![
                Span::styled("File path: ", Style::default().fg(TEXT_MUTED)),
                Span::styled(self.request.file_path.as_deref().unwrap_or("N/A"), Style::default().fg(TEXT_PRIMARY)),
            ]),
            Line::from(""),
            Line::from(vec![
                Span::styled(" [A] Approve ", Style::default().bg(Color::Green).fg(Color::Black)),
                Span::raw("  "),
                Span::styled(" [R] Reject ", Style::default().bg(Color::Red).fg(Color::Black)),
            ]),
        ];

        Paragraph::new(lines).render(inner, buf);
    }
}
