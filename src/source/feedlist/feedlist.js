/*
 *		source/feedlist/feedlist.js
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
	name:			"FeedList",
	kind:			"ListViewSkeleton",

	menuIndex:		0,
	spinningIndex:	-1,
	waitingForData:	true,

	events:		{
		onOpenAppMenu:		"",
		onFeedSelected:		"",
		onFeedDeleted:		"",
		onAddFeed:			"",
		onEditFeed:			""
	},

	components:	[{
		kind:		"onyx.Toolbar",
		name:		"header",
		classes:	"toolbar-light",
		components:	[{
			kind:	"onyx.Icon",
			src:	"icon32.png",
			style:	"height: 32px; width: 32px; margin-top: 0px; vertical-align: center;",
			ontap:	"openAppMenu"
		}, {
			content:	$L("Feed Subscriptions")
		}]
	}, {
        kind:				"enyo.PulldownList",
        name:				"list",
        fit:				true,
		reorderable:		true,
		enableSwipe:		true,
		fixedHeight:		true,

        onSetupItem:    	"setupFeed",
        onReorder:			"reorderFeed",
		onPullRelease:		"listPulled",

        components: [{
            name:		"item",
			kind:		"onyx.Item",
			classes:	"feedlist-item",
            ontap:		"itemClicked",
            onConfirm:	"itemDeleted",
            components:	[{
				name:		"feedInfoBox",
                classes:	"feed-infobox",
				components:	[{
					kind:		"Image",
					name:		"feedIcon",
					classes:	isFirefox() ? "feed-icon mozilla" : "feed-icon webkit",
					src:		"assets/lists/icon-rss.png"
                }, {
					kind:	    "onyx.Spinner",
					name:	    "feedSpinner",
					classes:    "onyx-spinner-light small feed-spinner",
					showing:    false
				}, {
					name:		"unreadCountBadge",
					classes:	isFirefox() ? "feed-badge feed-unreaditem mozilla" : "feed-badge feed-unreaditem webkit",
					components:	[{
						name:		"unreadCount",
						classes:	isFirefox() ? "feed-countlabel mozilla" : "feed-count-label webkit",
						content:	"0"
					}]
				}, {
					name:		"newCountBadge",
					classes:	isFirefox() ? "feed-badge feed-newitem mozilla" : "feed-badge feed-newitem webkit",
					components:	[{
						name:		"newCount",
						classes:	isFirefox() ? "feed-countlabel mozilla" : "feed-count-label webkit",
						content:	"0"
					}]
				}]
			}, {
				classes:	"feed-title-box",
				components: [{
					name:		"feedTitle",
					classes:	"feed-title"
				}, {
					name:		"feedURL",
					classes:	"feed-url"
				}]
			}, {
				kind:				"MenuDecoupler",
				menu:				"feedMenu",
				list:				"list",
				classes:    		"list-edit-button",
				onBeforeShowMenu:	"beforeShowFeedMenu",
				components: [{
					kind:		"onyx.Button",
					classes:	"feed-edit-button",
					components:	[{
						kind:		"onyx.Icon",
						src:		"assets/lists/icon-edit.png"
					}]
				}]
			}]
        }]
	}, {
		name:		"loadSpinnerBox",
        fit:        true,
		components:	[{
			name:		"loadSpinner",
			kind:		"onyx.Spinner",
            style:      "width: 64px; height: 64px; margin: auto auto",
            classes:    "onyx-light"
		}]
	}, {
		kind:		"onyx.Toolbar",
		pack:		"justify",
		components:	[{
			kind:		"onyx.IconButton",
			classes:	"float-left",
			src:		"assets/toolbars/icon-new.png",
			ontap:	    "addFeedClicked"
		}, {
			name:		"refreshButton",
			kind:		"onyx.IconButton",
            classes:	"float-right",
			src:		"assets/toolbars/icon-sync.png",
			ontap:	    "refreshClicked"
		}]
	}],

	tools:	[{
		kind:						enyo.Signals,
		onFeedListChanged:			"refresh",
		onFeedUpdating:				"setFeedUpdateState",
		onSpoolerRunningChanged:	"spoolerRunningChanged"
	}, {
		name:		"feedMenu",
		kind:		"onyx.Menu",
		scrolling:	false,
		floating:	true,
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

//		this.$.item.setSwipeable((feed.feedType != feedTypes.ftAllItems) &&
//								 (feed.feedTypr != feedTypes.ftStarred));

		this.$.item.addRemoveClass(this.selectionClass, sender.isSelected(index));

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

	listPulled: function() {
		enyo.Signals.send("onUpdateAll");
	},

	acquireData: function(filter, inserter) {
		enyo.application.feeds.getFeeds(filter, inserter);
	},

	reorderFeed: function(sender, event) {
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
		if(this.selectedIndex >= 0) {
			this.doFeedSelected(this.items[this.selectedIndex]);
		}
	},

	itemClicked: function(sender, event) {
		if(this.inherited(arguments)) {
			this.doFeedSelected(this.items[event.rowIndex]);
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
		if(this.inherited(arguments)) {
			this.doFeedSelected(null);
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
			//this.$.feedSpinner.setShowing(state);
			this.spinningIndex = state ? index : -1;
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
