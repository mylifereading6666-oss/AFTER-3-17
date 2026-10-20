// Detect available input methods at startup and choose the most suitable HUD.
(() => {
  const root = document.documentElement;
  const touch = navigator.maxTouchPoints > 0 || ("ontouchstart" in window);
  const coarse = matchMedia("(pointer: coarse)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const keyboard = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const gamepad = "getGamepads" in navigator;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const device = touch && (coarse || mobileUA) ? "touch" : keyboard ? "desktop" : fine ? "desktop" : "adaptive";
  root.dataset.inputMode = device;
  root.dataset.hasGamepad = String(gamepad);
  root.dataset.hasTouch = String(touch);
  root.dataset.hasKeyboardPointer = String(keyboard);

  function applyControls() {
    const touchUI = document.getElementById("touchControls");
    if (!touchUI) return;
    const useTouch = device === "touch" || (device === "adaptive" && touch);
    touchUI.style.display = useTouch ? "flex" : "none";
    root.classList.toggle("touch-device", useTouch);
    root.classList.toggle("desktop-device", !useTouch);
    const hint = document.querySelector(".hint");
    if (hint) {
      hint.innerHTML = useTouch
        ? "左のボタンで移動 / 画面をスワイプして視点操作<br>「調べる」で調査、ポーズで一時停止"
        : "WASD：移動 / マウス：視点操作 / E：調べる / P：ポーズ<br>ゲームパッド対応環境では左スティックで移動";
    }
  }
  applyControls();
  window.addEventListener("resize", applyControls);
  window.addEventListener("orientationchange", applyControls);

  // Gamepad support: left stick / D-pad to move, right stick to look, A / Cross to interact.
  let padReady = false;
  window.addEventListener("gamepadconnected", () => { padReady = true; });
  window.addEventListener("gamepaddisconnected", () => {
    padReady = Array.from(navigator.getGamepads?.() || []).some(Boolean);
  });
  let lastInteract = false, lastPause = false;
  const virtualKeys = new Set();
  function setVirtualKey(code, down) {
    if (down && !virtualKeys.has(code)) {
      virtualKeys.add(code);
      document.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true }));
    } else if (!down && virtualKeys.has(code)) {
      virtualKeys.delete(code);
      document.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
    }
  }
  function pollGamepad() {
    if (padReady) {
      const pads = Array.from(navigator.getGamepads?.() || []);
      const pad = pads.find(Boolean);
      if (pad) {
        const dead = v => Math.abs(v) < 0.18 ? 0 : v;
        const x = dead(pad.axes[0] || 0), y = dead(pad.axes[1] || 0);
        setVirtualKey("KeyW", y < -0.25 || !!pad.buttons[12]?.pressed);
        setVirtualKey("KeyS", y > 0.25 || !!pad.buttons[13]?.pressed);
        setVirtualKey("KeyA", x < -0.25 || !!pad.buttons[14]?.pressed);
        setVirtualKey("KeyD", x > 0.25 || !!pad.buttons[15]?.pressed);
        const lookX = dead(pad.axes[2] || 0);
        setVirtualKey("ArrowLeft", lookX < -0.25);
        setVirtualKey("ArrowRight", lookX > 0.25);
        const interact = !!pad.buttons[0]?.pressed;
        const pause = !!pad.buttons[9]?.pressed;
        if (interact && !lastInteract) {
          const useButton = document.getElementById("touchUse");
          if (useButton) useButton.click();
          else document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", bubbles: true }));
        }
        if (pause && !lastPause) {
          const pauseButton = document.getElementById("touchPause");
          if (pauseButton) pauseButton.click();
          else document.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyP", bubbles: true }));
        }
        lastInteract = interact; lastPause = pause;
      }
    }
    requestAnimationFrame(pollGamepad);
  }
  pollGamepad();
})();