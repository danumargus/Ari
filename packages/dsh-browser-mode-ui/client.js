window.__ModuleLoader__.load({
  id: 'dsh-browser-mode-ui',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    var React = require('react')
    var h = React.createElement
    var inject = ['slots']

    function Selector() {
      var [mode, setMode] = React.useState('mobile')
      var [busy, setBusy] = React.useState(false)

      React.useEffect(function () {
        var alive = true
        fetch('/api/desktop/ari-browser-mode')
          .then(function (r) { return r.json() })
          .then(function (d) { if (alive && d && d.active) setMode(d.active) })
          .catch(function () {})
        return function () { alive = false }
      }, [])

      function change(next) {
        setMode(next)
        setBusy(true)
        fetch('/api/desktop/ari-browser-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: next }),
        }).then(function (r) { return r.json() }).then(function (d) {
          if (d && d.active) setMode(d.active)
        }).catch(function () {}).finally(function () { setBusy(false) })
      }

      return h('label', {
        style: { display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--dsw-alias-label-tertiary)' },
        title: 'Elige dónde navega Ari sin cambiar la máquina DSH'
      },
        h('span', null, 'Navegación'),
        h('select', {
          value: mode,
          disabled: busy,
          onChange: function (e) { change(e.target.value) },
          style: {
            border:'1px solid var(--dsw-alias-border-l2)',
            background:'var(--dsw-alias-bg-layer-3)',
            color:'var(--dsw-alias-label-primary)',
            borderRadius:'8px',
            padding:'4px 8px',
            font:'inherit',
            fontSize:'12px'
          }
        },
          h('option', { value:'local' }, 'Local'),
          h('option', { value:'mobile' }, 'Móvil'),
          h('option', { value:'cloud' }, 'Nube')
        )
      )
    }

    function apply(ctx) {
      ctx.slots.inject('conversation.session.header.actions', function () {
        return ctx.slots.register({
          name: 'conversation.session.header.actions',
          id: 'ari-browser-mode',
          order: 35,
        }, function () { return h(Selector) })
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
