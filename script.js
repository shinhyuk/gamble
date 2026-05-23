// ---- 사다리 게임 ----
const START_BALANCE = 1_000_000;
const NUM_ROWS = 10; // 가로줄(가지)이 생길 수 있는 행 수

const canvas = document.getElementById("ladder");
const ctx = canvas.getContext("2d");

const balanceEl = document.getElementById("balance");
const betEl = document.getElementById("bet");
const startBtn = document.getElementById("start");
const messageEl = document.getElementById("message");
const pickBtns = [...document.querySelectorAll(".pick")];

// 캔버스 좌표
const W = canvas.width;
const H = canvas.height;
const TOP_Y = 50;
const BOTTOM_Y = H - 50;
const COL_X = { 1: W * 0.3, 2: W * 0.7 };

const state = {
  balance: START_BALANCE,
  selectedStart: null, // 1 또는 2
  rungs: [], // 각 행에 가로줄이 있는지 (boolean)
  winSlot: 1, // 당첨 칸 (1 또는 2)
  revealed: false,
  landed: null, // 도착한 칸
  animating: false,
};

// ---- 숫자 입력 도우미 ----
function parseBet() {
  const digits = betEl.value.replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatNumber(n) {
  return n.toLocaleString("ko-KR");
}

function setBet(n) {
  const clamped = Math.max(0, Math.min(n, state.balance));
  betEl.value = formatNumber(clamped);
}

function refreshBalance() {
  balanceEl.textContent = formatNumber(state.balance);
}

function canStart() {
  const bet = parseBet();
  return (
    !state.animating &&
    state.selectedStart !== null &&
    bet > 0 &&
    bet <= state.balance
  );
}

function updateStartBtn() {
  startBtn.disabled = !canStart();
}

// ---- 사다리 생성 ----
function generateLadder() {
  state.rungs = [];
  for (let i = 0; i < NUM_ROWS; i++) {
    state.rungs.push(Math.random() < 0.5);
  }
  state.winSlot = Math.random() < 0.5 ? 1 : 2;
  state.revealed = false;
  state.landed = null;
}

// 시작 칸에서 출발해 도착 칸을 계산하고 경로 좌표를 만든다
function computePath(startCol) {
  const path = [];
  let col = startCol;
  path.push({ x: COL_X[col], y: TOP_Y });

  const rowGap = (BOTTOM_Y - TOP_Y) / (NUM_ROWS + 1);
  for (let i = 0; i < NUM_ROWS; i++) {
    const y = TOP_Y + rowGap * (i + 1);
    path.push({ x: COL_X[col], y }); // 현재 줄을 따라 내려옴
    if (state.rungs[i]) {
      col = col === 1 ? 2 : 1; // 가로줄을 만나면 옆줄로 이동
      path.push({ x: COL_X[col], y });
    }
  }
  path.push({ x: COL_X[col], y: BOTTOM_Y });
  return { path, endCol: col };
}

// ---- 그리기 ----
function drawBoard(ballPos) {
  ctx.clearRect(0, 0, W, H);

  // 세로줄
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#2c5040";
  ctx.lineCap = "round";
  for (const col of [1, 2]) {
    ctx.beginPath();
    ctx.moveTo(COL_X[col], TOP_Y);
    ctx.lineTo(COL_X[col], BOTTOM_Y);
    ctx.stroke();
  }

  // 가로줄
  const rowGap = (BOTTOM_Y - TOP_Y) / (NUM_ROWS + 1);
  ctx.strokeStyle = "#3a6b53";
  for (let i = 0; i < NUM_ROWS; i++) {
    if (!state.rungs[i]) continue;
    const y = TOP_Y + rowGap * (i + 1);
    ctx.beginPath();
    ctx.moveTo(COL_X[1], y);
    ctx.lineTo(COL_X[2], y);
    ctx.stroke();
  }

  // 위쪽 출발 표시 (1, 2)
  for (const col of [1, 2]) {
    const selected = state.selectedStart === col;
    ctx.beginPath();
    ctx.arc(COL_X[col], TOP_Y, 16, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#f5c451" : "#16302a";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = selected ? "#f5c451" : "#3a6b53";
    ctx.stroke();
    ctx.fillStyle = selected ? "#1a1305" : "#e8f0ea";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(col), COL_X[col], TOP_Y);
  }

  // 아래쪽 결과 칸
  for (const col of [1, 2]) {
    let label = "?";
    let bg = "#16302a";
    let fg = "#e8f0ea";
    if (state.revealed) {
      const isWin = col === state.winSlot;
      label = isWin ? "2배" : "꽝";
      bg = isWin ? "#1d4a32" : "#3a1d1d";
      fg = isWin ? "#3ddc84" : "#ff8a8a";
      if (state.landed === col) {
        ctx.lineWidth = 3;
      }
    }
    const bw = 54;
    const bh = 30;
    const bx = COL_X[col] - bw / 2;
    const by = BOTTOM_Y + 6;
    ctx.fillStyle = bg;
    roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.lineWidth = state.revealed && state.landed === col ? 3 : 1.5;
    ctx.strokeStyle =
      state.revealed && state.landed === col ? "#f5c451" : "#3a6b53";
    roundRect(bx, by, bw, bh, 8);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(label, COL_X[col], by + bh / 2);
  }

  // 움직이는 공
  if (ballPos) {
    ctx.beginPath();
    ctx.arc(ballPos.x, ballPos.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#f5c451";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#fff3d6";
    ctx.stroke();
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- 애니메이션 ----
function animateBall(path, onDone) {
  const speed = 220; // px/초
  // 각 구간 길이 누적
  const segs = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const len = Math.hypot(dx, dy);
    segs.push({ from: path[i - 1], to: path[i], len });
    total += len;
  }

  let startTime = null;
  function frame(t) {
    if (startTime === null) startTime = t;
    const elapsed = (t - startTime) / 1000;
    let dist = elapsed * speed;

    let pos = path[path.length - 1];
    if (dist < total) {
      let acc = 0;
      for (const seg of segs) {
        if (dist <= acc + seg.len) {
          const r = seg.len === 0 ? 0 : (dist - acc) / seg.len;
          pos = {
            x: seg.from.x + (seg.to.x - seg.from.x) * r,
            y: seg.from.y + (seg.to.y - seg.from.y) * r,
          };
          break;
        }
        acc += seg.len;
      }
    }

    drawBoard(pos);

    if (dist < total) {
      requestAnimationFrame(frame);
    } else {
      onDone();
    }
  }
  requestAnimationFrame(frame);
}

// ---- 게임 진행 ----
function play() {
  if (!canStart()) return;
  const bet = parseBet();

  state.animating = true;
  state.revealed = false;
  messageEl.textContent = "";
  messageEl.className = "message";
  setControlsDisabled(true);

  generateLadder();
  const { path, endCol } = computePath(state.selectedStart);

  animateBall(path, () => {
    state.landed = endCol;
    state.revealed = true;
    const win = endCol === state.winSlot;

    if (win) {
      state.balance += bet;
      messageEl.textContent = `🎉 당첨! +${formatNumber(bet)}원 (2배 획득)`;
      messageEl.className = "message win";
    } else {
      state.balance -= bet;
      messageEl.textContent = `😢 꽝... -${formatNumber(bet)}원`;
      messageEl.className = "message lose";
    }

    refreshBalance();
    drawBoard(null);
    state.animating = false;

    if (state.balance <= 0) {
      handleBankruptcy();
    } else {
      setBet(Math.min(parseBet(), state.balance));
      setControlsDisabled(false);
    }
  });
}

function handleBankruptcy() {
  messageEl.textContent = "💸 파산했습니다! 100만원으로 다시 시작합니다.";
  messageEl.className = "message lose";
  state.balance = START_BALANCE;
  refreshBalance();
  setBet(10000);
  setControlsDisabled(false);
}

function setControlsDisabled(disabled) {
  pickBtns.forEach((b) => (b.disabled = disabled));
  betEl.disabled = disabled;
  document.querySelectorAll(".chip").forEach((c) => (c.disabled = disabled));
  if (disabled) {
    startBtn.disabled = true;
  } else {
    updateStartBtn();
  }
}

// ---- 이벤트 ----
pickBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state.animating) return;
    state.selectedStart = parseInt(btn.dataset.start, 10);
    pickBtns.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    drawBoard(null);
    updateStartBtn();
  });
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    if (state.animating) return;
    const action = chip.dataset.action;
    if (action === "clear") {
      setBet(0);
    } else if (action === "allin") {
      setBet(state.balance);
    } else {
      setBet(parseBet() + parseInt(chip.dataset.add, 10));
    }
    updateStartBtn();
  });
});

betEl.addEventListener("input", () => {
  const n = parseBet();
  betEl.value = n ? formatNumber(n) : "";
  updateStartBtn();
});

betEl.addEventListener("blur", () => {
  setBet(parseBet());
});

startBtn.addEventListener("click", play);

// ---- 초기화 ----
refreshBalance();
generateLadder();
drawBoard(null);
updateStartBtn();
