/*
 *		source/controls/listviewskeleton.js
 */

/* FeedReader - A RSS Feed Aggregator for Palm WebOS
 * Copyright (C) 2009-2012 Timo Tegtmeier
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
	name:				"ListViewSkeleton",
	kind:				"VFlexBox",
	flex:				1,

	items:				[],
	itemCount:			-1,
	filter:				"",

	selectedIndex:		-1,
	deletedItem:		null,

	refreshInProgress:	false,

	//
	// List handling
	//

	selectRow: function(index) {
		if(this.selectedIndex != index) {
			this.deselectRow();
			this.$.list.select(index);
			this.$.list.prepareRow(index);
			this.$.item.addClass("enyo-item-selected");
			this.selectedIndex = index;
		}
	},

	deselectRow: function(index) {
		if(index === undefined) {
			index = this.selectedIndex;
		}

		if(index >= 0) {
			this.$.list.getSelection().clear();
			this.$.list.prepareRow(index);
			this.$.item.removeClass("enyo-item-selected");
			this.selectedIndex = -1;
		}
	},

	itemClicked: function(sender, event) {
		if(event.rowIndex == this.selectedIndex) {
			return false;
		}

		this.selectRow(event.rowIndex);
		return true;
	},

	itemDeleted: function(sender, index) {
		var delSelected = this.selectedIndex == index;
		if(delSelected) {
			this.selectedIndex = -1;
		}

		this.deletedItem = this.items[index];
		this.items.splice(index, 1);
		this.$.list.refresh(); // Provide quick visual response.

		return delSelected;
	},

	//
	// Helper functions
	//

	getSelectedId: function() {
		return (this.selectedIndex >= 0 ? this.items[this.selectedIndex].id : -1);
	},

	restoreSelectedId: function(selectedId) {
		// Remember, then reset the selected index
		var lastSelIndex = this.selectedIndex;
		this.selectedIndex = -1;
		this.deselectRow(lastSelIndex);

		// Search for the formerly selected item
		if(selectedId >= 0) {
			for(var i = 0; i < this.items.length; i++) {
				if(this.items[i] && (this.items[i].id == selectedId)) {
					this.selectRow(i);
					break;
				}
			}
		}
	},

	//
	// Database interaction
	//

	setItemCount: function(count) {
		this.itemCount = count;
	},

	insertItems: function(items) {
		try {
			// Remember selected id
			var selectedId = this.getSelectedId();

			// Store the new items array
			this.items = items;

			// Restore the previous selection
			this.restoreSelectedId(selectedId);
		} catch(e) {
			this.error("LV EXCEPTION>", e);
		} finally {
			this.refreshInProgress = false;
			this.refreshFinished();
			this.$.list.refresh();
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
			this.updateCount(this.setItemCount);
			this.acquireData(this.filter, this.insertItems);
		}
	},

	clear: function() {
		this.itemCount = -1;
		this.items = [];
		this.filter = "";
		this.selectedIndex = -1;
		this.$.list.punt();
	},

	//
	// Initialization
	//

	create: function() {
		this.inherited(arguments);

		this.setItemCount = enyo.bind(this, this.setItemCount);
		this.insertItems = enyo.bind(this, this.insertItems);
	}
});
