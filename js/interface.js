// VARS
var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {
  items: []
};
var linkPromises = [];

data.items = data.items || [];

var accordionCollapsed = false;

var $accordionContainer = $('#accordion');
var templates = {
  panel: template('panel')
};

var debounceSave = _.debounce(save, 500);

// Indicate dragging state
var dragging = false;

enableSwipeSave();
checkPanelLength();

setTimeout(function() {
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
      dragging = true;
      var itemId = $(ui.item).data('id');
      var itemProvider = _.find(linkPromises, function(provider) {
        return provider.id === itemId;
      });

      save();

      // removes provider
      itemProvider = null;
      _.remove(linkPromises, {
        id: itemId
      });

      $('.panel-collapse.in').collapse('hide');
      ui.item.addClass('focus').css('height', ui.helper.find('.panel-heading').outerHeight() + 2);
      $('.panel').not(ui.item).addClass('faded');
    },
    stop: function(event, ui) {
      var itemId = $(ui.item).data('id');
      var movedItem = _.find(data.items, function(item) {
        return item.id === itemId;
      });

      // sets up new provider
      $('[data-id="' + itemId + '"] .add-link').html('');
      initLinkProvider(movedItem);

      ui.item.removeClass('focus');

      var sortedIds = $(".panel-group").sortable("toArray", {
        attribute: 'data-id'
      });
      data.items = _.sortBy(data.items, function(item) {
        return sortedIds.indexOf(item.id);
      });
      $('.panel').not(ui.item).removeClass('faded');

      dragging = false;
      
      save(false, true);
    },
    sort: function(event, ui) {
      $('.panel-group').sortable('refresh');
      $('.tab-content').trigger('scroll');
    }
  });
  $('form.form-horizontal').trigger('scroll');
}, 1000);

// EVENTS
$(".tab-content")
  .on('click', '.icon-delete', function() {

    var $item = $(this).closest("[data-id], .panel"),
      id = $item.data('id');

    _.remove(data.items, {
      id: id
    });
    _.remove(linkPromises, {
      id: id
    });

    $(this).parents('.panel').remove();
    checkPanelLength();
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

    var item = {};
    item.id = makeid(8);
    item.linkAction = null;
    item.title = 'List item ' + ($('#list-items .panel').length + 1);
    item.description = "";
    data.items.push(item);

    addListItem(item);
    initLinkProvider(item);

    checkPanelLength();
    save();

  })
  .on('show.bs.collapse', '.panel-collapse', function() {
    if (dragging) {
      return;
    }

    // Get item ID / Get provider / Get item
    var itemID = $(this).parents('.panel').data('id');
    var itemProvider = _.find(linkPromises, function(provider) {
      return provider.id === itemID;
    });
    var item = _.find(data.items, function(item) {
      return item.id === itemID;
    });
    // Init the link provider when the accordion opens
    if (!itemProvider && item) {
      initLinkProvider(item);
    }
    $(this).siblings('.panel-heading').find('.fa-chevron-right').removeClass('fa-chevron-right').addClass('fa-chevron-down');
  })
  .on('hide.bs.collapse', '.panel-collapse', function() {
    $(this).siblings('.panel-heading').find('.fa-chevron-down').removeClass('fa-chevron-down').addClass('fa-chevron-right');
  })
  .on('shown.bs.collapse hidden.bs.collapse', '.panel-collapse', function() {
    $('.tab-content').trigger('scroll');
  })
  .on('change', 'input[name="enable_list_saving"]:radio', function() {
    enableSwipeSave();
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
function enableSwipeSave() {
  if ($('#swipe-to-save-yes').is(':checked')) {
    $('#saved-list-field').addClass('show');
    data.swipeToSave = true;
  } else if ($('#swipe-to-save-no').is(':checked')) {
    $('#saved-list-field').removeClass('show');
    data.swipeToSave = false;
  }
}

function initLinkProvider(item) {

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
    onEvent: function(event, data) {
      if (event === 'interface-validate') {
        Fliplet.Widget.toggleSaveButton(data.isValid === true);
      }
    },
    closeOnSave: false
  });

  linkActionProvider.then(function(data) {
    item.linkAction = data && data.data.action !== 'none' ? data.data : null;
    return Promise.resolve();
  });

  linkActionProvider.id = item.id;
  linkPromises.push(linkActionProvider);
}

function template(name) {
  return Handlebars.compile($('#template-' + name).html());
}

function makeid(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function expandAccordion() {
  accordionCollapsed = false;
  $('.panel-collapse').collapse('show');
}

function collapseAccordion() {
  accordionCollapsed = true;
  $('.panel-collapse').collapse('hide');
}

function setListItemTitle(index, title) {
  $('#accordion').find('.panel:eq(' + index + ') .panel-title-text').html(title);
}

function addListItem(data) {
  var $newPanel = $(templates.panel(data));
  $accordionContainer.append($newPanel);

  $newPanel.find('.form-control:eq(0)').select();
  $('form.form-horizontal').stop().animate({
    scrollTop: $('.tab-content').height()
  }, 300, function() {
    $('form.form-horizontal').trigger('scroll');
  });
}

function checkPanelLength() {
  if ($('.panel').length) {
    $('#list-items').removeClass('list-items-empty');
  } else {
    $('#list-items').addClass('list-items-empty');
  }
}

Fliplet.Widget.onSaveRequest(function() {
  save(true);
});

function save(notifyComplete, dragStop) {
  _.forEach(data.items, function(item) {
    item.description = $('#list-item-desc-' + item.id).val();
    item.title = $('#list-item-title-' + item.id).val();
  });
  data.swipeToSaveLabel =
    (data.swipeToSave && $('[name="saved_list_label"]').val().length) ?
    $('[name="saved_list_label"]').val() :
    'My List';

  // forward save request to all providers
  linkPromises.forEach(function(promise) {
    promise.forwardSaveRequest();
  });
  
  if (!dragStop) {
    Fliplet.Widget.all(linkPromises).then(function() {
      // when all providers have finished
      Fliplet.Widget.save(data).then(function() {
        if (notifyComplete) {
          // Close the interface for good
          Fliplet.Widget.complete();
        } else {
          Fliplet.Studio.emit('reload-widget-instance', widgetId);
        }
      });
    });
  } else {
    Fliplet.Widget.save(data).then(function() {
      Fliplet.Studio.emit('reload-widget-instance', widgetId);
    });
  } 
}