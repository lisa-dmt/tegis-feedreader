/*
 *		source/controls/listviewskeleton.js
 */

/* FeedReader - A RSS Feed Aggregator for Firefox OS
 * Copyright (C) 2009-2013 Timo Tegtmeier
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

enyo.kind({
	name:		"SwipeableList",
	kind:		enyo.List,

	events:		{
		onStartSwiping:			"",
		onIsItemSwipeable:		""
	},

	handlers:	{
		onup:					"handleUp"
	},

	swipeableComponents:	[{
		kind:		SwipeItem
	}],

	swipe: function() {
		this.doStartSwiping({ index: this.swipeIndex });
		this.inherited(arguments);
		return true;
	},

	swipeDragStart: function(sender, event) {
		// Check whether the item is swipeable.
		if(event.index == null || event.vertical || (this.doIsItemSwipeable(event) === false))
			return false;

		// If the persistent item of a previous swipe is still
		// shown, we need to clear it out.
		if(this.persistentItemVisible)
			this.finishSwiping(this.swipeIndex);

		this.inherited(arguments);
	},

	getPersistSwipeableItem: function() {
		// As we use swiping only for a delete confirmation,
		// the item needs to persistent in any case.
		return true;
	},

	finishSwiping: function(index) {
		this.clearSwipeables();
		this.renderRow(index);
		this.persistentItemVisible = false;
	},

	beginPinnedReorder: function(event) {
		this.pinnedReorderMode = true;
		this.completeFinishReordering(event);
	},

	handleUp: function(sender, event) {
		if(this.swipeIndex !== null) {
			event.preventTap();
			return true;
		}
	}
});

enyo.kind({
	name:				"ListViewSkeleton",
	kind:				"DraggableView",
    classes:            "back-color",

	items:				[],
	filter:				"",

	selectedIndex:		-1,
	deletedItem:		null,
	swipedIndex:		-1,

	refreshInProgress:	false,
	selectionClass:		"list-item-selected",

	handlers:			{
		onStartSwiping:	"itemSwipingStarted",
		onDelete:		"itemDeleted",
		onCancel:		"itemDeleteCanceled"
	},

    events:             {
        onSelected:     "",
        onDeleted:      ""
    },

	//
	// List handling
	//

	itemClicked: function(sender, event) {
		// If the tapped item is already selected, nothing has to be done.
		// This is indicated by returning false. As a result, this method
		// needs to be overridden in a derived kind, as the handler must
		// not return a value to the caller.
		if(event.index == this.selectedIndex && !enyo.Panels.isScreenNarrow())
			return false;
		if(this.$.list.isSwiping())
			return false;

		this.selectedIndex = event.index;
		return true;
	},

	itemSwipingStarted: function(sender, event) {
		this.swipedIndex = event.index;
	},

	itemDeleted: function() {
        this.handleItemDeletion(this.swipedIndex, true);
        return true;
	},

    handleItemDeletion: function(index, wasSwipe) {
        var delSelected = this.selectedIndex === index;
        if(delSelected) {
            this.selectedIndex = -1;
        }

        if(wasSwipe)
            this.$.list.finishSwiping(this.swipedIndex);

        this.deletedItem = this.items[index];
        this.items.splice(index, 1);
        this.$.list.setCount(this.items.length);
        this.$.list.refresh(); // Provide quick visual response.

        if(delSelected) {
            this.doSelected({
                item:		null,
                isFirst:	true,
                isLast: 	true
            });
        }
        this.doDeleted(this.deletedItem);
    },

	itemDeleteCanceled: function() {
		if(this.swipedIndex >= 0) {
			this.$.list.finishSwiping(this.swipedIndex);
		}
		this.swipedIndex = -1;
		return true;
	},

	//
	// Search handling
	//

	hideSearchBox: function(noRefresh) {
		if(this.$.searchBox.getShowing()) {
			if(this.filter != "")
				this.$.list.scrollToStart();

			this.$.searchButton.setPressed(false);
			this.$.searchBox.hide();
			this.$.searchBox.setValue("");
			this.filter = "";
			this.$.headerCaption.show();
			this.resized();

			if(!noRefresh)
				this.refresh();
		}
	},

	showSearchBox: function() {
		this.$.headerCaption.hide();
		this.$.searchBox.show();
		this.resized();

		window.setTimeout(enyo.bind(this, function() {
			this.$.searchBox.focus();
		}), 120);
	},

	searchClicked: function() {
		if(this.$.searchBox.getShowing()) {
			this.hideSearchBox();
		} else {
			this.showSearchBox();
		}
	},

	filterChanged: function() {
		this.filter = this.$.searchBox.getValue();
		this.$.list.scrollToStart();
		this.refresh();
	},

	filterCanceled: function() {
		this.hideSearchBox();
	},


	//
	// Helper functions
	//

	getSelectedId: function() {
		return (this.selectedIndex >= 0 ? this.items[this.selectedIndex].id : -1);
	},

	restoreSelectedId: function(selectedId) {
		// Search for the formerly selected item
		if (selectedId < 0)
			return;

		for (var i = 0; i < this.items.length; i++) {
			if (this.items[i] && (this.items[i].id == selectedId)) {
				this.$.list.select(i);
				this.selectedIndex = i;
				break;
			}
		}
	},

	dropEvent: function() {
		return true;
	},

	//
	// Database interaction
	//

	setItems: function(items) {
		try {
			// Remember selected id and clear it afterwards.
			var selectedId = this.getSelectedId();
			this.selectedIndex = -1;
			this.$.list.getSelection().clear();

			// Store the new items array
			this.items = items;
            this.$.list.setCount(items.length);

			// Restore the previous selection
			this.restoreSelectedId(selectedId);

			// Refresh the list.
			this.$.list.refresh();
		} catch(e) {
			this.error("LV EXCEPTION>", e);
		} finally {
			this.refreshInProgress = false;
			this.refreshFinished();
		}
	},

	/** @protected
	 * Called right before the list itself is refreshed.
	 */
	refreshFinished: function() {},

	/** @protected
	 * Called to determine if a refresh can be done.
	 */
	canRefresh: function() {
		return true;
	},

	/** @protected
	 * Called to determine the row index of a list event.
	 * @param event		event object
	 * @return {*}		false, if index does not exist, otherwise the index
	 */
	indexFromEvent: function(event) {
		var index = event.index;
		if((index < 0) || (index >= this.items.length) || (!this.items[index])) {
			return false;
		}
		return index;
	},

	/** @protected
	 * Called to deselect the current selection.
	 * @return	int		last value of selectedIndex
	 */
	deselect: function() {
		var oldValue = this.selectedIndex;
		this.selectedIndex = -1;
		this.$.list.deselect(oldValue);
		this.$.list.renderRow(oldValue);
		return oldValue;
	},

	/** @protected
	 * Called to select a row.
	 * @param index
	 */
	select: function(index) {
		this.selectedIndex = index;
		this.$.list.select(index);
		this.$.list.scrollToRow(index);
		this.$.list.renderRow(index);
	},

	//
	// Public functions
	//

	refresh: function() {
		if(this.refreshInProgress) {
			this.log("LV> refreshInProgress = true, ignoring request");
		} else if(!this.canRefresh()){
			this.log("LV> Cannot refresh, calling clear() instead");
			this.clear();
		} else {
			this.log("LV> requesting refresh");
			this.refreshInProgress = true;
			this.acquireData(this.filter, this.setItems);
		}
	},

	clear: function() {
		this.items = [];
		this.filter = "";
		this.selectedIndex = -1;
		this.$.list.getSelection().clear();
		this.$.list.setCount(0);
		this.$.list.refresh();
	},

	selectNext: function() {
		if(this.selectedIndex < 0)
			return;

		var newIndex = this.deselect() + 1;
		this.itemClicked(this.$.list, { index: newIndex });
		this.select(newIndex);
	},

	selectPrev: function() {
		if(this.selectedIndex < 0)
			return;

		var newIndex = this.deselect() - 1;
		this.itemClicked(this.$.list, { index: newIndex });
		this.select(newIndex);
	},

	//
	// Initialization
	//

	create: function() {
		this.inherited(arguments);
		this.setItems = enyo.bind(this, this.setItems);
	}
});
