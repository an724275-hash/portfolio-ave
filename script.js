const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const themeButton = document.getElementById('themeToggleBtn');

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
    themeButton.innerHTML = theme === 'light'
        ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    themeButton.setAttribute('aria-label', theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему');
    try { localStorage.setItem('ave_portfolio_theme', theme); } catch {}
}

let storedTheme = 'dark';
try { storedTheme = localStorage.getItem('ave_portfolio_theme') || 'dark'; } catch {}
applyTheme(storedTheme);
themeButton.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

const animations = new Map();
const animationVisibility = new Map();
const transitioningSlides = new Set();
let prepareCarouselSlide = () => {};

function syncStickers() {
    animations.forEach((animation, element) => {
        const slide = element.closest('.carousel-slide');
        const slideIsTransitioning = Boolean(slide && transitioningSlides.has(slide));
        const slideIsActive = !slide || slide.getAttribute('aria-hidden') !== 'true' || slideIsTransitioning;
        const elementIsVisible = slideIsTransitioning || animationVisibility.get(element);
        const shouldPlay = !motionPreference.matches
            && !document.hidden
            && elementIsVisible
            && slideIsActive;
        if (shouldPlay) animation.play();
        else if (motionPreference.matches) animation.goToAndStop(0, true);
        else animation.pause();
    });
}

const track = document.getElementById('carouselTrack');
const slides = Array.from(track.children);
const tabButtons = Array.from(document.querySelectorAll('.carousel-tab-btn'));
let currentSlide = 0;

slides.forEach((slide, index) => {
    slide.id = `project-panel-${index}`;
    slide.setAttribute('role', 'tabpanel');
    slide.setAttribute('aria-labelledby', `project-tab-${index}`);
    const button = tabButtons[index];
    button.id = `project-tab-${index}`;
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
    const previousSlide = slides[currentSlide];
    const nextIndex = (index + slides.length) % slides.length;
    const nextSlide = slides[nextIndex];
    transitioningSlides.clear();
    if (previousSlide !== nextSlide && !motionPreference.matches) {
        transitioningSlides.add(previousSlide);
        transitioningSlides.add(nextSlide);
    }
    currentSlide = nextIndex;
    prepareCarouselSlide(currentSlide);
    track.style.transform = `translate3d(-${currentSlide * 100}%, 0, 0)`;
    slides.forEach((slide, i) => {
        const inactive = i !== currentSlide;
        slide.inert = inactive;
        slide.setAttribute('aria-hidden', String(inactive));
    });
    tabButtons.forEach((button, i) => {
        const selected = i === currentSlide;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
    });
    const button = tabButtons[currentSlide];
    const row = button.parentElement;
    row.scrollTo({
        left: button.offsetLeft - row.offsetLeft - (row.clientWidth - button.clientWidth) / 2,
        behavior: motionPreference.matches ? 'instant' : 'smooth'
    });
    syncStickers();
    if (motionPreference.matches || previousSlide === nextSlide) {
        transitioningSlides.clear();
        queueMicrotask(syncStickers);
    }
}

function nextSlide() { goToSlide(currentSlide + 1); }
function prevSlide() { goToSlide(currentSlide - 1); }
window.goToSlide = goToSlide;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
track.addEventListener('transitionend', event => {
    if (event.target !== track || event.propertyName !== 'transform') return;
    transitioningSlides.clear();
    syncStickers();
});
goToSlide(0);

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    const id = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(id || 'hero');
    if (!target) return;
    anchor.addEventListener('click', event => {
        event.preventDefault();
        target.scrollIntoView({ behavior: motionPreference.matches ? 'instant' : 'smooth' });
        history.replaceState(null, '', `#${target.id}`);
        if (anchor.classList.contains('skip-link')) {
            requestAnimationFrame(() => target.focus({ preventScroll: true }));
        }
        if (anchor.closest('#mobileNavPanel')) {
            setMobileNav(false);
            target.tabIndex = -1;
            requestAnimationFrame(() => target.focus({ preventScroll: true }));
        }
    });
});

document.querySelectorAll('.bg-interactive-shape').forEach(shape => {
    shape.setAttribute('aria-hidden', 'true');
    shape.addEventListener('pointerdown', () => {
        shape.classList.remove('squish');
        void shape.offsetWidth;
        shape.classList.add('squish');
    });
    shape.addEventListener('animationend', event => {
        if (event.animationName === 'shapeSquish') shape.classList.remove('squish');
    });
});

const ambientVisibility = new Map();
const ambientGroups = Array.from(document.querySelectorAll('.section-bg-shapes, .tg-profile-card'));

function syncAmbientMotion() {
    ambientGroups.forEach(group => {
        group.classList.toggle(
            'motion-active',
            Boolean(ambientVisibility.get(group)) && !document.hidden && !motionPreference.matches
        );
    });
}

const ambientObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => ambientVisibility.set(entry.target, entry.isIntersecting));
    syncAmbientMotion();
}, { rootMargin: '120px 0px', threshold: 0.01 });
ambientGroups.forEach(group => ambientObserver.observe(group));

const nav = document.getElementById('navbarWrap');
const collapsible = nav.querySelector('.nav-collapsible');
const mobileNavToggle = document.getElementById('mobileNavToggle');
const mobileNavPanel = document.getElementById('mobileNavPanel');
const dots = Array.from(document.querySelectorAll('.side-dot'));
const sections = Array.from(document.querySelectorAll('section[id]'));
const railNodes = Array.from(document.querySelectorAll('.rail-item-node'));
const railProgress = document.getElementById('railGlowProgress');
const railContainer = document.getElementById('goldenRailContainer');
const sectionNames = {
    hero: 'Главная', cases: 'Проекты', approach: 'Подход к работе',
    process: 'Этапы разработки', stack: 'Технологии', contacts: 'Контакты'
};

function setMobileNav(open) {
    if (!mobileNavToggle || !mobileNavPanel) return;
    mobileNavPanel.hidden = !open;
    mobileNavToggle.setAttribute('aria-expanded', String(open));
    mobileNavToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mobileNavToggle.innerHTML = open
        ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    if (open) requestAnimationFrame(() => mobileNavPanel.querySelector('a')?.focus());
}

mobileNavToggle?.addEventListener('click', () => {
    setMobileNav(mobileNavToggle.getAttribute('aria-expanded') !== 'true');
});
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || mobileNavPanel?.hidden) return;
    setMobileNav(false);
    mobileNavToggle.focus();
});
document.addEventListener('pointerdown', event => {
    if (mobileNavPanel?.hidden || nav.contains(event.target)) return;
    setMobileNav(false);
});

dots.forEach(dot => dot.setAttribute('aria-label', sectionNames[dot.dataset.target] || 'Наверх'));
document.querySelectorAll('i[class*="fa-"]').forEach(icon => icon.setAttribute('aria-hidden', 'true'));
document.querySelectorAll('.stack-hover-card').forEach(card => {
    card.tabIndex = 0;
    card.setAttribute('role', 'group');
    const title = card.querySelector('.card-category-title')?.textContent.trim();
    if (title) card.setAttribute('aria-label', title);
});

let lastScroll = scrollY;
let scrollQueued = false;

function updateRailTracker() {
    if (!railContainer || !railProgress) return;
    const rect = railContainer.getBoundingClientRect();
    const progress = Math.min(rect.height, Math.max(0, innerHeight * 0.58 - rect.top));
    const ratio = Math.min(1, Math.max(0, progress / rect.height));
    const nodeTops = railNodes.map(node => node.getBoundingClientRect().top);
    railProgress.style.transform = `scaleY(${ratio})`;
    railNodes.forEach((node, index) => {
        if (nodeTops[index] < innerHeight * 0.78) node.classList.add('active');
    });
}

function updateScroll() {
    const delta = scrollY - lastScroll;
    if (!nav.contains(document.activeElement)) {
        if (scrollY > 80 && delta > 4) nav.classList.add('scrolled');
        else if (delta < -4 || scrollY <= 80) nav.classList.remove('scrolled');
    }
    if (delta > 4 && !mobileNavPanel?.hidden) setMobileNav(false);
    collapsible.inert = nav.classList.contains('scrolled');
    lastScroll = scrollY;

    let active = 'hero';
    sections.forEach(section => {
        if (section.getBoundingClientRect().top <= 200) active = section.id;
    });
    dots.forEach(dot => {
        const selected = dot.dataset.target === active;
        dot.classList.toggle('active', selected);
        if (selected) dot.setAttribute('aria-current', 'location');
        else dot.removeAttribute('aria-current');
    });
    updateRailTracker();
    scrollQueued = false;
}

function queueScrollUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScroll);
}

nav.addEventListener('focusin', () => {
    nav.classList.remove('scrolled');
    collapsible.inert = false;
});
addEventListener('scroll', queueScrollUpdate, { passive: true });
addEventListener('resize', queueScrollUpdate, { passive: true });
addEventListener('resize', () => {
    if (innerWidth > 768) setMobileNav(false);
}, { passive: true });
updateScroll();

const stickerMap = {
    stickerCase1: 'file_1866923',
    stickerCase2: 'file_1866925',
    stickerCase3: 'file_1866931',
    stickerCase4: 'file_1866946',
    stickerCase5: 'file_1866911',
    stickerCase6: 'file_1866921',
    stickerCase7: 'file_1866919',
    slide1LottiePreview: 'file_1866914',
    slide2LottiePreview: 'file_1866916',
    slide3LottiePreview: 'file_1866918',
    slide4LottiePreview: 'file_1866922',
    slide5LottiePreview: 'file_1866914',
    slide6LottiePreview: 'file_1866916',
    slide7LottiePreview: 'file_1866922',
    approachLottie1: 'file_1866915',
    approachLottie2: 'file_1866920',
    approachLottie3: 'file_1866926',
    approachLottie4: 'file_1866946',
    ctaSticker: 'file_1866940',
    tgNameSticker: 'file_1866919',
    tgBottomSticker: 'file_1866912'
};

if (typeof lottie !== 'undefined' && 'IntersectionObserver' in window) {
    const stickerLoads = new Map();

    function loadSticker(element) {
        if (stickerLoads.has(element)) return stickerLoads.get(element);
        let animation;
        const ready = new Promise(resolve => {
            const isCarouselSticker = Boolean(element.closest('.carousel-slide'));
            animation = lottie.loadAnimation({
                container: element,
                renderer: isCarouselSticker ? 'canvas' : 'svg',
                loop: true,
                autoplay: false,
                path: `stickers_json/${stickerMap[element.id]}.tgs.json`,
                rendererSettings: { progressiveLoad: true, preserveAspectRatio: 'xMidYMid meet' }
            });
            animation.addEventListener('DOMLoaded', () => {
                syncStickers();
                resolve(animation);
            });
            animation.addEventListener('data_failed', () => {
                element.hidden = true;
                resolve(animation);
            });
        });
        animations.set(element, animation);
        stickerLoads.set(element, ready);
        return ready;
    }

    const stickerObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const element = entry.target;
            animationVisibility.set(element, entry.isIntersecting);
            if (!entry.isIntersecting || animations.has(element)) return;
            loadSticker(element);
        });
        syncStickers();
    }, { rootMargin: '60px 0px', threshold: 0.01 });

    const carouselVisibilityObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const element = entry.target;
            animationVisibility.set(element, entry.isIntersecting);
            const activeSlide = element.closest('.carousel-slide') === slides[currentSlide];
            if (entry.isIntersecting && activeSlide && !animations.has(element)) loadSticker(element);
        });
        syncStickers();
    }, { rootMargin: '60px 0px', threshold: 0.01 });

    const carouselStickers = [];
    Object.keys(stickerMap).forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        element.setAttribute('aria-hidden', 'true');
        if (element.closest('.carousel-slide')) {
            carouselStickers.push(element);
            carouselVisibilityObserver.observe(element);
        } else {
            stickerObserver.observe(element);
        }
    });

    prepareCarouselSlide = index => {
        const slide = slides[(index + slides.length) % slides.length];
        return Promise.all(carouselStickers.filter(element => element.closest('.carousel-slide') === slide).map(loadSticker));
    };

    tabButtons.forEach((button, index) => {
        const prepare = () => prepareCarouselSlide(index);
        button.addEventListener('pointerenter', prepare, { passive: true });
        button.addEventListener('pointerdown', prepare, { passive: true });
        button.addEventListener('focus', prepare);
    });

    const arrowButtons = Array.from(document.querySelectorAll('.carousel-controls .btn-arrow'));
    const preparePrevious = () => prepareCarouselSlide(currentSlide - 1);
    const prepareNext = () => prepareCarouselSlide(currentSlide + 1);
    [
        [arrowButtons[0], preparePrevious],
        [arrowButtons[1], prepareNext]
    ].forEach(([button, prepare]) => {
        button?.addEventListener('pointerenter', prepare, { passive: true });
        button?.addEventListener('pointerdown', prepare, { passive: true });
        button?.addEventListener('focus', prepare);
    });

}

const flow = document.querySelector('.arthouse-svg-layer');
let flowVisible = false;
function syncFlow() {
    flow?.classList.toggle('is-visible', flowVisible && !document.hidden && !motionPreference.matches);
}
if (flow && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
        flowVisible = entries[0].isIntersecting;
        syncFlow();
    }).observe(flow);
}

document.addEventListener('visibilitychange', () => {
    syncStickers();
    syncFlow();
    syncAmbientMotion();
});
motionPreference.addEventListener('change', () => {
    syncStickers();
    syncFlow();
    syncAmbientMotion();
});
