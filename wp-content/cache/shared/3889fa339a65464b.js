
        (function() {
            'use strict';

            // Паттерны из PHP
            var criticalPatterns = ["wp-includes\/js\/","wp-admin\/js\/","jquery","wp-polyfill","wp-i18n","wp-hooks","wp-api","regenerator-runtime","wp-element","wp-components","lodash","moment","react","elementor","\/elementor\/","elementor-frontend","elementor-webpack","swiper","divi-","et-builder","fusion-","vc_","js_composer","beaver-builder","oxygen-","bricks-","woocommerce","wc-","contact-form-7","wpcf7","cf7","gravity","ninja-forms","wpforms","formidable","wp-rocket","autoptimize","litespeed","w3tc","cache","yoast","rank-math","all-in-one-seo","slick","owl.carousel","aos","animate","parallax","isotope","masonry","lightbox","magnific","fancybox","fonts.googleapis.com","fonts.gstatic.com","fontawesome","font-awesome","cdnjs.cloudflare.com\/ajax\/libs\/","unpkg.com","jsdelivr.net","w3d-cb-banner","web3d_consent","w3dConsentUpdated","recaptcha","hcaptcha","turnstile"];
            var trackingPatterns = ["google-analytics.com\/analytics.js","google-analytics.com\/ga.js","googletagmanager.com\/gtag\/js","googletagmanager.com\/gtm.js","doubleclick.net","googlesyndication.com","googleadservices.com","mc.yandex.ru","yandex.ru\/metrika","hotjar.com","mouseflow.com","crazyegg.com","clarity.ms","fullstory.com","logrocket.com","connect.facebook.net","facebook.net\/signals","snap.licdn.com","ads.linkedin.com","static.ads-twitter.com","analytics.tiktok.com","pinterest.com\/ct\/","adnxs.com","adsrvr.org","criteo.com","outbrain.com","taboola.com"];
            var allowedCookies = ["w3d_consent","w3d_cs","wordpress_","wp-settings","wp-settings-time","wordpress_logged_in_","wordpress_test_cookie","PHPSESSID","woocommerce_","wp_woocommerce_","itsec_interstitial_browser"];
            var blockerActive = true;

            function hasConsent() {
                try {
                    var cookies = document.cookie || '';
                    var match = cookies.match(/(^|;)\s*w3d_consent=([^;]*)/);
                    if (!match) return false;
                    var consent = JSON.parse(decodeURIComponent(match[2]));
                    var hasConsentValue = consent && (consent.analytics == 1 || consent.marketing == 1);
                    if (hasConsentValue && blockerActive) {
                        blockerActive = false;
                    }
                    return hasConsentValue;
                } catch (e) {
                    return false;
                }
            }

            // Проверяем consent сразу при загрузке
            if (hasConsent()) {
                blockerActive = false;

                // Автоматически восстанавливаем заблокированные скрипты
                function quickReleaseScripts() {
                    var scripts = document.querySelectorAll('script[type="text/plain"][data-category]');
                    var released = 0;
                    scripts.forEach(function(script) {
                        var category = script.getAttribute('data-category');
                        var consent = hasConsent();
                        if (!consent) return;

                        try {
                            var cookies = document.cookie || '';
                            var match = cookies.match(/(^|;)\s*w3d_consent=([^;]*)/);
                            if (!match) return;
                            var consentData = JSON.parse(decodeURIComponent(match[2]));
                            var allowAnalytics = consentData && Number(consentData.analytics) === 1;
                            var allowMarketing = consentData && Number(consentData.marketing) === 1;

                            if ((category === 'analytics' && !allowAnalytics) ||
                                (category === 'marketing' && !allowMarketing)) {
                                return;
                            }

                            var newScript = document.createElement('script');
                            var scriptType = script.getAttribute('data-orig-type') || 'text/javascript';
                            newScript.type = scriptType;
                            var dataSrc = script.getAttribute('data-src');
                            if (dataSrc) {
                                newScript.src = dataSrc;
                            } else {
                                newScript.innerHTML = script.innerHTML;
                            }
                            script.parentNode.insertBefore(newScript, script.nextSibling);
                            script.remove();
                            released++;
                        } catch (e) {
                            // Silent error handling
                        }
                    });
                }

                // Восстанавливаем сразу и после DOM готов
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', quickReleaseScripts);
                } else {
                    setTimeout(quickReleaseScripts, 50);
                }
            }

            function isCritical(src) {
                if (!src) return false;
                src = src.toLowerCase();
                for (var i = 0; i < criticalPatterns.length; i++) {
                    if (src.indexOf(criticalPatterns[i].toLowerCase()) !== -1) {
                        return true;
                    }
                }
                return false;
            }

            function isTracking(src) {
                if (!src) return false;
                src = src.toLowerCase();
                for (var i = 0; i < trackingPatterns.length; i++) {
                    if (src.indexOf(trackingPatterns[i].toLowerCase()) !== -1) {
                        return true;
                    }
                }
                return false;
            }

            var marketingHintPatterns = [
                'doubleclick.net',
                'googlesyndication.com',
                'googleadservices.com',
                'connect.facebook.net',
                'fbevents.js',
                'analytics.tiktok.com',
                'ads.linkedin.com',
                'snap.licdn.com',
                'adsrvr.org',
                'adnxs.com'
            ];

            function getTrackingCategory(src) {
                if (!src) return 'analytics';
                src = src.toLowerCase();
                for (var i = 0; i < marketingHintPatterns.length; i++) {
                    if (src.indexOf(marketingHintPatterns[i]) !== -1) {
                        return 'marketing';
                    }
                }
                return 'analytics';
            }

            var scriptProto = window.HTMLScriptElement ? HTMLScriptElement.prototype : null;
            var originalScriptSetAttribute = scriptProto ? scriptProto.setAttribute : null;

            function blockScriptElement(el, src) {
                if (!el || el.tagName !== 'SCRIPT') return;
                if (el.getAttribute && el.getAttribute('data-blocked') === 'web3d-consent') return;

                if (hasConsent() || !blockerActive) {
                    if (src) {
                        try {
                            el.src = src;
                        } catch (e) {
                            el.setAttribute('src', src);
                        }
                    }
                    return;
                }

                var category = getTrackingCategory(src || '');
                var originalType = el.getAttribute ? (el.getAttribute('type') || 'text/javascript') : 'text/javascript';

                try {
                    if (originalScriptSetAttribute) {
                        originalScriptSetAttribute.call(el, 'type', 'text/plain');
                        originalScriptSetAttribute.call(el, 'data-blocked', 'web3d-consent');
                        originalScriptSetAttribute.call(el, 'data-category', category);
                        originalScriptSetAttribute.call(el, 'data-orig-type', originalType);
                        if (src) {
                            originalScriptSetAttribute.call(el, 'data-src', src);
                        }
                    } else {
                        el.type = 'text/plain';
                        el.setAttribute('data-blocked', 'web3d-consent');
                        el.setAttribute('data-category', category);
                        el.setAttribute('data-orig-type', originalType);
                        if (src) el.setAttribute('data-src', src);
                    }
                } catch (e) {
                    // fallback
                    el.type = 'text/plain';
                    el.setAttribute('data-blocked', 'web3d-consent');
                    el.setAttribute('data-category', category);
                    el.setAttribute('data-orig-type', originalType);
                    if (src) el.setAttribute('data-src', src);
                }
                el.text = '';
            }

            // Сообщаем о блокировке куки максимум один раз
            var blockedCookieNoticeShown = false;

            function logBlockedCookie(name) {
                if (blockedCookieNoticeShown) return;
                blockedCookieNoticeShown = true;
            }

            // ========== БЛОКИРОВКА ВСЕХ COOKIES (кроме белого списка) ==========
            var originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
            if (!originalCookieDescriptor || !originalCookieDescriptor.set) {
                return; // Не можем перехватить
            }

            // Проверяем, не было ли свойство уже переопределено
            var currentDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
            if (currentDescriptor && currentDescriptor.configurable === false) {
                // Свойство уже переопределено и неконфигурируемо - пропускаем
                return;
            }

            // БЕЛЫЙ СПИСОК: синхронизирован с серверным (из PHP)
            // allowedCookies уже определен выше из PHP

            // Функция проверки, разрешена ли кука
            function isCookieAllowed(cookieName) {
                for (var i = 0; i < allowedCookies.length; i++) {
                    if (cookieName === allowedCookies[i] || cookieName.indexOf(allowedCookies[i]) === 0) {
                        return true;
                    }
                }
                return false;
            }

            try {
                Object.defineProperty(document, 'cookie', {
                    configurable: true,
                    set: function(value) {
                        if (!blockerActive || hasConsent()) {
                            blockerActive = false;
                            return originalCookieDescriptor.set.call(document, value);
                        }
                        var cookieName = value.split('=')[0].trim();

                        // Блокируем ВСЕ куки, кроме белого списка
                        if (!isCookieAllowed(cookieName) && !isRemovalAttempt(value)) {
                            logBlockedCookie(cookieName);
                            return;
                        }

                        return originalCookieDescriptor.set.call(document, value);
                    },
                    get: function() {
                        return originalCookieDescriptor.get.call(document);
                    }
                });
            } catch (e) {
                // Если свойство уже переопределено - это нормально, просто пропускаем
            }

            // ========== БЛОКИРОВКА ВНЕШНИХ СКРИПТОВ ==========
            var originalCreate = document.createElement;
            document.createElement = function(tag) {
                var el = originalCreate.call(document, tag);

                if (tag.toLowerCase() === 'script') {
                    var origSetAttr = el.setAttribute.bind(el);

                    el.setAttribute = function(name, value) {
                        if (name === 'src' && typeof value === 'string') {
                            if (!blockerActive || hasConsent()) {
                                return origSetAttr(name, value);
                            }
                            // Критические - разрешаем
                            if (isCritical(value)) {
                                return origSetAttr(name, value);
                            }

                            // Tracking - блокируем
                            if (isTracking(value)) {
                                blockScriptElement(el, value);
                                return;
                            }
                        }
                        return origSetAttr(name, value);
                    };
                }

                return el;
            };

            if (scriptProto && originalScriptSetAttribute) {
                scriptProto.setAttribute = function(name, value) {
                    if (!blockerActive || hasConsent()) {
                        return originalScriptSetAttribute.call(this, name, value);
                    }
                    if (
                        name &&
                        name.toLowerCase() === 'src' &&
                        typeof value === 'string' &&
                        !isCritical(value) &&
                        isTracking(value)
                    ) {
                        blockScriptElement(this, value);
                        return;
                    }
                    return originalScriptSetAttribute.call(this, name, value);
                };
            }

            if (scriptProto) {
                var scriptSrcDescriptor = Object.getOwnPropertyDescriptor(scriptProto, 'src');
                if (scriptSrcDescriptor && scriptSrcDescriptor.set && scriptSrcDescriptor.configurable !== false) {
                    Object.defineProperty(scriptProto, 'src', {
                        configurable: true,
                        get: scriptSrcDescriptor.get,
                        set: function(value) {
                            if (!blockerActive || hasConsent()) {
                                return scriptSrcDescriptor.set.call(this, value);
                            }
                            if (typeof value === 'string' && !isCritical(value) && isTracking(value)) {
                                blockScriptElement(this, value);
                                return value;
                            }
                            return scriptSrcDescriptor.set.call(this, value);
                        }
                    });
                }
            }

            // ========== БЛОКИРОВКА INLINE СКРИПТОВ ==========
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.tagName !== 'SCRIPT') return;
                        if (node.type === 'text/plain') return;
                        if (node.getAttribute('data-blocked')) return;

                        var src = node.src || '';
                        var content = node.textContent || node.innerHTML || '';

                        // Пропускаем пустые
                        if (!src && content.length < 20) return;

                        // Критические - разрешаем
                        if (isCritical(src) || isCritical(content)) {
                            return;
                        }

                        // Проверяем inline tracking код
                        var trackingInlinePatterns = [
                            /gtag\s*\(\s*['"]config['"]/,
                            /gtag\s*\(\s*['"]event['"]/,
                            /ga\s*\(\s*['"]create['"]/,
                            /GoogleAnalyticsObject/,
                            /fbq\s*\(\s*['"]init['"]/,
                            /fbq\s*\(\s*['"]track['"]/,
                            /_linkedin_data_partner_id/,
                            /ttq\.load/,
                            /ym\s*\(\s*\d+/,
                            /dataLayer\.push/
                        ];

                        var isTrackingInline = false;
                        for (var i = 0; i < trackingInlinePatterns.length; i++) {
                            if (trackingInlinePatterns[i].test(content)) {
                                isTrackingInline = true;
                                break;
                            }
                        }

                        if (isTrackingInline || isTracking(src)) {
                            var originalType = node.getAttribute('type') || 'text/javascript';
                            node.type = 'text/plain';
                            node.setAttribute('data-blocked', 'web3d-consent');
                            node.setAttribute('data-category', 'analytics');
                            node.setAttribute('data-orig-type', originalType);
                            if (src) node.setAttribute('data-src', src);
                            node.textContent = '';
                        }
                    });
                });
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            // ========== БЛОКИРОВКА document.write ==========
            var origWrite = document.write;
            document.write = function(content) {
                if (typeof content === 'string' && content.length > 0) {
                    for (var i = 0; i < trackingPatterns.length; i++) {
                        if (content.indexOf(trackingPatterns[i]) !== -1) {
                            return;
                        }
                    }
                }
                return origWrite.call(document, content);
            };


        })();
    