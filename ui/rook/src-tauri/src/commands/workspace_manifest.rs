use std::fs;
use std::path::Path;

const MAX_MANIFEST_BYTES: u64 = 1024 * 1024;
const MANIFEST_WHITELIST: &[&str] = &[
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "Makefile",
];

fn read_workspace_manifest_inner(
    workspace_path: &Path,
    manifest_name: &str,
) -> Result<Option<String>, String> {
    if !MANIFEST_WHITELIST.contains(&manifest_name) {
        return Err(format!("Manifest '{}' is not allowed", manifest_name));
    }

    if manifest_name.contains('/')
        || manifest_name.contains('\\')
        || manifest_name.contains("..")
    {
        return Err(format!("Manifest '{}' is not allowed", manifest_name));
    }

    let canonical_root = match workspace_path.canonicalize() {
        Ok(canonical) => canonical,
        Err(_) => return Ok(None),
    };

    let candidate = canonical_root.join(manifest_name);
    let canonical_candidate = match candidate.canonicalize() {
        Ok(canonical) => canonical,
        Err(_) => return Ok(None),
    };

    if !canonical_candidate.starts_with(&canonical_root) {
        return Err(format!(
            "Manifest '{}' resolves outside the workspace",
            manifest_name
        ));
    }

    let metadata = fs::metadata(&canonical_candidate)
        .map_err(|error| format!("Failed to inspect manifest: {}", error))?;
    if !metadata.is_file() {
        return Ok(None);
    }
    if metadata.len() > MAX_MANIFEST_BYTES {
        return Err(format!(
            "Manifest '{}' exceeds the {} KB limit",
            manifest_name,
            MAX_MANIFEST_BYTES / 1024
        ));
    }

    fs::read_to_string(&canonical_candidate)
        .map(Some)
        .map_err(|error| format!("Failed to read manifest: {}", error))
}

#[tauri::command]
pub fn read_workspace_manifest(
    workspace_path: String,
    manifest_name: String,
) -> Result<Option<String>, String> {
    read_workspace_manifest_inner(Path::new(&workspace_path), &manifest_name)
}

#[cfg(test)]
mod tests {
    use super::{read_workspace_manifest_inner, MAX_MANIFEST_BYTES};
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn reads_a_whitelisted_manifest() {
        let dir = tempdir().expect("tempdir");
        let manifest = dir.path().join("package.json");
        fs::write(&manifest, "{\"name\":\"demo\"}").expect("manifest");

        let contents = read_workspace_manifest_inner(dir.path(), "package.json")
            .expect("ok")
            .expect("contents");

        assert_eq!(contents, "{\"name\":\"demo\"}");
    }

    #[test]
    fn returns_none_when_manifest_is_missing() {
        let dir = tempdir().expect("tempdir");
        let result = read_workspace_manifest_inner(dir.path(), "package.json").expect("ok");
        assert_eq!(result, None);
    }

    #[test]
    fn rejects_non_whitelisted_manifests() {
        let dir = tempdir().expect("tempdir");
        let error = read_workspace_manifest_inner(dir.path(), ".env")
            .expect_err("non-whitelisted name");
        assert!(error.contains("not allowed"));
    }

    #[test]
    fn rejects_path_traversal_in_manifest_name() {
        let dir = tempdir().expect("tempdir");
        let error = read_workspace_manifest_inner(dir.path(), "../package.json")
            .expect_err("traversal");
        assert!(error.contains("not allowed"));
    }

    #[test]
    fn rejects_oversized_manifests() {
        let dir = tempdir().expect("tempdir");
        let manifest = dir.path().join("package.json");
        fs::write(&manifest, vec![b'a'; (MAX_MANIFEST_BYTES as usize) + 1]).expect("manifest");

        let error = read_workspace_manifest_inner(dir.path(), "package.json")
            .expect_err("size limit");
        assert!(error.contains("exceeds"));
    }

    #[test]
    #[cfg(unix)]
    fn rejects_manifest_paths_that_resolve_outside_the_workspace() {
        use std::os::unix::fs::symlink;
        let outside = tempdir().expect("outside");
        let secret = outside.path().join("secret.json");
        fs::write(&secret, "secret").expect("secret");

        let inside = tempdir().expect("inside");
        symlink(&secret, inside.path().join("package.json")).expect("symlink");

        let error = read_workspace_manifest_inner(inside.path(), "package.json")
            .expect_err("escape");
        assert!(error.contains("outside the workspace"));
    }
}
