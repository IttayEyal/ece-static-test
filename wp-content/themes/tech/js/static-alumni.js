/* Static demo: the PhD-graduates list filters and paginates in the browser.
   (The live site asks the server for every page/filter; here all entries are in the page.) */
jQuery(function ($) {
  var $wrap = $('#phone-book-wrapper');
  if (!$('#search-alumni-type').length || !$wrap.length) return;
  var PER = parseInt((window.techAlumni || {}).perPage || 20, 10), page = 1;
  var $rows = $wrap.find('.search-results-item');
  function filters() {
    return $('.alumni-search-filters li').map(function () {
      return { type: String($(this).data('type')), value: String($(this).attr('data-value')) };
    }).get();
  }
  function json(el, attr) { try { return JSON.parse(el.getAttribute(attr) || '[]'); } catch (e) { return []; } }
  function match(el, f) {
    var v = f.value.toLowerCase();
    switch (f.type) {
      case 'text': return el.textContent.toLowerCase().indexOf(v) >= 0;
      case 'year': return String(el.getAttribute('data-year')) === f.value;
      case 'supervisor': return json(el, 'data-supervisors').map(String).indexOf(f.value) >= 0;
      case 'area': return json(el, 'data-areas').map(String).indexOf(f.value) >= 0;
      case 'lab': return json(el, 'data-labs').map(String).indexOf(f.value) >= 0;
      case 'faculty': return String(el.getAttribute('data-faculty')) === 'true';
      default: return true;
    }
  }
  function render() {
    var fs = filters();
    var hits = $rows.filter(function () { var el = this; return fs.every(function (f) { return match(el, f); }); });
    var pages = Math.max(1, Math.ceil(hits.length / PER));
    page = Math.min(page, pages);
    $rows.addClass('d-none').removeClass('d-flex');
    hits.slice((page - 1) * PER, page * PER).removeClass('d-none').addClass('d-flex');
    var h = '';
    if (pages > 1) for (var i = 1; i <= pages; i++)
      h += '<li class="page-item' + (i === page ? ' active' : '') + '"><a class="page-link" href="#" data-page="' + i + '">' + i + '</a></li>';
    $('.pagination').html(h);
    $('.alumni-count').text(hits.length);
  }
  window.filterAlumni = function () { page = 1; render(); };
  window.paginateAlumni = function (p) { page = p; render(); };
  $(document).on('click', '.pagination .page-link', function (e) {
    e.preventDefault(); e.stopImmediatePropagation();
    page = parseInt($(this).data('page'), 10) || 1; render();
    var $a = $('#phone-book-filters');
    if ($a.length) $('html, body').animate({ scrollTop: $a.offset().top - 100 }, 200);
  });
  render();
});
