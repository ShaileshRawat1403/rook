use indicatif::{MultiProgress, ProgressBar, ProgressStyle};
use std::borrow::Cow;
use std::collections::HashMap;
use std::time::Duration;

pub struct Spinners {
    bars: HashMap<String, ProgressBar>,
    #[allow(dead_code)]
    multi: MultiProgress,
}

impl Spinners {
    pub fn new() -> Self {
        Self {
            bars: HashMap::new(),
            multi: MultiProgress::new(),
        }
    }

    pub fn add(&mut self, key: &str, message: impl Into<Cow<'static, str>>) {
        let pb = ProgressBar::new_spinner();
        pb.set_style(
            ProgressStyle::default_spinner()
                .template("{spinner:.cyan} {msg}")
                .unwrap()
                .tick_chars("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"),
        );
        pb.set_message(message);
        pb.enable_steady_tick(Duration::from_millis(100));
        self.bars.insert(key.to_string(), pb);
    }

    pub fn update(&self, key: &str, message: impl Into<Cow<'static, str>>) {
        if let Some(pb) = self.bars.get(key) {
            pb.set_message(message);
        }
    }

    pub fn complete(&self, key: &str, message: impl Into<Cow<'static, str>>) {
        if let Some(pb) = self.bars.get(key) {
            pb.finish_with_message(message);
        }
    }

    pub fn remove(&mut self, key: &str) {
        if let Some(pb) = self.bars.remove(key) {
            pb.finish_and_clear();
        }
    }

    pub fn clear(&mut self) {
        for (_, pb) in self.bars.drain() {
            pb.finish_and_clear();
        }
    }
}

impl Default for Spinners {
    fn default() -> Self {
        Self::new()
    }
}

pub fn simple_spinner(message: impl Into<Cow<'static, str>>) -> ProgressBar {
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .template("{spinner:.cyan} {msg}")
            .unwrap()
            .tick_chars("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"),
    );
    pb.set_message(message);
    pb.enable_steady_tick(Duration::from_millis(100));
    pb
}

pub fn progress_bar(total: u64, message: impl Into<Cow<'static, str>>) -> ProgressBar {
    let pb = ProgressBar::new(total);
    pb.set_style(
        ProgressStyle::default_bar()
            .template("{spinner:.cyan} [{bar:40.cyan/dim}] {pos}/{len} {msg}")
            .unwrap()
            .progress_chars("━●"),
    );
    pb.set_message(message);
    pb
}
