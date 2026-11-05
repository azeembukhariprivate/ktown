// Controls: keyboard and mouse, a game controller, or touch (a stick under the left thumb, drag on the right to look
// around, a jump button). Gives the game how she should move and how the camera should turn.

export class Input {
  constructor(el) {
    this.el = el;
    this.keys = new Set();
    this.look = { x: 0, y: 0 }; // camera turn since last frame, in pixels-ish
    this.zoom = 0;
    this.jumpPressed = false;
    this.touchMode = false;
    this.stick = null; // { id, x0, y0, x, y }
    this.lookTouch = null;
    this.locked = false;
    this.lastLook = -1e9; // when the camera was last turned by hand
    this.pressed = new Set(); // keys pressed since last frame (for one-off actions)
    this.enabled = true;

    addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (e.code === 'Space') this.jumpPressed = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    // Mouse: click to steer the camera with the mouse (pointer lock); or drag.
    let drag = null;
    el.addEventListener('mousedown', e => {
      if (!this.enabled || this.touchMode) return;
      drag = { x: e.clientX, y: e.clientY };
      if (!this.locked && el.requestPointerLock && !this.noLock) {
        try {
          const p = el.requestPointerLock();
          if (p && p.catch) p.catch(() => {});
        } catch {
          // Not allowed here: dragging still works.
        }
      }
    });
    addEventListener('mouseup', () => (drag = null));
    addEventListener('mousemove', e => {
      if (!this.enabled) return;
      if (this.locked) this.turn(e.movementX, e.movementY);
      else if (drag) {
        this.turn(e.clientX - drag.x, e.clientY - drag.y);
        drag = { x: e.clientX, y: e.clientY };
      }
    });
    document.addEventListener('pointerlockchange', () => (this.locked = document.pointerLockElement === el));
    el.addEventListener('wheel', e => {
      this.zoom += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });

    // Touch.
    el.addEventListener('touchstart', e => this.touches(e, 'start'), { passive: false });
    el.addEventListener('touchmove', e => this.touches(e, 'move'), { passive: false });
    el.addEventListener('touchend', e => this.touches(e, 'end'), { passive: false });
    el.addEventListener('touchcancel', e => this.touches(e, 'end'), { passive: false });
  }

  turn(dx, dy) {
    this.look.x += dx;
    this.look.y += dy;
    if (Math.abs(dx) + Math.abs(dy) > 0) this.lastLook = performance.now();
  }

  touches(e, kind) {
    if (!this.enabled) return;
    e.preventDefault();
    this.touchMode = true;
    const w = innerWidth;
    for (const t of e.changedTouches) {
      if (kind === 'start') {
        if (t.clientX < w * 0.42 && !this.stick) this.stick = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY };
        else if (!this.lookTouch) this.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
      } else if (kind === 'move') {
        if (this.stick && t.identifier === this.stick.id) {
          this.stick.x = t.clientX;
          this.stick.y = t.clientY;
        } else if (this.lookTouch && t.identifier === this.lookTouch.id) {
          this.turn((t.clientX - this.lookTouch.x) * 1.6, (t.clientY - this.lookTouch.y) * 1.6);
          this.lookTouch.x = t.clientX;
          this.lookTouch.y = t.clientY;
        }
      } else {
        if (this.stick && t.identifier === this.stick.id) this.stick = null;
        if (this.lookTouch && t.identifier === this.lookTouch.id) this.lookTouch = null;
      }
    }
  }

  /** The stick's push, -1..1 each way (x right, y forward), from whatever is being used. */
  move() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    let run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    if (this.stick) {
      const R = Math.min(70, innerWidth * 0.09);
      let dx = (this.stick.x - this.stick.x0) / R, dy = -(this.stick.y - this.stick.y0) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) {
        // Keep the stick under the thumb: drag its middle along.
        this.stick.x0 += ((dx / l) * (l - 1)) * R;
        this.stick.y0 -= ((dy / l) * (l - 1)) * R;
        dx /= l;
        dy /= l;
      }
      x = dx;
      y = dy;
      run = run || Math.hypot(dx, dy) > 0.92;
    }
    const pad = this.pad();
    if (pad) {
      const [ax, ay] = [pad.axes[0] || 0, pad.axes[1] || 0];
      if (Math.hypot(ax, ay) > 0.18) {
        x = ax;
        y = -ay;
      }
      run = run || (pad.buttons[7] && pad.buttons[7].value > 0.3) || (pad.buttons[1] && pad.buttons[1].pressed) || Math.hypot(ax, ay) > 0.95;
      const [lx, ly] = [pad.axes[2] || 0, pad.axes[3] || 0];
      if (Math.abs(lx) > 0.15 || Math.abs(ly) > 0.15) this.turn(lx * 14, ly * 10);
    }
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y, run };
  }

  pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  /** Called once a frame: what happened since the last frame. */
  take() {
    const pad = this.pad();
    let jump = this.jumpPressed;
    if (pad && pad.buttons[0]) {
      if (pad.buttons[0].pressed && !this.padJump) jump = true;
      this.padJump = pad.buttons[0].pressed;
    }
    const pausePad = pad && pad.buttons[9] && pad.buttons[9].pressed && !this.padPause;
    this.padPause = pad && pad.buttons[9] && pad.buttons[9].pressed;
    const out = { look: { ...this.look }, zoom: this.zoom, jump, pressed: new Set(this.pressed), pausePad };
    this.look.x = this.look.y = 0;
    this.zoom = 0;
    this.jumpPressed = false;
    this.pressed.clear();
    return out;
  }

  releasePointer() {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  }
}
