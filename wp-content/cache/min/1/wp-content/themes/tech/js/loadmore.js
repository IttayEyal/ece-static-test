/* News "More News": fetch the next static archive page and append its
   items (replaces the admin-ajax call; the button is a real link to that
   page, so it also works without JavaScript). */
jQuery(function ($) {
  $("body").on("click", "a.loadmore", function (e) {
    var $btn = $(this);
    var next = $btn.attr("href");
    if (!next) return;
    e.preventDefault();
    if ($btn.hasClass("loading")) return;
    var label = $btn.text();
    $btn.text(news.loading_text).removeClass("btn-rm").addClass("loading");
    var base = new URL(next, location.href);
    $.get(base.href, function (html) {
      var $doc = $("<div>").append($.parseHTML(html));
      var $items = $doc.find(".news-arch-wrapper").children();
      // links in the fetched page are relative to that page
      $items.find("[href],[src]").each(function () {
        var attr = this.hasAttribute("href") ? "href" : "src";
        this.setAttribute(attr, new URL(this.getAttribute(attr), base).href);
      });
      $(".news-arch-wrapper").append($items);
      var $nextBtn = $doc.find("a.loadmore");
      if ($nextBtn.length) {
        $btn.attr("href", new URL($nextBtn.attr("href"), base).href);
        $btn.text(label).addClass("btn-rm").removeClass("loading");
      } else {
        $btn.closest(".d-flex").remove();
      }
    });
  });
});

jQuery(function($){phoneBookSearchInit();phoneBookTabsInit()});let loading=!1;let phoneBookSort="ASC";function phoneBookTabsInit(){const pbContainer=$("#phone-book-wrapper.ajax-load-more");$("#phone-book-filters .tabs button").on("click",function(){loading=!1;const tab=$(this);tab.addClass("active").siblings().removeClass("active").data({paged:1,"load-more":1});tab.siblings().each(function(){$(this).data("tax",$(this).data("args")[0])});$("#search-rsrc-input").val("");phoneBookSort="ASC";loadingIoToggle();data={action:"phone_book_load_more",security:news.security,...getTabOptions(tab),};if(data.is_administrative){$("#phone-book-headings,#phone-book-wrapper").addClass("administrative")}else{$("#phone-book-headings,#phone-book-wrapper").removeClass("administrative")}
if(data.is_guest){$("#phone-book-headings,#phone-book-wrapper").addClass("guest")}else{$("#phone-book-headings,#phone-book-wrapper").removeClass("guest")}
$.post(news.ajaxurl,data,function(res){if(res){const{data}=res;console.log(data);pbContainer.html(data.html);tab.data("paged",data.paged);tab.data("tax",data.tax);if(!data.html)tab.data("load-more",0)}
loadingIoToggle()})})}
function phoneBookLoadMoreInit(){const pbContainer=$("#phone-book-wrapper.ajax-load-more");if(!pbContainer.length)return;$(window).scroll(function(){if(!loading&&$(window).scrollTop()+$(window).height()>pbContainer.height()-300){const tab=$("#phone-book-filters li.active");const s=$("#search-rsrc-input").val();if(s)return;loadingIoToggle();data={action:"phone_book_load_more",security:news.security,...getTabOptions(tab),};$.post(news.ajaxurl,data,function(res){if(res){const{data}=res;pbContainer.append(data.html);tab.data("paged",data.paged);tab.data("tax",data.tax);if(!data.html)tab.data("load-more",0)}
loadingIoToggle()})}})}
function phoneBookSearchInit(){const pbContainer=$("#phone-book-wrapper.ajax-load-more");if(!pbContainer.length)return;$("#search-rsrc-btn.search-by-ajax").on("click",function(){const s=$("#search-rsrc-input").val().toLowerCase();if(!s){$("#search-clear-btn.search-by-ajax").trigger('click');return}
pbContainer.find('.search-results-item').each(function(){if($(this).find('.sm-name').html().toLowerCase().indexOf(s)>=0)
$(this).addClass('d-flex').removeClass('d-none');else $(this).addClass('d-none').removeClass('d-flex')});$("#search-clear-btn").removeClass("off")});$("#search-clear-btn.search-by-ajax").on("click",function(){$("#search-clear-btn").addClass("off");pbContainer.find('.search-results-item').addClass('d-flex').removeClass('d-none')})}function phoneBookResetTabAndGetData(){const pbContainer=$("#phone-book-wrapper.ajax-load-more");const tab=$("#phone-book-filters li.active");if(!tab.length||!pbContainer.length)return;tab.data({paged:1,"load-more":1,tax:tab.data("args")[0]});loadingIoToggle();data={action:"phone_book_load_more",security:news.security,...getTabOptions(tab),};$.post(news.ajaxurl,data,function(res){if(res){const{data}=res;tab.data("paged",data.paged);tab.data("tax",data.tax);pbContainer.html(data.html)}
loadingIoToggle()})}
function getTabOptions(tab){let lang="";try{const queryString=window.location.search;const urlParams=new URLSearchParams(queryString);lang=urlParams.get("lang")}catch(err){console.error(err)}
return{sort_method:phoneBookSort,paged:tab.data("paged"),taxonomies:tab.data("args"),tax:tab.data("tax"),is_open:tab.data("is-open"),is_guest:tab.data("is-guest"),is_administrative:tab.data("is-administrative"),lang,}}
function loadingIoToggle(){const loadingEl=$(".loading-io");if(loading){loadingEl.hide();loadingEl.removeClass("active");loading=!1}else{loadingEl.show();loadingEl.addClass("active");loading=!0}}