let entries = [];
let highlights = {};          // từ khóa + màu
let currentIndex = 0;

const diaryEl      = document.getElementById("diary");
const dayHeader    = document.getElementById("dayHeader");
const prevBtn      = document.getElementById("prevBtn");
const nextBtn      = document.getElementById("nextBtn");
const musicBtn     = document.getElementById("musicBtn");
const selectDayBtn = document.getElementById("selectDayBtn");
const dayModal     = document.getElementById("dayModal");
const dayListEl    = document.getElementById("dayList");
const loadingEl    = document.getElementById("loading");
const bgMusic      = document.getElementById("bgMusic");
let isMusicPlaying = false;

// ========== Load highlights.json ==========
async function loadHighlights() {
    try {
    const res = await fetch("highlights.json");
    if (res.ok) {
        highlights = await res.json();
    }
    } catch (e) {
    console.warn("Không load được highlights.json");
    }
}

// ========== Highlight từ khóa ==========
function applyHighlight(text) {
    if (!highlights || Object.keys(highlights).length === 0) return text;

    let result = text;
    // Ưu tiên từ dài trước
    const words = Object.keys(highlights).sort((a, b) => b.length - a.length);

    words.forEach(word => {
        const color = highlights[word];
        const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
        result = result.replace(regex, 
        `<span class="highlight" style="--hl-color: ${color}40">$1</span>`
        // thêm 40 = độ trong suốt ~25%
        );
    });
    return result;
}

// ========== Load list.json + nội dung ==========
async function loadEntries() {
    const listRes = await fetch("list.json");
    if (!listRes.ok) throw new Error("Không tìm thấy list.json");

    const fileList = await listRes.json();
    const loaded = [];

    for (const filename of fileList) {
    const fullName = filename.endsWith(".txt") ? filename : filename + ".txt";

    try {
        const res = await fetch(fullName);
        if (!res.ok) continue;

        const text = await res.text();
        const lines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

        if (lines.length === 0) continue;

        // Dòng đầu = tiêu đề
        const date = lines[0];
        const content = lines.slice(1);

        loaded.push({
        date,
        filename: fullName,
        lines: content
        });
    } catch (err) {
        console.warn("Lỗi load:", fullName);
    }
    }
    return loaded;
}

// ========== Render ==========
function renderEntry(index) {
    if (!entries[index]) return;
    const entry = entries[index];

    dayHeader.textContent = entry.date;
    diaryEl.innerHTML = "";

    entry.lines.forEach(text => {
    const div = document.createElement("div");
    div.className = "line";
    div.innerHTML = applyHighlight(text);   // áp dụng màu
    diaryEl.appendChild(div);
    });

    // Đánh dấu hết
    const end = document.createElement("div");
    end.className = "end-marker";
    end.textContent = "— hết —";
    diaryEl.appendChild(end);

    diaryEl.scrollTop = 0;

    const items = diaryEl.querySelectorAll(".line, .end-marker");
    const observer = new IntersectionObserver((obs) => {
    obs.forEach(e => {
        if (e.isIntersecting) e.target.classList.add("visible");
    });
    }, { root: diaryEl, threshold: 0.1 });

    items.forEach(el => observer.observe(el));

    setTimeout(() => {
    items.forEach((el, i) => {
        if (i < 5) el.classList.add("visible");
    });
    }, 40);
}

// ========== Chuyển ngày ==========
function changeDay(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= entries.length) return;

    diaryEl.classList.add("fade-out");
    dayHeader.style.opacity = "0";

    setTimeout(() => {
    currentIndex = newIndex;
    renderEntry(currentIndex);
    updateDayListActive();
    diaryEl.classList.remove("fade-out");
    diaryEl.classList.add("fade-in");
    dayHeader.style.opacity = "1";
    setTimeout(() => diaryEl.classList.remove("fade-in"), 450);
    }, 300);
}

prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    changeDay(-1);
});
nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    changeDay(1);
});

// ========== Modal ==========
function buildDayList() {
    dayListEl.innerHTML = "";
    entries.forEach((entry, i) => {
    const item = document.createElement("div");
    item.className = "day-item" + (i === currentIndex ? " active" : "");
    item.textContent = entry.date;
    item.addEventListener("click", (e) => {
        e.stopPropagation();
        if (i !== currentIndex) {
        currentIndex = i;
        renderEntry(currentIndex);
        updateDayListActive();
        }
        closeModal();
    });
    dayListEl.appendChild(item);
    });
}

function updateDayListActive() {
    document.querySelectorAll(".day-item").forEach((el, i) => {
    el.classList.toggle("active", i === currentIndex);
    });
}

function openModal() {
    buildDayList();
    dayModal.classList.add("active");
}
function closeModal() {
    dayModal.classList.remove("active");
}

selectDayBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openModal();
});
dayModal.addEventListener("click", (e) => {
    if (e.target === dayModal) closeModal();
});

// ========== Nhạc ==========
musicBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!bgMusic.querySelector("source") && !bgMusic.src) {
    alert("Hãy thêm file nhạc vào thẻ <audio> trước!");
    return;
    }
    if (isMusicPlaying) {
    bgMusic.pause();
    musicBtn.textContent = "♪";
    } else {
    bgMusic.play().catch(() => {});
    musicBtn.textContent = "♫";
    }
    isMusicPlaying = !isMusicPlaying;
});

// ========== Canvas ==========
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let width, height;
let hearts = [];
let particles = [];

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

class Heart {
    constructor(x, y, size = null, speed = null) {
    this.x = x; this.y = y;
    this.size = size || (Math.random() * 10 + 5);
    this.speed = speed || (Math.random() * 0.65 + 0.22);
    this.opacity = Math.random() * 0.4 + 0.28;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.025;
    this.color = Math.random() > 0.5 ? "255,160,170" : "255,200,200";
    }
    update() {
    this.y -= this.speed;
    this.x += Math.sin(this.angle) * 0.3;
    this.angle += this.spin;
    this.opacity -= 0.0011;
    }
    draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.fillStyle = `rgba(${this.color},${this.opacity})`;
    ctx.beginPath();
    const s = this.size;
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-s/2, -s/2, -s, s/3, 0, s);
    ctx.bezierCurveTo(s, s/3, s/2, -s/2, 0, 0);
    ctx.fill();
    ctx.restore();
    }
}

class Particle {
    constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 1.5 + 0.4;
    this.speedY = Math.random() * 0.22 + 0.07;
    this.opacity = Math.random() * 0.3 + 0.1;
    }
    update() {
    this.y -= this.speedY;
    if (this.y < -10) {
        this.y = height + 10;
        this.x = Math.random() * width;
    }
    }
    draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,230,220,${this.opacity})`;
    ctx.fill();
    }
}

for (let i = 0; i < 45; i++) particles.push(new Particle());

setInterval(() => {
    if (hearts.length < 20) {
    hearts.push(new Heart(Math.random() * width, height + 15));
    }
}, 750);

function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    for (let i = hearts.length - 1; i >= 0; i--) {
    hearts[i].update();
    hearts[i].draw();
    if (hearts[i].opacity <= 0 || hearts[i].y < -40) {
        hearts.splice(i, 1);
    }
    }
    requestAnimationFrame(animate);
}
animate();

// ========== Ripple ==========
function createRipple(x, y) {
    const ripple = document.createElement("div");
    ripple.className = "ripple";
    const size = 60;
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (x - size / 2) + "px";
    ripple.style.top = (y - size / 2) + "px";
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    for (let i = 0; i < 3; i++) {
    setTimeout(() => {
        hearts.push(new Heart(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 25,
        Math.random() * 8 + 6,
        Math.random() * 1.3 + 0.6
        ));
    }, i * 45);
    }
}

function handlePointer(e) {
    // Không tạo ripple khi bấm nút hoặc trong modal
    if (e.target.closest("button") || e.target.closest(".modal") || e.target.closest(".top-right")) return;

    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const y = e.clientY ?? e.touches?.[0]?.clientY;
    if (x != null) createRipple(x, y);
}

document.body.addEventListener("click", handlePointer);
document.body.addEventListener("touchstart", handlePointer, { passive: true });

// ========== Khởi động ==========
(async () => {
    try {
    await loadHighlights();
    entries = await loadEntries();

    if (entries.length === 0) {
        loadingEl.textContent = "Không có nhật ký nào";
        return;
    }
    loadingEl.style.display = "none";
    renderEntry(0);
    } catch (err) {
    loadingEl.textContent = "Lỗi: " + err.message;
    }
})();