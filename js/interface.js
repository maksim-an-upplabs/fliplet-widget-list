// VARS
var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {items:[]},
    linkPromises = [];

data.items = data.items || [];
_.forEach(data.items,function (item){
  if(_.isObject(item.linkAction)) {
    initLinkProvider(item);
  }
});

var listLength = data.items.length + 1;
var accordionCollapsed = false;

var $accordionContainer = $('#accordion');
var templates = {
  panel: template('panel')
};

checkPanelLength();

setTimeout (function() {
  // SORTING PANELS
  $('.panel-group').sortable({
    handle: ".panel-heading",
    cancel: ".icon-delete",
    tolerance: 'pointer',
    revert: 150,
    placeholder: 'panel panel-default placeholder tile',
    cursor: '-webkit-grabbing; -moz-grabbing;',
    axis: 'y',
    start: function(event, ui) {
      $('.panel-collapse.in').collapse('hide');
      ui.item.addClass('focus').css('height', ui.helper.find('.panel-heading').outerHeight() + 2);
      $('.panel').not(ui.item).addClass('faded');
    },
    stop: function(event, ui) {
      ui.item.removeClass('focus');

      var sortedIds = $( ".panel-group" ).sortable( "toArray" ,{attribute: 'data-id'});
      data.items = _.sortBy(data.items, function(item){
        return sortedIds.indexOf(item.id);
      });
      save();
      $('.panel').not(ui.item).removeClass('faded');
    },
    sort: function(event, ui) {
      $('.panel-group').sortable('refresh');
      $('.tab-content').trigger('scroll');
    }
  });
}, 1000);

// EVENTS
$(".tab-content")
  .on('click', '.icon-delete', function() {

    var $item = $(this).closest("[data-id], .panel"),
        id = $item.data('id');

    _.remove(data.items, {id: id});
    _.remove(linkPromises,{id: id});

    $(this).parents('.panel').remove();
    checkPanelLength();
    listLength--;
    save();

  })
  .on('click', '.list-item-set-link', function() {

    var $item = $(this).closest("[data-id], .panel"),
        id = $item.data('id'),
        item = _.find(data.items, {id: id});

    initLinkProvider(item);

    if ( $(this).siblings().hasClass('hidden') ) {
      $(this).siblings().removeClass('hidden');
    }

    $(this).addClass('hidden');
    $(this).siblings('.link-remove').show();
    save();

  })
  .on('click', '.link-remove', function() {
    var $item = $(this).closest("[data-id], .panel"),
        id = $item.data('id'),
        item = _.find(data.items, {id: id});

    _.remove(linkPromises,{id: id});
    $('[data-id="' + item.id + '"] .add-link').empty();
    item.linkAction = null;
    $(this).addClass('hidden');
    $(this).siblings('.list-item-set-link').removeClass('hidden');
    save();

  })
  .on('keyup change blur paste', '.list-item-title', function() {
    var $listItem = $(this).parents('.panel');
    setListItemTitle($listItem.index(), $(this).val());

    debounceSave();
  }).on('keyup change blur paste', '.list-item-desc', function() {
    debounceSave();
  })
  .on('click', '.expand-items', function() {
    var $panelCollapse = $('.panel-collapse.in');
    // Update accordionCollapsed if all panels are collapsed/expanded
    if (!$panelCollapse.length) {
      accordionCollapsed = true;
    } else if ($panelCollapse.length == $('.panel-collapse').length) {
      accordionCollapsed = false;
    }

    if (accordionCollapsed) {
      expandAccordion();
    } else {
      collapseAccordion();
    }
  })
  .on('click', '.new-list-item', function() {

    var item ={};
    item.id = makeid(8);
    item.number = listLength++;
    item.linkAction = null;
    item.description = "";
    data.items.push(item);

    addListItem(item);

    checkPanelLength();
    save();

  })
  .on('show.bs.collapse', '.panel-collapse', function() {
    $(this).siblings('.panel-heading').find('.fa-chevron-right').removeClass('fa-chevron-right').addClass('fa-chevron-down');
  })
  .on('hide.bs.collapse', '.panel-collapse', function() {
    $(this).siblings('.panel-heading').find('.fa-chevron-down').removeClass('fa-chevron-down').addClass('fa-chevron-right');
  })
  .on('shown.bs.collapse hidden.bs.collapse', '.panel-collapse', function() {
    $('.tab-content').trigger('scroll');
  });

$('#help_tip').on('click', function() {
  alert("During beta, please use live chat and let us know what you need help with.");
});

var contentHeight = $('body > .form-horizontal').outerHeight();
var tabPaneTopPadding = 78;

$('body > .form-horizontal').scroll(function(event) {
  var tabContentScrollPos = Math.abs($('.tab-pane-content').position().top - tabPaneTopPadding);
  var tabPaneHeight = tabPaneTopPadding + $('.tab-pane-content').height();

  if (tabPaneHeight - tabContentScrollPos > contentHeight) {
    $('body').addClass('controls-sticky-on');
  } else {
    $('body').removeClass('controls-sticky-on');
  }
});

// FUNCTIONS
function initLinkProvider(item){

  item.linkAction = item.linkAction || {};
  item.linkAction.provId = item.id;

  var linkActionProvider = Fliplet.Widget.open('com.fliplet.link', {
    // If provided, the iframe will be appended here,
    // otherwise will be displayed as a full-size iframe overlay
    selector: '[data-id="' + item.id + '"] .add-link',
    // Also send the data I have locally, so that
    // the interface gets repopulated with the same stuff
    data: item.linkAction,
    // Events fired from the provider
    onEvent: function (event, data) {
      if (event === 'interface-validate') {
        Fliplet.Widget.toggleSaveButton(data.isValid === true);
      }
    },
    closeOnSave: false
  });

  linkActionProvider.then(function (data) {
    item.linkAction = data ? data.data: {};
    return Promise.resolve();
  });

  linkActionProvider.id = item.id;
  linkPromises.push(linkActionProvider);
}
function template(name) {
  return Handlebars.compile($('#template-' + name).html());
}

function makeid(length)
{
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < length; i++ )
      text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function expandAccordion(){
  accordionCollapsed = false;
  $('.panel-collapse').collapse('show');
}

function collapseAccordion(){
  accordionCollapsed = true;
  $('.panel-collapse').collapse('hide');
}

function setListItemTitle(index, title) {
  $('#accordion').find('.panel:eq(' + index + ') .panel-title-text').html(title);
}

function addListItem(data) {
  $accordionContainer.append(templates.panel(data));
}

function checkPanelLength() {
  if ( $('.panel').length > 0 ) {
    if($('.panel').length > 1) {
      $('.expand-items').removeClass("hidden");
    } else {
      $('.expand-items').addClass("hidden");
    }
    if ( !$('.panels-empty').hasClass('hidden') ) {
      $('.panels-empty').addClass('hidden');
    }
  } else {
    $('.panels-empty').removeClass('hidden');
    $('.expand-items').addClass("hidden");
  }
}

Fliplet.Widget.onSaveRequest(function () {
  save(true);
});

var debounceSave = _.debounce( save, 500);

function save(notifyComplete){
  _.forEach(data.items,function(item){
    item.description = $('#list-item-desc-'+item.id).val();
    item.title = $('#list-item-title-'+item.id).val();
  });

  if(notifyComplete) {
    Promise.all(linkPromises).then(function () {
      // when all providers have finished
      Fliplet.Widget.save(data).then(function () {
        Fliplet.Widget.complete();
      });
    });

    // forward save request to all providers
    linkPromises.forEach(function (promise) {
      promise.forwardSaveRequest();
    });
  }

  Fliplet.Widget.save(data).then(function () {
    Fliplet.Studio.emit('reload-widget-instance', widgetId);
  });
}
