/*
 *		source/feedlist/feedlist.js
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
	name:			"FeedList",
	kind:			ListViewSkeleton,

	menuIndex:		0,
	spinningIndex:	-1,
	waitingForData:	true,

	published:	{
		updateOnly:			false
	},

	events:		{
		onOpenAppMenu:		"",
		onFeedSelected:		"",
		onFeedDeleted:		"",
		onAddFeed:			"",
		onEditFeed:			""
	},

	components:	[{
		kind:		onyx.Toolbar,
		layoutKind:	enyo.FittableColumnsLayout,
		name:		"header",
		classes:	"toolbar-light",
		components:	[{
			kind:		onyx.IconButton,
			name:		"appMenuButton",
			src:		"assets/header/app-menu.png",
			showing:	!appMenuSupported(),
			ontap:		"openAppMenu"
		}, {
			name:		"headerCaption",
			classes:	"shorten-text header-caption",
			content:	$L("Feed Subscriptions"),
			fit:		true
		}, {
			name:		"searchBox",
			kind: 		"SearchInput",
			showing:	false,
			fit:		true,
			tag:		"div",
			onChange:	"filterChanged",
			onCancel:	"filterCanceled"
		}]
	}, {
        kind:						SwipeableList,
        name:						"list",
        fit:						true,
		reorderable:				true,
		enableSwipe:				true,
		fixedHeight:				true,

        onSetupItem:    			"setupFeed",
		onSetupReorderComponents:	"setupReorder",
        onReorder:					"reorderFeed",
		onIsItemSwipeable:			"isItemSwipeable",
		onPullRelease:				"listPulled",

		components: [{
            name:		"item",
			kind:		onyx.Item,
			classes:	"feedlist-item",
            ontap:		"itemClicked",
            components:	[{
				name:		"feedInfoBox",
                classes:	"feed-infobox",
				components:	[{
					kind:		enyo.Image,
					name:		"feedIcon",
					classes:	addBrowerClass("feed-icon"),
					src:		"assets/lists/icon-rss.png"
                }, {
					kind:	    onyx.Spinner,
					name:	    "feedSpinner",
					classes:    "onyx-spinner onyx-light small feed-spinner",
					showing:    false
				}, {
					name:		"unreadCountBadge",
					classes:	addBrowerClass("feed-badge feed-unreaditem"),
					components:	[{
						name:		"unreadCount",
						classes:	addBrowerClass("feed-countlabel"),
						content:	"0"
					}]
				}, {
					name:		"newCountBadge",
					classes:	addBrowerClass("feed-badge feed-newitem"),
					components:	[{
						name:		"newCount",
						classes:	addBrowerClass("feed-countlabel"),
						content:	"0"
					}]
				}]
			}, {
				classes:	"feed-title-box",
				components: [{
					name:		"feedTitle",
					classes:	"feed-title shorten-text"
				}, {
					name:		"feedURL",
					classes:	"feed-url shorten-text"
				}]
			}, {
				kind:				MenuDecoupler,
				menu:				"feedMenu",
				list:				"list",
				classes:    		"list-edit-button",
				onBeforeShowMenu:	"beforeShowFeedMenu",
				components: [{
					kind:		onyx.Button,
					classes:	"feed-edit-button",
					components:	[{
						kind:		"onyx.Icon",
						src:		"assets/lists/icon-edit.png"
					}]
				}]
			}]
        }],
		reorderComponents: [{
			kind:		onyx.Item,
			classes:	"feedlist-item",
			components:	[{
				classes:	"feed-infobox",
				components:	[{
					kind:		enyo.Image,
					name:		"reorderFeedIcon",
					classes:	addBrowerClass("feed-icon"),
					src:		"assets/lists/icon-rss.png"
				}]
			}, {
				classes:	"feed-title-box large",
				components: [{
					name:		"reorderFeedTitle",
					classes:	"feed-title shorten-text"
				}, {
					name:		"reorderFeedURL",
					classes:	"feed-url shorten-text"
				}]
			}]
		}]
	}, {
		name:		"loadSpinnerBox",
        fit:        true,
		components:	[{
			name:		"loadSpinner",
			kind:		onyx.Spinner,
            style:      "position: absolute; margin: auto; top: 0; left: 0; right: 0; bottom: 0;",
            classes:    "onyx-light"
		}]
	}, {
		kind:		onyx.Toolbar,
		pack:		"justify",
		components:	[{
			kind:		onyx.IconButton,
			classes:	"float-left",
			src:		"assets/toolbars/icon-new.png",
			ontap:	    "addFeedClicked"
		}, {
			name:		"refreshButton",
			kind:		onyx.IconButton,
			classes:	"float-right",
			src:		"assets/toolbars/icon-sync.png",
			ontap:	    "refreshClicked"
		}, {
			kind:		enyo.Control,
			classes:	"float-right toolbar-separator"
		}, {
			name:		"searchButton",
			kind:		ToggleIconButton,
			classes:    "float-right",
			src:		"assets/toolbars/icon-search.png",
			ontap:		"searchClicked"
		}]
	}],

	tools:	[{
		kind:						enyo.Signals,
		onFeedListChanged:			"refresh",
		onFeedUpdating:				"setFeedUpdateState",
		onSpoolerRunningChanged:	"spoolerRunningChanged"
	}, {
		name:		"feedMenu",
		kind:		PopupMenu,
		components:	[{
			content:	$L("Update feed"),
			ontap:		"menuUpdateFeed"
		}, {
			content:	$L("Mark all stories read"),
			ontap:		"menuMarkAllRead"
		}, {
			content:	$L("Mark all stories unread"),
			ontap:		"menuMarkAllUnRead"
		}, {
			content:	$L("Unstar all stories"),
			ontap:		"menuMarkAllUnStarred"
		}, {
			name:		"itemEditFeed",
			content:	$L("Edit feed settings"),
			ontap:		"menuEditFeed"
		}, {
			name:		"itemDeleteFeed",
			content:	$L("Delete feed"),
			ontap:		"menuDeleteFeed"
		}]
	}],

	//
	//
	//

	openAppMenu: function(sender, event) {
		this.doOpenAppMenu(event);
	},

	//
	// List handling
	//

	setupFeed: function(sender, event) {
		var index;
		if((index = this.indexFromEvent(event)) === false)
			return false;

		var feed = this.items[index];

		// Only show selection state, if not running on a phone.
		if(!enyo.Panels.isScreenNarrow()) {
			this.$.item.addRemoveClass(this.selectionClass, sender.isSelected(index));
		}

		this.$.feedTitle.applyStyle("color", enyo.application.prefs.getCSSTitleColor());
		this.$.feedTitle.applyStyle("font-size", enyo.application.prefs.largeFont ? "20px" : "18px");
		this.$.feedTitle.setContent(enyo.application.feeds.getFeedTitle(feed));
		this.$.feedURL.applyStyle("font-size", enyo.application.prefs.largeFont ? "16px" : "14px");
		this.$.feedURL.setContent(enyo.application.feeds.getFeedURL(feed));
		this.$.feedIcon.setSrc(enyo.application.feeds.getFeedIcon(feed));

		this.$.unreadCount.setContent(feed.numUnRead);
        this.$.unreadCountBadge.setShowing((feed.numUnRead > 0) && enyo.application.prefs.showUnreadCount);
		this.$.newCount.setContent(feed.numNew);
        this.$.newCountBadge.setShowing((feed.numNew > 0) && enyo.application.prefs.showNewCount);
	},

	setupReorder: function(sender, event) {
		var index;
		if((index = this.indexFromEvent(event)) === false)
			return false;

		var feed = this.items[index];

		this.$.reorderFeedTitle.applyStyle("color", enyo.application.prefs.getCSSTitleColor());
		this.$.reorderFeedTitle.applyStyle("font-size", enyo.application.prefs.largeFont ? "20px" : "18px");
		this.$.reorderFeedTitle.setContent(enyo.application.feeds.getFeedTitle(feed));
		this.$.reorderFeedURL.applyStyle("font-size", enyo.application.prefs.largeFont ? "16px" : "14px");
		this.$.reorderFeedURL.setContent(enyo.application.feeds.getFeedURL(feed));
		this.$.reorderFeedIcon.setSrc(enyo.application.feeds.getFeedIcon(feed));
	},

	isItemSwipeable: function(sender, event) {
		var index;
		if((index = this.indexFromEvent(event)) === false)
			return false;

		return this.items[index].feedType >= feedTypes.ftUnknown;
	},

	listPulled: function() {
		enyo.Signals.send("onUpdateAll");
	},

	acquireData: function(filter, inserter) {
		enyo.application.feeds.getFeeds(filter, inserter);
	},

	reorderFeed: function(sender, event) {
		if(event.reorderFrom == event.reorderTo)
			return;

		// The list will refresh itself after the re-ordering has been completed, so we
		// need to temporarily re-order our item array to make the list appear correctly.
		var itemToMove = this.items.splice(event.reorderFrom);
		this.items.splice(event.reorderTo, 0, itemToMove[0]);

		// Now update the database. After finishing, the list will be refreshed
		// automatically.
		enyo.application.feeds.moveFeed(event.reorderFrom, event.reorderTo);
	},

	refreshFinished: function() {
		if(this.waitingForData) {
			this.waitingForData = false;
			this.$.loadSpinner.stop();
			this.$.loadSpinnerBox.hide();
			this.$.list.show();
			this.$.list.render();
            this.resized();
		}

		this.inherited(arguments);
		this.updateOnly = false;
	},

	itemClicked: function(sender, event) {
		if(this.inherited(arguments)) {
			this.$.searchBox.blur();
			this.doFeedSelected({
				item:		this.items[event.index],
				isFirst:	event.index == 0,
				isLast:		event.index == (this.items.length - 1)
			});
		}
	},

	beforeShowFeedMenu: function(sender, event) {
		// Store the menu index.
		this.menuIndex = event.rowIndex;
		var feed = this.items[this.menuIndex];

		var isEditable = (feed.feedType != feedTypes.ftStarred) && (feed.feedType != feedTypes.ftAllItems);
		this.$.itemEditFeed.setShowing(isEditable);
		this.$.itemDeleteFeed.setShowing(isEditable);
	},

	itemDeleted: function(sender, index) {
		if(this.swipedIndex === undefined)
			throw "Missed dragstart event!";

		if(this.inherited(arguments)) {
			this.doFeedSelected({
				item:		null,
				isFirst:	true,
				isLast: 	true
			});
		}
		this.doFeedDeleted(this.deletedItem);
		enyo.application.feeds.deleteFeed(this.deletedItem);
		this.deletedItem = null;
	},

	setFeedSpinner: function(index, state) {
		if(!this.waitingForData) {
			if(state && (this.spinningIndex >= 0) && (this.spinningIndex != index)) {
				this.setFeedSpinner(this.spinningIndex, false);
				enyo.asyncMethod(this, this.setFeedSpinner, index, state);
				return;
			}
			this.$.list.prepareRow(index);
			this.$.feedSpinner.setShowing(state);
			this.spinningIndex = state ? index : -1;
			this.$.list.lockRow(index);
		}
	},

	//
	// Menu handling
	//

	menuMarkAllRead: function(sender, event) {
		enyo.application.feeds.markAllRead(this.items[this.menuIndex]);
	},

	menuMarkAllUnRead: function(sender, event) {
		enyo.application.feeds.markAllUnRead(this.items[this.menuIndex]);
	},

	menuMarkAllUnStarred: function(sender, event) {
		enyo.application.feeds.markAllUnStarred(this.items[this.menuIndex]);
	},

	menuEditFeed: function(sender, event) {
		this.doEditFeed(this.items[this.menuIndex]);
	},

	menuUpdateFeed: function(sender, event) {
		enyo.application.feeds.enqueueUpdate(this.items[this.menuIndex]);
	},

	menuDeleteFeed: function(sender, event) {
		this.itemDeleted(sender, this.menuIndex);
	},

	//
	// Toolbar handling
	//

	addFeedClicked: function(sender, event) {
		this.doAddFeed();
	},

	refreshClicked: function(sender, event) {
        enyo.Signals.send("onUpdateAll");
	},

	//
	// Search handling
	//

	showSearchBox: function() {
		this.$.appMenuButton.hide();
		this.inherited(arguments);
	},

	hideSearchBox: function() {
		if(this.$.searchBox.getShowing() && !appMenuSupported())
			this.$.appMenuButton.show();
		this.inherited(arguments);
	},

	//
	// Signal handling
	//

	setFeedUpdateState: function(sender, event) {
		var index = event.index;
		var state = event.state;

		if((index < 0) || (index >= this.items.length)) {
			return;
		}
		this.setFeedSpinner(index, state);
	},

	spoolerRunningChanged: function(sender, event) {
		this.$.refreshButton.setDisabled(event.state);
        if(!event.state) {
			this.log("FEEDLIST> Spooler finished; refreshing");
            this.refresh();
        }
	},

	//
	// Other functions
	//

	initComponents: function() {
		this.createChrome(this.tools);
		this.inherited(arguments);
	},

	rendered: function() {
        this.inherited(arguments);
		if(this.waitingForData) {
			this.$.loadSpinner.show();
		}
	}
});
