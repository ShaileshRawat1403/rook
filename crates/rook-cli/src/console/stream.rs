use crate::console::style::{dim, info};
use std::collections::VecDeque;
use std::time::Instant;

#[derive(Debug, Clone)]
struct QueuedLine {
    content: String,
    enqueued_at: Instant,
}

pub struct StreamState {
    buffer: String,
    queued_lines: VecDeque<QueuedLine>,
    #[allow(dead_code)]
    width: Option<usize>,
}

impl StreamState {
    pub fn new(width: Option<usize>) -> Self {
        Self {
            buffer: String::new(),
            queued_lines: VecDeque::new(),
            width,
        }
    }

    pub fn clear(&mut self) {
        self.buffer.clear();
        self.queued_lines.clear();
    }

    pub fn push(&mut self, chunk: &str) {
        self.buffer.push_str(chunk);
        self.commit_complete_lines();
    }

    fn commit_complete_lines(&mut self) {
        let source = self.buffer.clone();
        let Some(last_newline_idx) = source.rfind('\n') else {
            return;
        };

        let Some(committed) = source.get(..=last_newline_idx) else {
            return;
        };
        let lines: Vec<&str> = committed.lines().collect();

        if lines.is_empty() {
            return;
        }

        let now = Instant::now();
        for line in lines {
            self.queued_lines.push_back(QueuedLine {
                content: line.to_string(),
                enqueued_at: now,
            });
        }

        if let Some(rest) = source.get(last_newline_idx + 1..) {
            self.buffer = rest.to_string();
        } else {
            self.buffer.clear();
        }
    }

    pub fn step(&mut self) -> Option<String> {
        self.queued_lines.pop_front().map(|q| q.content)
    }

    pub fn drain_n(&mut self, max_lines: usize) -> Vec<String> {
        let end = max_lines.min(self.queued_lines.len());
        self.queued_lines.drain(..end).map(|q| q.content).collect()
    }

    pub fn drain_all(&mut self) -> Vec<String> {
        self.queued_lines.drain(..).map(|q| q.content).collect()
    }

    pub fn is_idle(&self) -> bool {
        self.queued_lines.is_empty()
    }

    pub fn queued_len(&self) -> usize {
        self.queued_lines.len()
    }

    pub fn oldest_queued_age(&self, now: Instant) -> Option<std::time::Duration> {
        self.queued_lines
            .front()
            .map(|q| now.saturating_duration_since(q.enqueued_at))
    }

    pub fn finalize(&mut self) -> Vec<String> {
        if !self.buffer.is_empty() {
            let now = Instant::now();
            for line in self.buffer.lines() {
                self.queued_lines.push_back(QueuedLine {
                    content: line.to_string(),
                    enqueued_at: now,
                });
            }
            self.buffer.clear();
        }
        self.drain_all()
    }

    pub fn buffered_content(&self) -> &str {
        &self.buffer
    }
}

pub fn render_lines(lines: &[String]) {
    for line in lines {
        println!("{}", line);
    }
}

pub fn render_stream_state(state: &mut StreamState) {
    while let Some(line) = state.step() {
        println!("{}", line);
    }
}

pub fn format_stream_header(provider: &str, model: &str) -> String {
    format!(
        "{}  {}",
        info("Rook"),
        dim(format!("{} · {}", provider, model))
    )
}

pub fn format_stream_status(status: &str) -> String {
    match status {
        "thinking" => format!("{} Thinking...", dim("●")),
        "planning" => format!("{} Planning", info("◉")),
        "executing" => format!("{} Executing", info("▸")),
        "waiting" => format!("{} Waiting", dim("○")),
        _ => status.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_newline_gated_streaming() {
        let mut state = StreamState::new(None);
        state.push("Hello");
        assert!(state.is_idle());
        assert!(state.step().is_none());

        state.push(", world!\n");
        assert!(!state.is_idle());
        assert_eq!(state.step(), Some("Hello, world!".to_string()));
        assert!(state.is_idle());
    }

    #[test]
    fn test_finalize_commits_partial() {
        let mut state = StreamState::new(None);
        state.push("Partial line without newline");
        assert!(state.is_idle());

        let remaining = state.finalize();
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0], "Partial line without newline");
    }

    #[test]
    fn test_drain_n() {
        let mut state = StreamState::new(None);
        state.push("Line 1\nLine 2\nLine 3\n");

        let batch = state.drain_n(2);
        assert_eq!(batch.len(), 2);
        assert_eq!(state.queued_len(), 1);
    }
}
