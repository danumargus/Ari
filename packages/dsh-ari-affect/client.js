window.__ModuleLoader__.load({
  id: "dsh-ari-affect",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");
    var h = react.createElement;
    var NS = "ariAffect";
    var inject = ["slots", "locale", "configForms"];
    var CSS = ".__aa_root{width:100%;max-width:720px;display:flex;flex-direction:column;gap:14px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55}" +
      ".__aa_intro{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px}" +
      ".__aa_grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}" +
      ".__aa_field{display:flex;flex-direction:column;gap:6px}" +
      ".__aa_label{font-size:13px;font-weight:600}" +
      ".__aa_hint{font-size:11px;color:var(--dsw-alias-label-tertiary)}" +
      ".__aa_input{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;font:inherit;padding:8px 10px}" +
      ".__aa_toggle{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px}" +
      ".__aa_toggle input{width:34px;height:18px;accent-color:var(--dsw-alias-state-business-primary);flex:none}" +
      ".__aa_actions{display:flex;align-items:center;gap:10px;padding-top:4px}" +
      ".__aa_btn{border:1px solid var(--dsw-alias-state-business-primary,#3964fe);border-radius:8px;background:var(--dsw-alias-state-business-primary,#3964fe);color:#fff;padding:7px 14px;font:inherit;cursor:pointer}" +
      ".__aa_btn:disabled{opacity:.5;cursor:default}" +
      ".__aa_status{font-size:12px;color:var(--dsw-alias-label-tertiary)}" +
      ".__aa_error{font-size:12px;color:var(--dsw-alias-state-error-primary,#f85149)}" +
      "@media(max-width:620px){.__aa_grid{grid-template-columns:1fr}}";
    var tagId = "dsh-ari-affect/main.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-ari-affect";
      tag.dataset.pluginCss = tagId;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }
    var es = {
      intro: "Estado afectivo interno y observacional. No representa hechos sobre el usuario. La inyección al contexto está desactivada por defecto.",
      enabled: "Estado afectivo activo",
      enabledHint: "Actualiza telemetría suave a partir de interacción y resultados de herramientas.",
      sensitivity: "Sensibilidad",
      sensitivityHint: "Multiplica la intensidad de los cambios. Rango recomendado 0-3.",
      decay: "Decaimiento",
      decayHint: "Velocidad de retorno al estado base. Rango 0-0,25.",
      inject: "Inyectar estado al contexto",
      injectHint: "Añade una línea compacta ari:affect al prompt. Mantener apagado salvo que quieras que influya en el estilo.",
      order: "Orden en el prompt",
      orderHint: "Posición de ari:affect cuando la inyección está activa.",
      save: "Guardar afecto",
      saved: "Guardado",
      saving: "Guardando…",
      loading: "Cargando…",
      unavailable: "La configuración de Affect no está disponible.",
      invalid: "Revisa los valores: sensibilidad 0-3, decaimiento 0-0,25 y orden numérico.",
      error: "No se pudo guardar"
    };
    var en = {
      intro: "Internal observational affect state. It is not a claim about the user. Prompt injection is off by default.",
      enabled: "Affect state enabled",
      enabledHint: "Updates soft telemetry from interaction and tool outcomes.",
      sensitivity: "Sensitivity",
      sensitivityHint: "Multiplies state changes. Recommended range 0-3.",
      decay: "Decay",
      decayHint: "Return speed toward baseline. Range 0-0.25.",
      inject: "Inject state into context",
      injectHint: "Adds one compact ari:affect prompt line. Keep off unless you want affect to influence style.",
      order: "Prompt order",
      orderHint: "Position of ari:affect when injection is enabled.",
      save: "Save affect",
      saved: "Saved",
      saving: "Saving…",
      loading: "Loading…",
      unavailable: "Affect configuration is unavailable.",
      invalid: "Check values: sensitivity 0-3, decay 0-0.25, and numeric order.",
      error: "Could not save"
    };
    function Section(props) {
      var t = props.t;
      var scope = props.scope;
      var pair = react.useState(function () { return scope.getSnapshot(); });
      var snapshot = pair[0], setSnapshot = pair[1];
      var ready = snapshot.status === "ready" && snapshot.value !== void 0;
      var draftPair = react.useState(null);
      var draft = draftPair[0], setDraft = draftPair[1];
      var busyPair = react.useState(false);
      var busy = busyPair[0], setBusy = busyPair[1];
      var messagePair = react.useState("");
      var message = messagePair[0], setMessage = messagePair[1];
      var errorPair = react.useState("");
      var error = errorPair[0], setError = errorPair[1];
      react.useEffect(function () {
        var alive = true;
        var sync = function () { if (alive) setSnapshot(scope.getSnapshot()); };
        var un = typeof scope.subscribe === "function" ? scope.subscribe(sync) : null;
        return function () { alive = false; if (un) un(); };
      }, [scope]);
      if (snapshot.status === "unavailable") return h("p", { className: "__aa_error" }, t("unavailable"));
      if (!ready) return h("p", { className: "__aa_status" }, t("loading"));
      var value = snapshot.value || {};
      var current = draft || {
        enabled: value.enabled !== false,
        sensitivity: String(value.sensitivity ?? 1),
        decay: String(value.decay ?? 0.02),
        inject: value.inject === true,
        order: String(value.order ?? 0.25)
      };
      function change(patch) { setDraft(Object.assign({}, current, patch)); setMessage(""); setError(""); }
      function field(label, hint, key, attrs) {
        return h("label", { className: "__aa_field" },
          h("span", { className: "__aa_label" }, t(label)),
          h("span", { className: "__aa_hint" }, t(hint)),
          h("input", Object.assign({ className: "__aa_input", type: "number", value: current[key], onChange: function (e) { var p = {}; p[key] = e.target.value; change(p); } }, attrs || {}))
        );
      }
      function toggle(label, hint, key) {
        return h("label", { className: "__aa_toggle" },
          h("span", null, h("span", { className: "__aa_label", style: { display: "block" } }, t(label)), h("span", { className: "__aa_hint" }, t(hint))),
          h("input", { type: "checkbox", checked: Boolean(current[key]), onChange: function (e) { var p = {}; p[key] = e.target.checked; change(p); } })
        );
      }
      function save() {
        var sensitivity = Number(current.sensitivity), decay = Number(current.decay), order = Number(current.order);
        if (!Number.isFinite(sensitivity) || sensitivity < 0 || sensitivity > 3 || !Number.isFinite(decay) || decay < 0 || decay > 0.25 || !Number.isFinite(order)) { setError(t("invalid")); return; }
        var next = { enabled: Boolean(current.enabled), sensitivity: sensitivity, decay: decay, inject: Boolean(current.inject), order: order };
        setBusy(true); setMessage(""); setError("");
        var op = { op: "set", path: ["enabled"], value: next.enabled };
        var ops = [op, { op: "set", path: ["sensitivity"], value: next.sensitivity }, { op: "set", path: ["decay"], value: next.decay }, { op: "set", path: ["inject"], value: next.inject }, { op: "set", path: ["order"], value: next.order }];
        var run = typeof scope.mutate === "function" ? scope.mutate(ops, scope.getSnapshot().revision) : ops.reduce(function (chain, item) { return chain.then(function () { return scope.set(item.path[0], item.value); }); }, Promise.resolve());
        Promise.resolve(run).then(function () { setBusy(false); setDraft(null); setSnapshot(scope.getSnapshot()); setMessage(t("saved")); }).catch(function (e) { setBusy(false); setError(t("error") + ": " + String(e && e.message || e)); });
      }
      return h("div", { className: "__aa_root" },
        h("p", { className: "__aa_intro" }, t("intro")),
        toggle("enabled", "enabledHint", "enabled"),
        h("div", { className: "__aa_grid" }, field("sensitivity", "sensitivityHint", "sensitivity", { min: "0", max: "3", step: "0.1" }), field("decay", "decayHint", "decay", { min: "0", max: "0.25", step: "0.01" })),
        toggle("inject", "injectHint", "inject"),
        field("order", "orderHint", "order", { step: "0.05" }),
        h("div", { className: "__aa_actions" }, h("button", { type: "button", className: "__aa_btn", disabled: busy, onClick: save }, busy ? t("saving") : t("save")), message ? h("span", { className: "__aa_status" }, message) : null, error ? h("span", { className: "__aa_error" }, error) : null)
      );
    }
    function apply(ctx) {
      var t = ctx.locale.bind(NS);
      ctx.effect(function () { return ctx.locale.register(NS, { es: es, en: en }); }, "ari-affect: dictionaries");
      var scope = ctx.configForms.get("ari-affect");
      ctx.slots.inject("plugins.bundle.config", function () {
        return ctx.slots.register({ name: "plugins.bundle.config", key: "dsh-ari-affect", locale: NS }, function () {
          return h(Section, { scope: scope, t: t });
        });
      });
    }
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
