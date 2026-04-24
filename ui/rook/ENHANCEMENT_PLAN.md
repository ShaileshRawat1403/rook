# Rook Tauri Enhancement Plan

## Goal
Make the Tauri version an **enhanced version** of the Electron app, leveraging Tauri's native capabilities while preserving all Electron features.

---

## Phase 1: Core Infrastructure ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Single instance protection | ✅ Done | `tauri-plugin-single-instance` |
| Basic window | ✅ Done | Overlay titlebar, hidden title |
| Window state persistence | ✅ Done | `tauri-plugin-window-state` |
| Logging | ✅ Done | `tauri-plugin-log` |

### Still Needed:
- [ ] **System Tray** - Menu with Show/Hide, Quit
- [ ] **Deep Links** - `rook://` protocol handling
- [ ] **Global Shortcuts** - Cmd+, Cmd+B, etc.

---

## Phase 2: Window Management Enhancement

### Current State
- Minimal window config with overlay titlebar
- Traffic light position set

### Enhancement Plan
```json
{
  "window": {
    "minWidth": 600,
    "minHeight": 400,
    "maxWidth": 9999,
    "maxHeight": 9999,
    "resizable": true,
    "fullscreen": false,
    "focus": true,
    "visible": true
  }
}
```

### Zoom Feature
- Implement Ctrl/Cmd + +/- zoom (0.7 to 1.3 range)
- Persist to localStorage
- Use Tauri's `WebviewWindow::set_zoom_level()`

### Keyboard Shortcuts
Add global shortcuts via `tauri-plugin-global-shortcut`:
- `Cmd+,` - Open settings
- `Cmd+B` - Toggle sidebar
- `Cmd+W` - Close current tab
- `Cmd+N` - New conversation
- `Cmd+K` - Focus sidebar search

---

## Phase 3: System Tray

### Tray Menu Items
1. **Show/Hide Rook** - Toggle window visibility
2. **---separator---**
3. **Quit Rook** - Exit application

### Tray Icon
- Use existing app icons
- Template icon for macOS

### Implementation
```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
};

fn setup_tray(app: &App) -> Result<TrayIcon, Error> {
    let show_hide = MenuItem::with_id(app, "show_hide", "Show/Hide Rook", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Rook", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_hide, &quit])?;
    
    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_hide" => { /* toggle window */ },
            "quit" => { app.exit(0); },
            _ => {}
        })
        .build(app)
}
```

---

## Phase 4: Deep Links

### Protocol
- `rook://` custom URL scheme

### URL Patterns
- `rook://chat` - Open chat view
- `rook://chat?project=<id>` - Open chat with project
- `rook://settings` - Open settings
- `rook://agents` - Open agents view

### Implementation
```rust
// Already have single-instance handling - add deep link parsing
.plugin(
    tauri_plugin_single_instance::init(|app, argv, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
        if argv.len() > 1 {
            let url = &argv[1];
            if url.starts_with("rook://") {
                let _ = app.emit("deep-link", url);
            }
        }
    }),
)
```

### Capabilities Needed
```json
{
  "permissions": ["core:event:default", "core:event:allow-emit", "core:event:allow-listen"]
}
```

---

## Phase 5: Native Integrations

### Currently Working
- ✅ Notifications via `tauri-plugin-notification`
- ✅ File dialogs via `tauri-plugin-dialog`
- ✅ Shell commands via `tauri-plugin-shell`
- ✅ Path resolution via Rust commands

### Enhancement: Notification Actions
Add click handlers for notifications:
- Click to focus app window
- Actions for approval notifications

---

## Phase 6: UI/UX Enhancements

### Animations to Verify/Enhance
| Animation | Current | Target |
|-----------|---------|--------|
| Chat message fade-in | ✅ | Staggered reveal |
| Sidebar collapse | ✅ | Smooth 300ms transition |
| Context panel slide | ✅ | Width + opacity |
| Loading shimmer | ✅ | 0.35s delay, 3s duration |
| Scroll fade | ✅ | 1200ms timeout |

### Scroll Enhancement
- Near-bottom detection for auto-scroll
- Smooth scroll animations
- Scroll target highlighting

### Sidebar Resize
- Snap-collapse at 100px threshold
- Min 180px, Max 380px, Default 240px
- Draggable resize handle

---

## Phase 7: Provider System Verification

### Providers to Test
1. **Anthropic** - API key + Claude models
2. **OpenAI** - API key + GPT models
3. **Google** - API key + Gemini models
4. **Ollama** - Local models
5. **LM Studio** - Local models
6. **Groq** - API key
7. **OpenRouter** - API key

### Verification Steps
1. Check provider config is saved
2. Test API connectivity
3. Verify model list loads
4. Test chat completion

---

## Phase 8: ACP Connection

### WebSocket Connection
- Connect to `rook serve` WebSocket
- Handle reconnection
- Stream message chunks
- Token tracking

### Session Management
- Load session history
- Create new sessions
- Persist sessions

---

## Phase 9: i18n Enhancement

### Missing Files
- [ ] `src/shared/i18n/locales/en/status.json`
- [ ] `src/shared/i18n/locales/es/status.json`

### Copy from Old App
```bash
cp /tmp/rook-old/ui/rook/src/shared/i18n/locales/en/status.json \
   ui/rook/src/shared/i18n/locales/en/status.json
```

---

## Phase 10: Polish

### Theming
- Light/dark/system preference ✅
- Accent color picker ✅
- Density selector (compact/comfortable/spacious) ✅

### Keyboard Shortcuts
- Implement Cmd+, Cmd+B, Cmd+N, Cmd+K
- Use `useHotkeys` or custom hook

### Performance
- Startup performance logging
- Lazy loading
- Parallel data loading

---

## Implementation Order

```
1. System Tray (critical UX)
2. Window zoom feature
3. Keyboard shortcuts
4. Deep link handling
5. i18n status files
6. Provider verification
7. ACP connection test
8. Animation polish
```

---

## Testing Checklist

- [ ] Single instance - launch twice, only one window
- [ ] System tray - menu works, show/hide works
- [ ] Deep links - `rook://chat` opens app
- [ ] Notifications - appear and are clickable
- [ ] Zoom - Ctrl/Cmd +/- works
- [ ] Keyboard shortcuts - all work
- [ ] Providers - each provider connects
- [ ] Chat - send/receive messages
- [ ] Animations - smooth and performant
- [ ] Window state - position/size restored