(function () {
  const VD = (window.VD = window.VD || {});
  const keys = {};
  const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar', 'Shift']);

  function norm(k) {
    return k.length === 1 ? k.toLowerCase() : k;
  }

  const Input = (VD.Input = {
    keys: keys,
    pressed: {},
    mouse: { x: 0, y: 0, down: false, moved: false },
    init: function () {
      window.addEventListener('keydown', function (e) {
        if (window.VD.g && window.VD.g.capture) return;
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
        // Buttons handle Enter/Space themselves; do not also queue a game action.
        if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
        const k = norm(e.key);
        if (!keys[k]) Input.pressed[k] = true;
        keys[k] = true;
        if (PREVENT.has(e.key)) e.preventDefault();
      });
      window.addEventListener('keyup', function (e) {
        keys[norm(e.key)] = false;
      });
      window.addEventListener('blur', function () {
        for (const k in keys) keys[k] = false;
        Input.mouse.down = false;
        Input.clear();
        const g = window.VD.g;
        if (g && !g.capture && VD.States.cur === 'PLAYING') VD.States.set('PAUSED', g);
      });
      window.addEventListener('mousemove', function (e) {
        Input.mouse.x = e.clientX;
        Input.mouse.y = e.clientY;
        Input.mouse.moved = true;
      });
      window.addEventListener('mousedown', function () {
        Input.mouse.down = true;
      });
      window.addEventListener('mouseup', function () {
        Input.mouse.down = false;
      });
      window.addEventListener('contextmenu', function (e) {
        e.preventDefault();
      });
    },
    down: function () {
      for (let i = 0; i < arguments.length; i++) if (keys[arguments[i]]) return true;
      return false;
    },
    hit: function (k) {
      if (Input.pressed[k]) {
        Input.pressed[k] = false;
        return true;
      }
      return false;
    },
    clear: function () {
      for (const k in Input.pressed) Input.pressed[k] = false;
    },
    release: function () {
      for (const k in keys) keys[k] = false;
      Input.mouse.down = false;
      Input.clear();
    }
  });
})();
