use std::path::Path;
use crate::utils::{patch_core_file, patch_dsh, PatchOutcome};
const TARGET: &str = "node_modules/@deepseek-ai/dsh-client-locale/lib/client.js";
const ANCHOR: &str = "\t\t\ttranslate(ns, key, params) {";
const TEMPLATE: &str = "const template = this.lookup(ns, key, chain) ?? (ns !== \"common\" ? this.lookup(\"common\", key, chain) : void 0) ?? key;";
const METHODS: &str = "\t\t\taddTranslationFallback(resolver) {\n\t\t\t\tconst owner = resolver;\n\t\t\t\tthis.ariTranslationFallback = owner;\n\t\t\t\tthis.refreshTranslations();\n\t\t\t\treturn () => {\n\t\t\t\t\tif (this.ariTranslationFallback !== owner) return;\n\t\t\t\t\tthis.ariTranslationFallback = undefined;\n\t\t\t\t\tthis.refreshTranslations();\n\t\t\t\t};\n\t\t\t}\n\t\t\trefreshTranslations() {\n\t\t\t\tthis.publish(this.snapshot.active, false);\n\t\t\t}\n";
const RESOLUTION: &str = "let template = this.lookup(ns, key, chain) ?? (ns !== \"common\" ? this.lookup(\"common\", key, chain) : void 0) ?? key;\n\t\t\t\tif (this.snapshot.active.toLowerCase() === \"es-es\" && this.ariTranslationFallback && this.lookup(ns, key, [\"es-ES\"]) === undefined && this.lookup(\"common\", key, [\"es-ES\"]) === undefined) {\n\t\t\t\t\ttry { template = this.ariTranslationFallback(ns, key, template); } catch {}\n\t\t\t\t}";
fn patch_source(source: &str) -> PatchOutcome {
    if source.contains("addTranslationFallback(resolver)") { return PatchOutcome::AlreadyPatched; }
    if source.matches(ANCHOR).count() != 1 || source.matches(TEMPLATE).count() != 1 { return PatchOutcome::AnchorMissing; }
    PatchOutcome::Patched(source.replacen(ANCHOR, &(METHODS.to_string() + ANCHOR), 1).replacen(TEMPLATE, RESOLUTION, 1))
}
pub fn apply_at(core_dir: &Path) -> Result<(), String> { patch_core_file(core_dir, TARGET, patch_source) }
pub fn apply(app: &tauri::AppHandle) -> Result<(), String> { patch_dsh(app, TARGET, patch_source) }
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn native_fallback_is_idempotent() {
        let source = format!("{ANCHOR}\n{TEMPLATE}");
        let PatchOutcome::Patched(patched) = patch_source(&source) else { panic!("missing patch"); };
        assert!(patched.contains("addTranslationFallback(resolver)"));
        assert!(patched.contains("try { template = this.ariTranslationFallback"));
        assert_eq!(patch_source(&patched), PatchOutcome::AlreadyPatched);
    }
    #[test]
    fn changed_upstream_is_left_untouched() {
        assert_eq!(patch_source("translate changed upstream"), PatchOutcome::AnchorMissing);
    }
}
