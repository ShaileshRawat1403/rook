use console::{Color, Style};

pub fn success(msg: impl AsRef<str>) -> String {
    Style::new()
        .fg(Color::Green)
        .apply_to(msg.as_ref())
        .to_string()
}

pub fn error(msg: impl AsRef<str>) -> String {
    Style::new()
        .fg(Color::Red)
        .apply_to(msg.as_ref())
        .to_string()
}

pub fn warning(msg: impl AsRef<str>) -> String {
    Style::new()
        .fg(Color::Yellow)
        .apply_to(msg.as_ref())
        .to_string()
}

pub fn info(msg: impl AsRef<str>) -> String {
    Style::new()
        .fg(Color::Cyan)
        .apply_to(msg.as_ref())
        .to_string()
}

pub fn dim(msg: impl AsRef<str>) -> String {
    Style::new().dim().apply_to(msg.as_ref()).to_string()
}

pub fn bold(msg: impl AsRef<str>) -> String {
    Style::new().bold().apply_to(msg.as_ref()).to_string()
}

pub fn italic(msg: impl AsRef<str>) -> String {
    Style::new().italic().apply_to(msg.as_ref()).to_string()
}

pub fn code(msg: impl AsRef<str>) -> String {
    Style::new()
        .fg(Color::Blue)
        .apply_to(msg.as_ref())
        .to_string()
}

pub fn highlight(msg: impl AsRef<str>) -> String {
    Style::new()
        .fg(Color::Green)
        .bold()
        .apply_to(msg.as_ref())
        .to_string()
}

pub fn secondary(msg: impl AsRef<str>) -> String {
    Style::new().dim().apply_to(msg.as_ref()).to_string()
}

pub fn badge(msg: impl AsRef<str>, color: Color) -> String {
    Style::new()
        .fg(color)
        .bold()
        .apply_to(msg.as_ref())
        .to_string()
}

pub fn eprint_success(msg: impl AsRef<str>) {
    eprintln!("{}", success(msg));
}

pub fn eprint_error(msg: impl AsRef<str>) {
    eprintln!("{}", error(msg));
}

pub fn eprint_warning(msg: impl AsRef<str>) {
    eprintln!("{}", warning(msg));
}

pub fn eprint_info(msg: impl AsRef<str>) {
    eprintln!("{}", info(msg));
}
