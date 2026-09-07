const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const themeButton = document.getElementById('themeToggleBtn');
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
    themeButton.innerHTML = theme === 'light' ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    themeButton.setAttribute('aria-label', theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему');
    try { localStorage.setItem('ave_portfolio_theme', theme); } catch {}
}
let storedTheme = 'dark';
try { storedTheme = localStorage.getItem('ave_portfolio_theme') || 'dark'; } catch {}
applyTheme(storedTheme);
themeButton.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

const track = document.getElementById('carouselTrack');
const slides = Array.from(track.children);
const tabButtons = Array.from(document.querySelectorAll('.carousel-tab-btn'));
let currentSlide = 0;
slides.forEach((slide, index) => {
    slide.id = 'project-panel-' + index;
    slide.setAttribute('role', 'tabpanel');
    slide.setAttribute('aria-labelledby', 'project-tab-' + index);
    const button = tabButtons[index];
    button.id = 'project-tab-' + index;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', slide.id);
    button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = index + 1;
        if (event.key === 'ArrowLeft') next = index - 1;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = slides.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        goToSlide(next);
        tabButtons[currentSlide].focus({ preventScroll: true });
    });
});
function goToSlide(index) {
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== currentSlide; slide.inert = i !== currentSlide; });
    tabButtons.forEach((button, i) => {
        button.classList.toggle('active', i === currentSlide);
        button.setAttribute('aria-selected', String(i === currentSlide));
        button.tabIndex = i === currentSlide ? 0 : -1;
    });
    const button = tabButtons[currentSlide];
    const row = button.parentElement;
    row.scrollTo({ left: button.offsetLeft - row.offsetLeft - (row.clientWidth - button.clientWidth) / 2, behavior: motionPreference.matches ? 'instant' : 'smooth' });
}
function nextSlide() { goToSlide(currentSlide + 1); }
function prevSlide() { goToSlide(currentSlide - 1); }
goToSlide(0);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    const id = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(id || 'hero');
    if (!target) return;
    anchor.addEventListener('click', event => {
        event.preventDefault();
        target.scrollIntoView({ behavior: motionPreference.matches ? 'instant' : 'smooth' });
        history.replaceState(null, '', '#' + target.id);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    });
});

const nav = document.getElementById('navbarWrap');
const collapsible = nav.querySelector('.nav-collapsible');
const dots = Array.from(document.querySelectorAll('.side-dot'));
const sections = Array.from(document.querySelectorAll('section[id]'));
const sectionNames = { hero: 'Главная', cases: 'Проекты', approach: 'Подход к работе', process: 'Этапы разработки', stack: 'Технологии', contacts: 'Контакты' };
dots.forEach(dot => {
    dot.setAttribute('aria-label', sectionNames[dot.dataset.target] || 'Наверх');
});
document.querySelectorAll('i[class*="fa-"]').forEach(icon => icon.setAttribute('aria-hidden', 'true'));
let lastScroll = scrollY;
let queued = false;
function updateScroll() {
    const delta = scrollY - lastScroll;
    if (!nav.contains(document.activeElement)) {
        if (scrollY > 80 && delta > 4) nav.classList.add('scrolled');
        else if (delta < -4 || scrollY <= 80) nav.classList.remove('scrolled');
    }
    collapsible.inert = nav.classList.contains('scrolled');
    lastScroll = scrollY;
    let active = 'hero';
    sections.forEach(section => { if (section.getBoundingClientRect().top <= 200) active = section.id; });
    dots.forEach(dot => {
        const selected = dot.dataset.target === active;
        dot.classList.toggle('active', selected);
        if (selected) dot.setAttribute('aria-current', 'location');
        else dot.removeAttribute('aria-current');
    });
    queued = false;
}
nav.addEventListener('focusin', () => { nav.classList.remove('scrolled'); collapsible.inert = false; });
addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(updateScroll); } }, { passive: true });
addEventListener('resize', updateScroll, { passive: true });
updateScroll();

// Load decorative animations only when visible; keep them paused elsewhere.
const stickerMap = {
    approachLottie1: 'file_1866915', approachLottie2: 'file_1866920',
    approachLottie3: 'file_1866926', approachLottie4: 'file_1866946',
    ctaSticker: 'file_1866940', tgNameSticker: 'file_1866919', tgBottomSticker: 'file_1866912'
};
const animations = new Map();
const visibility = new Map();
function syncStickers() {
    animations.forEach((animation, element) => {
        if (motionPreference.matches) animation.goToAndStop(0, true);
        else if (visibility.get(element) && !document.hidden) animation.play();
        else animation.pause();
    });
}
if (typeof lottie !== 'undefined' && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const element = entry.target;
            visibility.set(element, entry.isIntersecting);
            if (entry.isIntersecting && !animations.has(element)) {
                const animation = lottie.loadAnimation({ container: element, renderer: 'canvas', loop: true, autoplay: false, path: 'stickers_json/' + stickerMap[element.id] + '.tgs.json', rendererSettings: { dpr: Math.min(devicePixelRatio, 1.5) } });
                animation.addEventListener('DOMLoaded', syncStickers);
                animation.addEventListener('data_failed', () => { element.hidden = true; });
                animations.set(element, animation);
            }
        });
        syncStickers();
    });
    Object.keys(stickerMap).forEach(id => {
        const element = document.getElementById(id);
        if (element) { element.setAttribute('aria-hidden', 'true'); observer.observe(element); }
    });
}
motionPreference.addEventListener('change', syncStickers);
document.addEventListener('visibilitychange', syncStickers);

const flow = document.querySelector('.arthouse-svg-layer');
let flowVisible = false;
function syncFlow() {
    flow?.classList.toggle('is-visible', flowVisible && !document.hidden && !motionPreference.matches);
}
if (flow && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => { flowVisible = entries[0].isIntersecting; syncFlow(); }).observe(flow);
}
document.addEventListener('visibilitychange', syncFlow);
motionPreference.addEventListener('change', syncFlow);

const previewDialog = document.getElementById('previewDialog');
const previewImage = document.getElementById('previewImage');
document.querySelectorAll('.preview-open').forEach(button => {
    button.addEventListener('click', () => {
        previewImage.src = button.dataset.preview;
        previewImage.alt = button.querySelector('img').alt;
        previewDialog.showModal();
    });
});
previewDialog.querySelector('.preview-close').addEventListener('click', () => previewDialog.close());
previewDialog.addEventListener('click', event => {
    if (event.target !== previewDialog) return;
    const bounds = previewDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) previewDialog.close();
});
