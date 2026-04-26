use comfy_table::{presets, Cell, CellAlignment, ContentArrangement, Table};
use console::Style;

pub fn create_table(headers: Vec<&str>) -> Table {
    let mut table = Table::new();
    table.set_content_arrangement(ContentArrangement::Dynamic);
    table.load_preset(presets::ASCII_MARKDOWN);
    table.set_header(
        headers
            .into_iter()
            .map(|h| {
                Cell::new(h)
                    .set_alignment(CellAlignment::Center)
                    .add_attribute(comfy_table::Attribute::Bold)
            })
            .collect::<Vec<_>>(),
    );
    table
}

pub fn add_row(table: &mut Table, cells: Vec<String>) {
    let row_cells: Vec<Cell> = cells.into_iter().map(Cell::new).collect();
    table.add_row(row_cells);
}

pub fn render_table(table: &Table) -> String {
    table.to_string()
}

pub fn format_key_value(key: &str, value: &str) -> String {
    format!(
        "  {}  {}",
        Style::new().dim().apply_to(format!("{}:", key)),
        value
    )
}

pub fn format_key_value_bullet(key: &str, value: &str) -> String {
    format!(
        "  {}  {}  {}",
        Style::new().dim().apply_to("▸"),
        Style::new().cyan().bold().apply_to(key),
        Style::new().dim().apply_to(format!("→ {}", value))
    )
}

pub fn format_section(title: &str) -> String {
    format!(
        "\n{}{}{}\n",
        Style::new().dim().apply_to("╭─ "),
        Style::new().bold().apply_to(title),
        Style::new().dim().apply_to(" ─")
    )
}

pub fn format_section_end() -> String {
    format!(
        "{}\n",
        Style::new()
            .dim()
            .apply_to("╰────────────────────────────────────")
    )
}

pub fn format_row_separator() -> String {
    Style::new().dim().apply_to("│").to_string()
}
