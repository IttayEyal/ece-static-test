window.addEventListener('DOMContentLoaded', function() {
    $('.yt-clip-item').click(function() {
        let currentVidSrc = $(this).attr('data-src');
        let currentVidTitle = $(this).attr('data-title');
        let iFrame = $('<iframe>').attr({ title: currentVidTitle, width: 1280, height: 720, src: currentVidSrc, frameborder: 0, allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture', allowfullscreen: '' });
        $('#vid-pop-iframe .embed-container').html(iFrame);
        $('#vid-pop-iframe-title').text(currentVidTitle);
        $('#vid-pop-iframe .embed-container').find('iframe')[0].src += "&autoplay=1";
    });
    $('#vidModal').on('hidden.bs.modal', function() {
        $('#vid-pop-iframe .embed-container').html('');
        // $('.slick-clip-item').removeClass('vid-modal-open');
    });
    $('.custom-lang-switcher .wpml-ls-item-en a').attr('title', 'מעבר לאתר בשפה האנגלית');
    $('.custom-lang-switcher .wpml-ls-item-he a').attr('title', 'Switching to the Hebrew language website');
});