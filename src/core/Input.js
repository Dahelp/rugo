export class Input {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, dx: 0, dy: 0, leftDown: false };
        this.touchMove = { x: 0, y: 0, active: false };
        this.touchButtons = {
            jump: false,
            attack: false,
            special: false,
            dash: false
        };
        this.cameraAngleY = 0;
        this.cameraAngleX = 0.5;
        this.cameraDistance = 12;
        this._isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        this._setupKeyboard();
        this._setupMouse();
        this._setupTouch();
    }

    _setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    _setupMouse() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.leftDown = true;
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
        });

        let dragging = false;
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2 || e.shiftKey) {
                dragging = true;
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (dragging) {
                this.mouse.dx = e.clientX - this.mouse.x;
                this.mouse.dy = e.clientY - this.mouse.y;
                this.cameraAngleY -= this.mouse.dx * 0.005;
                this.cameraAngleX -= this.mouse.dy * 0.003;
                this.cameraAngleX = Math.max(0.15, Math.min(1.3, this.cameraAngleX));
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            }
        });
        window.addEventListener('mouseup', () => { dragging = false; });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraDistance += e.deltaY * 0.01;
            this.cameraDistance = Math.max(6, Math.min(25, this.cameraDistance));
        });
    }

    _setupTouch() {
        const joystick = document.getElementById('joystickBase');
        const knob = document.getElementById('joystickKnob');
        if (!joystick || !knob) return;

        let touchId = null;
        let startX = 0, startY = 0;

        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            touchId = t.identifier;
            startX = t.clientX;
            startY = t.clientY;
            this.touchMove.active = true;
        }, { passive: false });

        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let t of e.touches) {
                if (t.identifier === touchId) {
                    let dx = t.clientX - startX;
                    let dy = t.clientY - startY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 50;
                    if (dist > maxDist) {
                        dx = (dx / dist) * maxDist;
                        dy = (dy / dist) * maxDist;
                    }
                    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                    this.touchMove.x = dx / maxDist;
                    this.touchMove.y = dy / maxDist;
                }
            }
        }, { passive: false });

        const resetJoystick = (e) => {
            touchId = null;
            this.touchMove.active = false;
            this.touchMove.x = 0;
            this.touchMove.y = 0;
            knob.style.transform = 'translate(-50%, -50%)';
        };
        joystick.addEventListener('touchend', resetJoystick);
        joystick.addEventListener('touchcancel', resetJoystick);

        const setupBtn = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.touchButtons[key] = true; }, { passive: false });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.touchButtons[key] = false; }, { passive: false });
            el.addEventListener('touchcancel', (e) => { this.touchButtons[key] = false; });
        };
        setupBtn('btnJump', 'jump');
        setupBtn('btnAttack', 'attack');
        setupBtn('btnSpecial', 'special');
        setupBtn('btnDash', 'dash');
    }

    getMoveInput() {
        let x = 0, z = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;

        if (this.touchMove.active && (Math.abs(this.touchMove.x) > 0.1 || Math.abs(this.touchMove.y) > 0.1)) {
            x = this.touchMove.x;
            z = this.touchMove.y;
        }

        const len = Math.sqrt(x * x + z * z);
        if (len > 1) { x /= len; z /= len; }
        return { x, z };
    }

    getJumpPressed() {
        return this.keys['Space'] || this.touchButtons.jump;
    }

    getAttackPressed() {
        return this.mouse.leftDown || this.keys['KeyJ'] || this.touchButtons.attack;
    }

    getSpecialPressed() {
        return this.keys['KeyK'] || this.touchButtons.special;
    }

    getDashPressed() {
        return this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchButtons.dash;
    }

    getInteractPressed() {
        return this.keys['KeyE'];
    }

    getDebugReset() {
        return this.keys['KeyR'];
    }

    isTouch() {
        return this._isTouch;
    }
}
