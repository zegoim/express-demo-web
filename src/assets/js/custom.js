$(function () {
    "use strict";
    $(function () {
        $(".preloader").fadeOut();
    });
    jQuery(document).on('click', '.mega-dropdown', function (e) {
        e.stopPropagation()
    });
    // ============================================================== 
    // This is for the top header part and sidebar part
    // ==============================================================  
    var set = function () {
        var width = (window.innerWidth > 0) ? window.innerWidth : this.screen.width;
        var topOffset = 70;
        if (width < 500) {
            $("body").addClass("mini-sidebar");
            $('.navbar-brand span').hide();
            $(".scroll-sidebar, .slimScrollDiv").css("overflow-x", "visible").parent().css("overflow", "visible");
            $(".sidebartoggler i").addClass("ti-menu");
        } else {
            $("body").removeClass("mini-sidebar");
            $('.navbar-brand span').show();
            $(".sidebartoggler i").removeClass("ti-menu");
        }

        // var height = ((window.innerHeight > 0) ? window.innerHeight : this.screen.height) - 1;
        // height = height - topOffset;
        // if (height < 1) height = 1;
        // if (height > topOffset) {
        //     $(".page-wrapper").css("min-height", (height) + "px");
        // }
        $(".page-wrapper").css("min-height", "100vh");

    };
    $(window).ready(set);
    $(window).on("resize", set);


    // this is for close icon when navigation open in mobile view
    $(".nav-toggler").click(function () {
        $("body").toggleClass("show-sidebar");
        $(".nav-toggler i").toggleClass("ti-menu");
        $(".nav-toggler i").addClass("ti-close");
    });
    $(".sidebartoggler").on('click', function () {
        $(".sidebartoggler i").toggleClass("ti-menu");
    });

    // ============================================================== 
    // Auto select left navbar
    // ============================================================== 
    $(function () {
        var url = window.location;
        var element = $('ul#sidebarnav a').filter(function () {
            return this.href == url;
        }).addClass('active').parent().addClass('active');
        while (true) {
            if (element.is('li')) {
                element = element.parent().addClass('in').parent().addClass('active');
            } else {
                break;
            }
        }
    });

    // ============================================================== 
    // Sidebarmenu
    // ============================================================== 
    $(function () {
        $('#sidebarnav').metisMenu();
    });
    // ============================================================== 
    // Slimscrollbars
    // ============================================================== 
    $('.scroll-sidebar').slimScroll({
        position: 'left',
        size: "0",
        height: '100%',
        color: '#dcdcdc'
    });

    // ============================================================== 
    // Internationalization
    // ============================================================== 
    $(function () {
        let lang = localStorage.getItem('Language')
        console.log(lang);
        if (!lang) {
            const temp = navigator.language || navigator.userLanguage;
            lang = temp.substr(0, 2);
        }

        if (location.search) {
            if (location.search.indexOf('lang=en') > -1) {
                lang = 'en';
            } else if (location.search.indexOf('lang=zh') > -1) {
                lang = 'zh';
            }

            localStorage.setItem('Language', lang);
        }

        jQuery.i18n.properties({
            name: lang,
            path: '../../../assets/translate',
            language: lang,
            cache: false,
            mode: 'map',
            callback: function () {
                for (let i in $.i18n.map) {
                    $('[data-lang="' + i + '"]').html(`${$.i18n.map[i]}`);
                }
            }
        });
    })


    // ============================================================== 
    // Resize all elements
    // ============================================================== 
    $("body").trigger("resize");
});

var vConsole = new VConsole();

const util = {}

util.getBrow = () => {
    const result = function () {
        var u = navigator.userAgent, app = navigator.appVersion;
        return {
            // ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
            ios: u.indexOf('iPhone') > -1 || u.indexOf('iPad') > -1,
            android: u.indexOf('Android') > -1 || u.indexOf('Adr') > -1
        };
    }()

    for (let brow in result) {
        if (result[brow]) return brow
    }
    return 'web'
}


util.getCgi = (appId, serverUrl, cgi) => {
    // Test code, developers please ignore
    let appID = appId;
    let server = serverUrl;
    let cgiToken = cgi;
    let userID = "";
    let l3 = false;
    let isPeer = false;
    if (location.search) {
        const arrConfig = location.search.substr(1).split('&');

        arrConfig.forEach(function (item) {
            const key = item.split('=')[0],
                value = item.split('=')[1];

            if (key == 'appid') {
                appID = Number(value);
            }

            if (key == 'server') {
                const _server = decodeURIComponent(value);
                console.warn('server', _server);
                const _serArr = _server.split('|');
                if (_serArr.length > 1) {
                    server = _serArr;
                } else {
                    server = _server;
                }
                console.warn('server', server);
            }

            if (key == 'cgi_token') {
                cgiToken = decodeURIComponent(value);
            }

            if (key == 'user_id') {
                userID = value;
            }

            if (key == 'l3') {
                l3 = decodeURIComponent(value) == 'true' ? true : false;
            }

            if (key == 'isPeer') {
                isPeer = decodeURIComponent(value) == 'true' ? true : false;
            }
        });
    }
    return { appID, server, cgiToken, userID, l3, isPeer };
    // Test code end
}

util.throttle = (fn, delay = 300) => {
    let preTime = Date.now()

    return function () {
        const context = this
        let args = arguments
        let doTime = Date.now()
        if (doTime - preTime >= delay) {
            fn.apply(context, args)
            preTime = Date.now()
        }
    }

}

util.queryObj = (function parseQueryString(url) {
    var params = {};
    var arr = url.split("?");
    if (arr.length <= 1) {
        return params;
    }
    arr = arr[1].split("&");
    for (var i = 0, l = arr.length; i < l; i++) {
        var a = arr[i].split("=");
        params[a[0]] = a[1];
    }
    return params;
})(location.href)

window.Util = util;