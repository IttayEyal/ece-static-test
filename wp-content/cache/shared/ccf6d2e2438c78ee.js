
        (function() {
            'use strict';

            // Do not block anything once analytics/marketing consent exists. Read the native
            // getter: another blocker may already have replaced document.cookie.
            try {
                var nativeCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
                var rawCookies = nativeCookie ? nativeCookie.get.call(document) : document.cookie;
                var consentMatch = (rawCookies || '').match(/(^|;)\s*w3d_consent=([^;]*)/);
                if (consentMatch) {
                    var storedConsent = JSON.parse(decodeURIComponent(consentMatch[2]));
                    if (storedConsent && (Number(storedConsent.analytics) === 1 || Number(storedConsent.marketing) === 1)) {
                        return;
                    }
                }
            } catch (e) {
                // Malformed consent cookie: keep blocking.
            }

            // БЕЛЫЙ СПИСОК куки (синхронизирован с PHP)
            var allowedCookies = ["w3d_consent","w3d_cs","wordpress_","wp-settings","wp-settings-time","wordpress_logged_in_","wordpress_test_cookie","PHPSESSID","woocommerce_","wp_woocommerce_","itsec_interstitial_browser"];
            var blockerActive = true;

            function isCookieAllowed(cookieName) {
                for (var i = 0; i < allowedCookies.length; i++) {
                    if (cookieName === allowedCookies[i] || cookieName.indexOf(allowedCookies[i]) === 0) {
                        return true;
                    }
                }
                return false;
            }

            function isRemovalAttempt(value) {
                var lower = value.toLowerCase();
                return lower.indexOf("expires=") !== -1 || lower.indexOf("max-age=0") !== -1;
            }

            // Выводим сообщение о блокировке максимум один раз
            var blockedCookieNoticeShown = false;

            function logBlockedCookie(name) {
                if (blockedCookieNoticeShown) return;
                blockedCookieNoticeShown = true;
            }

            // Перехватываем document.cookie СРАЗУ, до загрузки других скриптов
            var originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

            // Проверяем, не было ли свойство уже переопределено
            var currentDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
            if (currentDescriptor && currentDescriptor.configurable === false) {
                // Свойство уже переопределено и неконфигурируемо - пропускаем
                return;
            }

            try {
                if (!originalCookieDescriptor) {
                    // Fallback для старых браузеров
                    var cookieStore = {};
                    Object.defineProperty(document, 'cookie', {
                        configurable: true,
                        get: function() {
                            var allowed = [];
                            for (var name in cookieStore) {
                                if (isCookieAllowed(name)) {
                                    allowed.push(name + '=' + cookieStore[name]);
                                }
                            }
                            return allowed.join('; ');
                        },
                        set: function(value) {
                            var cookieName = value.split('=')[0].trim();
                            if (!isCookieAllowed(cookieName) && !isRemovalAttempt(value)) {
                                logBlockedCookie(cookieName);
                                return;
                            }
                            cookieStore[cookieName] = value.split('=').slice(1).join('=');
                        }
                    });
                } else {
                    Object.defineProperty(document, 'cookie', {
                        configurable: true,
                        set: function(value) {
                            var cookieName = value.split('=')[0].trim();
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
                }
            } catch (e) {
                // Если свойство уже переопределено - это нормально, просто пропускаем
            }

            // ОЧИСТКА: удаляем уже установленные куки, которые не в белом списке
            // Используем оригинальный getter для получения всех cookies
            function cleanupCookies() {
                try {
                    var allCookiesStr = originalCookieDescriptor ? originalCookieDescriptor.get.call(document) : document.cookie;
                    if (!allCookiesStr) return;

                    var allCookies = allCookiesStr.split(';');
                    var hostname = window.location.hostname;
                    var domainParts = hostname.split('.');
                    var expireDate = 'Thu, 01 Jan 1970 00:00:00 UTC';
                    var removed = false;

                    for (var i = 0; i < allCookies.length; i++) {
                        var cookie = allCookies[i].trim();
                        if (cookie) {
                            var cookieName = cookie.split('=')[0].trim();
                            if (!isCookieAllowed(cookieName)) {
                                // Пытаемся удалить куку разными способами (разные path и domain)
                                // Используем оригинальный setter напрямую, чтобы обойти наш перехват
                                if (originalCookieDescriptor && originalCookieDescriptor.set) {
                                    originalCookieDescriptor.set.call(document, cookieName + '=; expires=' + expireDate + '; path=/');
                                    originalCookieDescriptor.set.call(document, cookieName + '=; expires=' + expireDate + '; path=/; domain=' + hostname);
                                    if (domainParts.length > 1) {
                                        originalCookieDescriptor.set.call(document, cookieName + '=; expires=' + expireDate + '; path=/; domain=.' + domainParts.slice(-2).join('.'));
                                    }
                                } else {
                                    document.cookie = cookieName + '=; expires=' + expireDate + '; path=/';
                                    document.cookie = cookieName + '=; expires=' + expireDate + '; path=/; domain=' + hostname;
                                    if (domainParts.length > 1) {
                                        document.cookie = cookieName + '=; expires=' + expireDate + '; path=/; domain=.' + domainParts.slice(-2).join('.');
                                    }
                                }
                                removed = true;
                            }
                        }
                    }
                    if (removed) {}
                } catch (e) {
                    // Тихая обработка ошибок
                }
            }

            // Очищаем сразу и периодически
            cleanupCookies();
            setTimeout(cleanupCookies, 10);
            setTimeout(cleanupCookies, 100);
            setTimeout(cleanupCookies, 500);
        })();
    