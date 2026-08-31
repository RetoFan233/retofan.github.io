// aHR0cHM6Ly9naXRodWIuY29tL2x1b3N0MjYvYWNhZGVtaWMtaG9tZXBhZ2U=
// Vanilla JS: no jQuery, no Bootstrap JS, no Popper.
// Images use native loading="lazy", so no lazy-load library either.
(function () {
    'use strict';

    var ready = function (fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    };

    ready(function () {
        var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // ---- Theme toggle (initial theme is applied in <head> before first paint) ----
        var themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', function () {
                var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                themeToggle.setAttribute('aria-pressed', next === 'dark');
                try { localStorage.setItem('theme', next); } catch (e) {}
            });
            themeToggle.setAttribute('aria-pressed',
                document.documentElement.getAttribute('data-theme') === 'dark');
        }

        // ---- Navbar collapse (replaces Bootstrap's collapse plugin) ----
        var navToggler = document.querySelector('.navbar-toggler');
        var navTarget = navToggler && document.querySelector(navToggler.getAttribute('data-target'));
        if (navToggler && navTarget) {
            navToggler.addEventListener('click', function () {
                var open = navTarget.classList.toggle('show');
                navToggler.setAttribute('aria-expanded', open);
            });
            // Close after following a link on mobile.
            navTarget.addEventListener('click', function (e) {
                if (e.target.closest('a') && navTarget.classList.contains('show')) {
                    navTarget.classList.remove('show');
                    navToggler.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // ---- Scroll-driven chrome: navbar shadow + back-to-top ----
        // rAF-throttled so the handler never runs more than once per frame.
        var navbar = document.querySelector('.navbar');
        var backToTop = document.querySelector('.back-to-top');
        var ticking = false;

        function updateOnScroll() {
            var y = window.scrollY || window.pageYOffset;
            if (navbar) navbar.classList.toggle('navbar-scrolled', y > 10);
            if (backToTop) backToTop.classList.toggle('show', y > 400);
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(updateOnScroll); }
        }, { passive: true });
        updateOnScroll();

        if (backToTop) {
            backToTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            });
        }

        // ---- Year sidebar scrollspy (replaces Bootstrap's scrollspy plugin) ----
        // Bootstrap's version needs a manual 'refresh' whenever the DOM changes;
        // IntersectionObserver recomputes on its own, so filtering just works.
        var yearNav = document.getElementById('navbar-year');
        if (yearNav) {
            var sections = [].slice.call(document.querySelectorAll('.pub-year-section'));
            var linkFor = function (year) {
                return yearNav.querySelector('a[href="#year-' + year + '"]');
            };
            var setActive = function (year) {
                [].forEach.call(yearNav.querySelectorAll('.nav-link'), function (a) {
                    a.classList.remove('active');
                });
                var link = linkFor(year);
                if (link) link.classList.add('active');
            };
            var visible = new Map();
            var spy = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    var year = entry.target.getAttribute('data-year');
                    if (entry.isIntersecting) visible.set(year, entry.intersectionRatio);
                    else visible.delete(year);
                });
                if (!visible.size) return;
                // Pick the section occupying the most of the viewport.
                var best = null, bestRatio = -1;
                visible.forEach(function (ratio, year) {
                    if (ratio > bestRatio) { bestRatio = ratio; best = year; }
                });
                if (best) setActive(best);
            }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1], rootMargin: '-80px 0px -40% 0px' });
            sections.forEach(function (s) { spy.observe(s); });
        }

        // ---- Publication type filter ----
        function applyPubFilter(type) {
            [].forEach.call(document.querySelectorAll('.pub-item'), function (item) {
                var match = type === 'all' || item.getAttribute('data-pub-type') === type;
                item.classList.toggle('d-none', !match);
            });
            [].forEach.call(document.querySelectorAll('.pub-year-section'), function (section) {
                var hasVisible = !!section.querySelector('.pub-item:not(.d-none)');
                section.classList.toggle('d-none', !hasVisible);
                var yearLink = document.querySelector('#navbar-year a[href="#year-' + section.getAttribute('data-year') + '"]');
                if (yearLink) yearLink.classList.toggle('d-none', !hasVisible);
            });
            // Mark the last visible row per card so its divider doesn't float
            // above the card edge.
            [].forEach.call(document.querySelectorAll('.pub-year-section .glass-card'), function (card) {
                [].forEach.call(card.querySelectorAll('.pub-item.pub-last-visible'), function (el) {
                    el.classList.remove('pub-last-visible');
                });
                var vis = card.querySelectorAll('.pub-item:not(.d-none)');
                if (vis.length) vis[vis.length - 1].classList.add('pub-last-visible');
            });
        }

        var filterBtns = [].slice.call(document.querySelectorAll('.pub-filter-btn'));
        if (filterBtns.length) {
            filterBtns.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    filterBtns.forEach(function (b) {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                    applyPubFilter(btn.getAttribute('data-filter'));
                });
            });
            applyPubFilter('all');
        }

        // ---- Native <dialog> (replaces Bootstrap's modal plugin) ----
        // <dialog> gives focus trapping, Esc-to-close and the backdrop for free.
        [].forEach.call(document.querySelectorAll('[data-open-dialog]'), function (trigger) {
            trigger.addEventListener('click', function (e) {
                e.preventDefault();
                var dlg = document.getElementById(trigger.getAttribute('data-open-dialog'));
                if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
            });
        });
        [].forEach.call(document.querySelectorAll('dialog'), function (dlg) {
            var closer = dlg.querySelector('[data-close-dialog]');
            if (closer) closer.addEventListener('click', function () { dlg.close(); });
            // Click outside the content closes it.
            dlg.addEventListener('click', function (e) {
                if (e.target === dlg) dlg.close();
            });
        });

        // ---- News card show more / show less ----
        [].forEach.call(document.querySelectorAll('.news-toggle'), function (toggle) {
            toggle.addEventListener('click', function () {
                var card = toggle.closest('.news-card');
                var expanded = card.classList.toggle('news-expanded');
                toggle.setAttribute('aria-expanded', expanded);
                var label = toggle.querySelector('.news-toggle-label');
                if (label) {
                    label.textContent = expanded
                        ? toggle.getAttribute('data-less-label')
                        : toggle.getAttribute('data-more-label');
                }
            });
        });

        // ---- Scroll reveal ----
        // Only top-level cards animate. Nested cards (the d-md-none mobile
        // publication rows live inside an outer .glass-card) must be excluded:
        // when hidden at the current breakpoint they never intersect, so they
        // would stay stuck at opacity 0 and disappear at the other breakpoint.
        if (!prefersReducedMotion) {
            var candidates = [].slice.call(document.querySelectorAll('.glass-card, .card.border-0'));
            var revealObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-revealed');
                        revealObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

            candidates.forEach(function (el) {
                if (el.parentElement && el.parentElement.closest('.glass-card, .card.border-0')) return;
                el.classList.add('will-reveal');
                revealObserver.observe(el);
            });

            // Safety net: content must never stay invisible. If anything failed
            // to intersect (offscreen container, breakpoint change, observer
            // never firing), force it visible.
            window.setTimeout(function () {
                [].forEach.call(document.querySelectorAll('.will-reveal:not(.is-revealed)'), function (el) {
                    el.classList.add('is-revealed');
                });
            }, 3000);
        }
    });
})();
