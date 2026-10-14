
        (function() {
            'use strict';

            var COOKIE_NAME = 'w3d_consent';
            var COOKIE_DAYS = 365;
            var SHOW_CATEGORIES = false;
            var initialized = false;

            function getCookie(name) {
                var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
                return v ? decodeURIComponent(v[2]) : null;
            }

            function setCookie(name, value, days) {
                var d = new Date();
                d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * days);
                document.cookie = name + "=" + encodeURIComponent(value) + ";path=/;expires=" + d.toGMTString() + ";SameSite=Lax";
            }

            // Compact consent key read by PHP and used by WP Rocket as the dynamic cookie.
            var SERVER_KEY_COOKIE = 'w3d_cs';

            function serverKeyFor(consent) {
                if (!consent) return '';
                return (Number(consent.analytics) === 1 ? 'a' : '') + (Number(consent.marketing) === 1 ? 'm' : '');
            }

            function syncServerKey(consent) {
                var key = serverKeyFor(consent);
                if (key) {
                    setCookie(SERVER_KEY_COOKIE, key, COOKIE_DAYS);
                } else {
                    setCookie(SERVER_KEY_COOKIE, '', -1);
                }
            }

            /**
             * Visitors who consented before 4.0.1 have w3d_consent but no w3d_cs, so the
             * server rendered the wrong page variant. Fix the key and reload once per session.
             */
            function ensureServerKey(consent) {
                var expected = serverKeyFor(consent);
                if ((getCookie(SERVER_KEY_COOKIE) || '') === expected) return;

                syncServerKey(consent);
                try {
                    if (sessionStorage.getItem('w3d_cs_synced')) return;
                    sessionStorage.setItem('w3d_cs_synced', '1');
                } catch (e) {
                    return; // No sessionStorage: skip the reload rather than risk a loop.
                }
                location.reload();
            }

            function getStoredConsentData() {
                var stored = getCookie(COOKIE_NAME);
                if (!stored) return null;
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    return null;
                }
            }

            function isConsentExpired(consentData) {
                // Проверяем, истек ли срок действия согласия (прошло ли больше года)
                if (!consentData || !consentData.timestamp) return true;

                var now = Date.now();
                var consentTime = parseInt(consentData.timestamp, 10);
                var daysSinceConsent = (now - consentTime) / (1000 * 60 * 60 * 24); // миллисекунды в дни

                // Если прошло больше года (365 дней), согласие истекло
                return daysSinceConsent > COOKIE_DAYS;
            }

            function hasStoredConsent() {
                var parsed = getStoredConsentData();
                if (!parsed) return false;

                // Проверяем срок действия
                if (isConsentExpired(parsed)) {
                    // Удаляем истекшее cookie
                    setCookie(COOKIE_NAME, '', -1);
                    syncServerKey(null);
                    return false;
                }

                return typeof parsed.functional !== 'undefined' ||
                    typeof parsed.analytics !== 'undefined' ||
                    typeof parsed.marketing !== 'undefined';
            }

            function hasAnalyticsConsent() {
                var parsed = getStoredConsentData();
                return !!(parsed && Number(parsed.analytics) === 1);
            }

            function hasMarketingConsent() {
                var parsed = getStoredConsentData();
                return !!(parsed && Number(parsed.marketing) === 1);
            }

            function restoreBlockedIframe(wrapper) {
                if (!wrapper || wrapper.getAttribute('data-restored') === '1') return;
                var encoded = wrapper.getAttribute('data-orig');
                if (!encoded) return;

                var decoded = '';
                try {
                    decoded = atob(encoded);
                } catch (e) {
                    return;
                }

                if (!decoded) return;

                var container = document.createElement('div');
                container.innerHTML = decoded.trim();
                var iframe = container.firstElementChild;
                if (!iframe) return;

                wrapper.parentNode.replaceChild(iframe, wrapper);
                wrapper.setAttribute('data-restored', '1');
            }

            function restoreBlockedEmbeds() {
                document.querySelectorAll('.w3d-blocked-iframe[data-orig]').forEach(function(wrapper) {
                    restoreBlockedIframe(wrapper);
                });
            }

            function releaseBlockedScripts(consent) {
                consent = consent || getStoredConsentData();
                if (!consent) return;

                var allowAnalytics = Number(consent.analytics) === 1;
                var allowMarketing = Number(consent.marketing) === 1;

                if (!allowAnalytics && !allowMarketing) return;

                var scriptsFound = 0;
                var scriptsRestored = [];
                document.querySelectorAll('script[type="text/plain"][data-category]').forEach(function(script) {
                    var category = script.getAttribute('data-category');
                    if (
                        (category === 'analytics' && !allowAnalytics) ||
                        (category === 'marketing' && !allowMarketing)
                    ) {
                        return;
                    }
                    scriptsFound++;

                    var newScript = document.createElement('script');
                    var scriptType = script.getAttribute('data-orig-type') || script.getAttribute('type') || 'text/javascript';
                    newScript.type = scriptType;
                    var dataSrc = script.getAttribute('data-src');
                    if (dataSrc) {
                        newScript.src = dataSrc;
                    } else {
                        var inlineContent = script.innerHTML || script.textContent || '';
                        if (inlineContent.length > 0) {
                            newScript.innerHTML = inlineContent;
                        } else {
                            return;
                        }
                    }

                    scriptsRestored.push({
                        src: dataSrc || 'inline',
                        category: category,
                        type: scriptType
                    });
                    script.parentNode.insertBefore(newScript, script.nextSibling);
                    script.remove();
                });

                if (allowMarketing) {
                    restoreBlockedEmbeds();
                }
            }

            window.w3dUnblockIframe = function(triggerEl) {
                var wrapper = null;
                if (triggerEl) {
                    if (triggerEl.closest) {
                        wrapper = triggerEl.closest('.w3d-blocked-iframe');
                    } else {
                        var node = triggerEl;
                        while (node && node !== document.body) {
                            if (node.classList && node.classList.contains('w3d-blocked-iframe')) {
                                wrapper = node;
                                break;
                            }
                            node = node.parentNode;
                        }
                    }
                }
                if (!wrapper) return;

                if (!hasMarketingConsent()) {
                    showBanner();
                    if (SHOW_CATEGORIES) {
                        var categories = document.getElementById('w3d-cb-categories');
                        var simple = document.getElementById('w3d-cb-simple-buttons');
                        var advanced = document.getElementById('w3d-cb-advanced-buttons');
                        if (categories) categories.style.display = 'block';
                        if (simple) simple.style.display = 'none';
                        if (advanced) advanced.style.display = 'flex';
                    }
                    return;
                }

                restoreBlockedIframe(wrapper);
            };

            function showBanner() {
                var banner = document.getElementById('w3d-cb-banner');
                if (banner) {
                    banner.style.removeProperty('display');
                    banner.style.setProperty('display', 'block', 'important');
                }
            }

            function hideBanner() {
                var banner = document.getElementById('w3d-cb-banner');
                if (banner) {
                    banner.style.setProperty('display', 'none', 'important');
                }
            }

            function saveConsent(functional, analytics, marketing) {
                var consent = {
                    functional: functional ? 1 : 0,
                    analytics: analytics ? 1 : 0,
                    marketing: marketing ? 1 : 0,
                    timestamp: Date.now()
                };

                setCookie(COOKIE_NAME, JSON.stringify(consent), COOKIE_DAYS);
                syncServerKey(consent);

                hideBanner();

                var xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://ece.technion.ac.il/wp-admin/admin-ajax.php', true);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.send('action=web3d_save_consent_log&consent=' + encodeURIComponent(JSON.stringify(consent)));

                // Разблокируем скрипты и перезагружаем
                if (analytics || marketing) {
                    setTimeout(function() {
                        releaseBlockedScripts(consent);

                        setTimeout(function() {
                            if (typeof gtag !== 'undefined') {
                                try {
                                    gtag('consent', 'update', {
                                        'analytics_storage': analytics ? 'granted' : 'denied',
                                        'ad_storage': marketing ? 'granted' : 'denied'
                                    });
                                } catch (e) {
                                    // Silent error handling
                                }
                            }

                            setTimeout(function() {
                                location.reload();
                            }, 800);
                        }, 300);
                    }, 200);
                }

                if (!analytics && !marketing && typeof gtag !== 'undefined') {
                    gtag('consent', 'update', {
                        'analytics_storage': 'denied',
                        'ad_storage': 'denied'
                    });
                }
            }

            function initBanner() {
                if (initialized) return;

                var banner = document.getElementById('w3d-cb-banner');
                if (!banner) return;

                var existingConsent = getStoredConsentData();

                // Проверяем срок действия согласия (прошло ли больше года)
                var isExpired = existingConsent ? isConsentExpired(existingConsent) : true;

                if (isExpired && existingConsent) {
                    // Согласие истекло (прошло больше года) - удаляем cookie
                    setCookie(COOKIE_NAME, '', -1);
                    existingConsent = null;
                }

                // Keep the server/cache key in line with the stored choice (also clears a stale key).
                ensureServerKey(existingConsent);

                // Показываем баннер, только если пользователь ещё не принял решение (ни принял, ни отклонил)
                // Или если согласие истекло (прошло больше года)
                if (existingConsent && !isExpired && hasStoredConsent()) {
                    // Согласие уже дано и не истекло - скрываем баннер
                    hideBanner();
                    if (existingConsent.analytics || existingConsent.marketing) {
                        setTimeout(function() {
                            releaseBlockedScripts(existingConsent);
                        }, 300);
                    }
                    initialized = true;
                    return;
                }

                // Согласие не дано или истекло (прошло больше года) - показываем баннер снова
                showBanner();

                // Event handlers
                document.getElementById('w3d-cb-accept').onclick = function() {
                    saveConsent(true, true, true);
                };

                document.getElementById('w3d-cb-deny').onclick = function() {
                    saveConsent(true, false, false);
                };

                if (document.getElementById('w3d-cb-close')) {
                    document.getElementById('w3d-cb-close').onclick = function() {
                        // Просто скрываем баннер без сохранения согласия
                        hideBanner();
                    };
                }

                if (SHOW_CATEGORIES) {
                    document.getElementById('w3d-cb-view').onclick = function() {
                        document.getElementById('w3d-cb-categories').style.display = 'block';
                        document.getElementById('w3d-cb-simple-buttons').style.display = 'none';
                        document.getElementById('w3d-cb-advanced-buttons').style.display = 'flex';
                    };

                    document.getElementById('w3d-cb-save').onclick = function() {
                        var analytics = document.getElementById('w3d-cb-analytics').checked;
                        var marketing = document.getElementById('w3d-cb-marketing').checked;
                        saveConsent(true, analytics, marketing);
                    };
                }

                initialized = true;
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initBanner);
            } else {
                initBanner();
            }
        })();
    