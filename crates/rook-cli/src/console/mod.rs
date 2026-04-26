pub mod progress;
pub mod style;
pub mod summary;
pub mod table;

pub use progress::{progress_bar, simple_spinner, Spinners};
pub use style::{
    badge, bold, code, dim, eprint_error, eprint_info, eprint_success, eprint_warning, error,
    highlight, info, italic, secondary, success, warning,
};
pub use summary::{format_elapsed, SessionSummary};
pub use table::{
    add_row, create_table, format_key_value, format_key_value_bullet, format_row_separator,
    format_section, format_section_end, render_table,
};
