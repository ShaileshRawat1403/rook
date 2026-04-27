pub mod progress;
pub mod stream;
pub mod style;
pub mod summary;
pub mod table;
pub mod tool;

pub use progress::{progress_bar, simple_spinner, Spinners};
pub use stream::{
    format_stream_header, format_stream_status, format_stream_status_short, render_lines,
    render_stream_state, StreamState,
};
pub use style::{
    badge, bold, code, dim, eprint_error, eprint_info, eprint_success, eprint_warning, error,
    highlight, info, italic, secondary, success, warning,
};
pub use summary::{format_elapsed, SessionSummary};
pub use table::{
    add_row, create_table, format_key_value, format_key_value_bullet, format_row_separator,
    format_section, format_section_end, render_table,
};
pub use tool::{
    format_command_output, format_duration_ms, pretty_tool_name, render_error_detailed, render_exit_code,
    render_file_operation, render_mcp_tool_call, render_mcp_tool_result, render_shell_command,
    render_signal, render_tool_approval, render_tool_error, render_tool_header,
    render_tool_output_block, render_tool_progress, render_tool_running, render_tool_start,
    render_tool_success, render_tool_waiting, ToolState,
};