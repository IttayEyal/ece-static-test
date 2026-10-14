
(function() {
    "use strict";
    
    // Получаем оригинальный descriptor ДО создания блокировки
    var originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    var originalCookieGetter = originalCookieDescriptor ? originalCookieDescriptor.get : function() {
        return Object.getOwnPropertyDescriptor(Document.prototype, "cookie").get.call(document);
    };
    
    // Функция проверки согласия (используем оригинальный getter, чтобы обойти блокировку)
    function hasConsent() {
        try {
            // Используем оригинальный getter, чтобы получить реальные куки
            var allCookies = originalCookieGetter.call(document);
            var consentCookie = allCookies.match(/(^|;)\s*w3d_consent=([^;]*)/);
            if (!consentCookie) return false;
            
            var consent = JSON.parse(decodeURIComponent(consentCookie[2]));
            return consent && (consent.analytics == 1 || consent.marketing == 1);
        } catch(e) {
            return false;
        }
    }
    
    // Если согласие уже дано - не блокируем
    if (hasConsent()) {
        console.log("✅ Consent: Cookies are ACTIVE (consent given)");
        return; // Выходим из скрипта блокировки
    }
    
    // БЕЛЫЙ СПИСОК: только эти куки разрешены
    var allowedCookies = ["w3d_consent","w3d_cs","wordpress_","wp-settings","wp-settings-time","wordpress_logged_in_","wordpress_test_cookie","PHPSESSID","woocommerce_","wp_woocommerce_","itsec_interstitial_browser"];
    var blockerActive = true;
    
    // Логируем, что блокировка активна
    console.log("🚫 Consent: Cookies are BLOCKED (waiting for consent)");
    
    function isCookieAllowed(cookieName) {
        // Если блокировка отключена - разрешаем все
        if (!blockerActive) return true;
        
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
    
    // СТАНДАРТНЫЙ ПЕРЕХВАТ: Object.defineProperty для document.cookie (самый частый и безопасный способ)
    if (originalCookieDescriptor) {
        try {
            // Проверяем, можно ли переопределить свойство (не было ли оно уже переопределено)
            var currentDescriptor = Object.getOwnPropertyDescriptor(document, "cookie");
            if (currentDescriptor && currentDescriptor.configurable !== false) {
                Object.defineProperty(document, "cookie", {
                    configurable: true,
                    set: function(value) {
                        // Проверяем согласие перед каждой установкой куки
                        if (hasConsent()) {
                            if (blockerActive) {
                                disableBlocker();
                            }
                            // Используем оригинальный setter напрямую
                            return originalCookieDescriptor.set.call(document, value);
                        }
                        
                        var cookieName = value.split("=")[0].trim();
                        if (!isCookieAllowed(cookieName) && !isRemovalAttempt(value)) {
                            // Блокируем куку (логирование отдельных куки убрано для чистоты консоли)
                            return;
                        }
                        return originalCookieDescriptor.set.call(document, value);
                    },
                    get: function() {
                        return originalCookieDescriptor.get.call(document);
                    }
                });
            }
        } catch(e) {
            // Если свойство уже переопределено или неконфигурируемо - это нормально
        }
    }
    
    // Функция полного отключения блокировки
    var cleanupInterval = null;
    var consentCheckInterval = null;
    var eventHandlers = [];
    
    function disableBlocker() {
        if (!blockerActive) return; // Уже отключено
        
        blockerActive = false;
        console.log("✅ Consent: Cookies are now ACTIVE (consent detected)");
        
        // Восстанавливаем оригинальный document.cookie
        if (originalCookieDescriptor) {
            try {
                Object.defineProperty(document, "cookie", originalCookieDescriptor);
            } catch(e) {
                // Если не удалось восстановить - это нормально, возможно уже восстановлено
            }
        }
        
        // Останавливаем все интервалы
        if (cleanupInterval) {
            clearInterval(cleanupInterval);
            cleanupInterval = null;
        }
        if (consentCheckInterval) {
            clearInterval(consentCheckInterval);
            consentCheckInterval = null;
        }
        
        // Удаляем все обработчики событий
        eventHandlers.forEach(function(handler) {
            try {
                document.removeEventListener(handler.event, handler.fn, true);
                window.removeEventListener(handler.event, handler.fn, true);
            } catch(e) {}
        });
        eventHandlers = [];
    }
    
    // ПРОСТАЯ очистка: удаляем уже установленные блокируемые куки
    function cleanupCookies() {
        // Если согласие дано - отключаем блокировку полностью
        if (hasConsent()) {
            disableBlocker();
            return;
        }
        
        // Если блокировка отключена - не делаем ничего
        if (!blockerActive) return;
        
        try {
            var allCookiesStr = originalCookieGetter.call(document);
            if (!allCookiesStr) return;
            
            var allCookies = allCookiesStr.split(";");
            var hostname = window.location.hostname;
            var expireDate = "Thu, 01 Jan 1970 00:00:00 UTC";
            
            for (var i = 0; i < allCookies.length; i++) {
                var cookie = allCookies[i].trim();
                if (cookie) {
                    var cookieName = cookie.split("=")[0].trim();
                    if (!isCookieAllowed(cookieName)) {
                        // Используем оригинальный setter напрямую, чтобы обойти наш перехват
                        if (originalCookieDescriptor && originalCookieDescriptor.set) {
                            originalCookieDescriptor.set.call(document, cookieName + "=; expires=" + expireDate + "; path=/");
                            originalCookieDescriptor.set.call(document, cookieName + "=; expires=" + expireDate + "; path=/; domain=" + hostname);
                            if (hostname.indexOf(".") > 0) {
                                originalCookieDescriptor.set.call(document, cookieName + "=; expires=" + expireDate + "; path=/; domain=." + hostname.split(".").slice(-2).join("."));
                            }
                        } else {
                            document.cookie = cookieName + "=; expires=" + expireDate + "; path=/";
                            document.cookie = cookieName + "=; expires=" + expireDate + "; path=/; domain=" + hostname;
                            if (hostname.indexOf(".") > 0) {
                                document.cookie = cookieName + "=; expires=" + expireDate + "; path=/; domain=." + hostname.split(".").slice(-2).join(".");
                            }
                        }
                    }
                }
            }
        } catch(e) {
            // Тихая обработка ошибок
        }
    }
    
    // Проверяем согласие сразу - если дано, не запускаем блокировку
    if (hasConsent()) {
        disableBlocker();
        return; // Выходим - блокировка не нужна
    }
    
    // Очищаем сразу и периодически (оптимальная частота для перехвата)
    cleanupCookies();
    
    // Запускаем интервалы только если блокировка активна
    if (blockerActive) {
        setTimeout(function() { 
            if (blockerActive && !hasConsent()) cleanupCookies(); 
        }, 50);
        setTimeout(function() { 
            if (blockerActive && !hasConsent()) cleanupCookies(); 
        }, 100);
        setTimeout(function() { 
            if (blockerActive && !hasConsent()) cleanupCookies(); 
        }, 200);
        setTimeout(function() { 
            if (blockerActive && !hasConsent()) cleanupCookies(); 
        }, 500);
        
        cleanupInterval = setInterval(function() {
            if (!blockerActive || hasConsent()) {
                if (hasConsent()) disableBlocker();
                if (cleanupInterval) {
                    clearInterval(cleanupInterval);
                    cleanupInterval = null;
                }
                return;
            }
            cleanupCookies();
        }, 500);
        
        // Также очищаем при важных событиях
        var cleanupHandler = function() {
            if (blockerActive && !hasConsent()) cleanupCookies();
        };
        
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", cleanupHandler, true);
            eventHandlers.push({event: "DOMContentLoaded", fn: cleanupHandler});
        }
        window.addEventListener("load", cleanupHandler, true);
        eventHandlers.push({event: "load", fn: cleanupHandler});
        
        // Слушаем изменения в куке согласия
        var lastConsentCheck = Date.now();
        consentCheckInterval = setInterval(function() {
            if (Date.now() - lastConsentCheck > 1000) {
                lastConsentCheck = Date.now();
                if (hasConsent()) {
                    disableBlocker();
                }
            }
        }, 1000);
    }
})();
