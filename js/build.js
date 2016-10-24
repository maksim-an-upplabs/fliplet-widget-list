$('.linked[data-list-item-id]').click(function (event) {
  event.preventDefault();

  var data = Fliplet.Widget.getData($(this).parents('[data-list-id]').data('list-id'));

  var itemData = _.find(data.items,{id: $(this).data('list-item-id')});

  if(!_.isUndefined(itemData) && (!_.isUndefined(itemData.linkAction) && !_.isEmpty(itemData.linkAction))) {
    Fliplet.Navigate.to(itemData.linkAction);
  }
});

$('[data-list-id]').each(function(){
  var data = Fliplet.Widget.getData($(this).data('list-id'));
  // if (data.swipeToSave) {
  if (true) {
    window.ui = window.ui || {};
    window.ui['swipeSavedList' + $(this).data('list-id')] = new SwipeSaveList(this, {
      // savedListLabel: data.swipeToSaveLabel || 'My list'
      savedListLabel: 'My list'
    });
  }
});
