(() => {
    "use strict";

    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- Theme sáng/tối ---------- */
    const themeBtn = document.getElementById("themeToggle");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

    const currentTheme = () =>
        root.getAttribute("data-theme") || (systemDark.matches ? "dark" : "light");

    themeBtn?.addEventListener("click", () => {
        const next = currentTheme() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* bỏ qua khi bị chặn storage */ }
    });

    /* ---------- Menu mobile ---------- */
    const menuBtn = document.getElementById("menuToggle");
    const nav = document.getElementById("siteNav");

    const setMenu = (open) => {
        nav.classList.toggle("is-open", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
    };

    menuBtn?.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    nav?.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
    });
    document.addEventListener("click", (e) => {
        if (nav.classList.contains("is-open") && !e.target.closest("#siteNav, #menuToggle")) setMenu(false);
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

    /* ---------- Header viền khi cuộn ---------- */
    const header = document.getElementById("siteHeader");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ---------- Đánh dấu mục đang xem trên menu ---------- */
    const links = [...document.querySelectorAll('.nav ul a[href^="#"]')];
    const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

    if ("IntersectionObserver" in window && sections.length) {
        const visible = new Map();
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => visible.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
            let best = null, bestRatio = 0;
            visible.forEach((r, id) => { if (r > bestRatio) { bestRatio = r; best = id; } });
            links.forEach((a) => {
                const on = a.getAttribute("href") === "#" + best;
                a.classList.toggle("is-active", on);
                if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
            });
        }, { rootMargin: "-30% 0px -50% 0px", threshold: [0, .25, .5, .75, 1] });
        sections.forEach((s) => io.observe(s));
    }

    /* ---------- Dòng chữ gõ lần lượt ---------- */
    const rotator = document.getElementById("rotator");
    if (rotator && !reduceMotion) {
        let words = [];
        try { words = JSON.parse(rotator.dataset.words || "[]"); } catch (e) { words = []; }
        if (words.length > 1) {
            let w = 0, i = words[0].length, deleting = true;
            const tick = () => {
                if (deleting) {
                    i--;
                    if (i <= 0) { deleting = false; w = (w + 1) % words.length; }
                } else {
                    i++;
                }
                rotator.textContent = words[w].slice(0, Math.max(i, 0));
                let delay = deleting ? 40 : 80;
                if (!deleting && i >= words[w].length) { deleting = true; delay = 2000; }
                setTimeout(tick, delay);
            };
            setTimeout(tick, 2400);
        }
    }

    /* ---------- Lightbox ---------- */
    const lb = document.getElementById("lightbox");
    const lbImg = document.getElementById("lbImg");
    const lbCaption = document.getElementById("lbCaption");
    const lbCount = document.getElementById("lbCount");
    let group = [], index = 0, opener = null;

    const show = (n) => {
        index = (n + group.length) % group.length;
        const item = group[index];
        lbImg.src = item.getAttribute("href");
        lbImg.alt = item.dataset.caption || "";
        lbCaption.textContent = item.dataset.caption || "";
        lbCount.textContent = `${index + 1} / ${group.length}`;
        // tải trước ảnh kế tiếp
        if (group.length > 1) new Image().src = group[(index + 1) % group.length].getAttribute("href");
    };

    const openLightbox = (el) => {
        if (!lb || typeof lb.showModal !== "function") return false;
        group = [...document.querySelectorAll(`[data-gallery="${el.dataset.gallery}"]`)];
        opener = el;
        lb.classList.toggle("is-single", group.length < 2);
        show(group.indexOf(el));
        lb.showModal();
        document.body.style.overflow = "hidden";
        return true;
    };

    document.addEventListener("click", (e) => {
        const el = e.target.closest("[data-gallery]");
        if (el && openLightbox(el)) e.preventDefault();
    });

    lb?.addEventListener("click", (e) => {
        const action = e.target.closest("[data-lb]")?.dataset.lb;
        if (action === "close") lb.close();
        else if (action === "prev") show(index - 1);
        else if (action === "next") show(index + 1);
        else if (e.target === lb || e.target.tagName === "FIGURE") lb.close();
    });

    lb?.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") show(index - 1);
        if (e.key === "ArrowRight") show(index + 1);
    });

    lb?.addEventListener("close", () => {
        document.body.style.overflow = "";
        lbImg.removeAttribute("src");
        opener?.focus({ preventScroll: true });
    });

    // Vuốt trái/phải trên điện thoại
    let startX = 0, startY = 0;
    lb?.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    lb?.addEventListener("touchend", (e) => {
        if (group.length < 2) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });

    /* ---------- Thời gian làm việc (tính cả tháng đầu và tháng cuối) ---------- */
    const now = new Date();
    document.querySelectorAll(".job-dur[data-start]").forEach((el) => {
        const [sy, sm] = el.dataset.start.split("-").map(Number);
        const [ey, em] = el.dataset.end
            ? el.dataset.end.split("-").map(Number)
            : [now.getFullYear(), now.getMonth() + 1];
        const total = (ey - sy) * 12 + (em - sm) + 1;
        if (!(total > 0)) return;
        const y = Math.floor(total / 12), m = total % 12;
        el.textContent = [y && `${y} năm`, m && `${m} tháng`].filter(Boolean).join(" ");
    });

    /* ---------- Năm ở footer ---------- */
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
})();
