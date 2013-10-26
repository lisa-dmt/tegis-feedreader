/*
 *		source/storylist/storylist.js
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
	name:			"StoryList",
	kind:			ListViewSkeleton,

	published:	{
		feed:			undefined,
		updateOnly:		false,
		isLastFeed:		null,
		isFirstFeed:	null
	},

	events:	{
		onStorySelected:	"",
		onStoryDeleted:		"",
		onBackClick:		"",
		onNextFeed:			"",
		onPrevFeed:			""
	},

	searchTimer: null,

	components:	[{
		kind:		onyx.Toolbar,
		layoutKind:	enyo.FittableColumnsLayout,
		classes:	"toolbar-light",
		noStretch:	true,
		components:	[{
			kind:		TopSceneControl,
			ontap:		"doBackClick"
		}, {
			name:		"headerCaption",
			classes:	"shorten-text",
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
		kind:				SwipeableList,
		name:				"list",
		fit:				true,
		showing:			false,
		enableSwipe:		true,

		onSetupItem: 		"setupStory",
		onIsItemSwipeable:	"isItemSwipeable",

		components: [{
			name:		"feedDivider",
			kind:		Divider
		}, {
			name:		"timeDivider",
			kind:		Divider
		}, {
			name:		"item",
			kind:		onyx.Item,
			layoutKind:	"FittableRowsLayout",
			onConfirm:	"itemDeleted",
			ontap:		"itemClicked",
			components:	[{
				components: [{
					name:		"starButton",
					kind:		ListStarButton,
					style:		"float: right",
					onChange:	"storyStarred"
				}, {
					name:		"storyDate",
					nodeTag:	"div",
					classes:	"story-date"
				}]
			}, {
				name:		"storyTitle",
				nodeTag:	"div",
				classes:	"story-title",
				allowHtml:	true
			}, {
				name:		"storyText",
				nodeTag:	"div",
				classes:	"story-content",
				allowHtml:	true
			}]
		}]
	}, {
		name:		"bgContainer",
		kind:		enyo.FittableColumns,
		classes:	"nodata-panel",
		fit:		true
	}, {
		kind:		onyx.Toolbar,
		components:	[{
			name:		"prevFeedButton",
			kind:       onyx.IconButton,
			classes:	"float-left",
			src:		"assets/header/icon-back.png",
			disabled:	true,
			ontap:		"doPrevFeed"
		}, {
			kind:		enyo.Control,
			classes:	"float-left toolbar-separator"
		}, {
			name:		"nextFeedButton",
			kind:       onyx.IconButton,
			classes:	"float-left",
			src:		"assets/header/icon-forward.png",
			disabled:	true,
			ontap:		"doNextFeed"
		}, {
			name:		"sortButton",
			kind:		onyx.IconButton,
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-settings.png",
			ontap:		"sortClicked"
		}, {
			kind:		enyo.Control,
			classes:	"float-right toolbar-separator"
		}, {
			name:		"shareButton",
			kind:		onyx.IconButton,
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-share.png",
			ontap:		"shareClicked"
		}, {
			kind:		enyo.Control,
			classes:	"float-right toolbar-separator"
		}, {
			name:		"searchButton",
			kind:		ToggleIconButton,
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-search.png",
			ontap:		"searchClicked"
		}, {
			kind:		enyo.Control,
			classes:	"float-right toolbar-separator"
		}, {
			name:		"refreshButton",
			kind:		onyx.IconButton,
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-sync.png",
			ontap:		"refreshClicked"
		}]
	}],

	tools: [{
		name:			"shareMenu",
		kind:			onyx.Menu,
		scrolling:		false,
		floating:		true,
		components:		[{
			content:	$L("Send via E-Mail"),
			ontap:		"shareViaEmail"
		}, {
			name:		"shareViaIMItem",
			content:	$L("Send via SMS/IM"),
			ontap:		"shareViaIM"
		}]
	}, {
		name:			"sortMenu",
		kind:			onyx.Menu,
		scrolling:		false,
		floating:		true,
		components:		[{
			name:		"visibilityItem",
			content: 	$L("Visible stories"),
			classes: 	"onyx-menu-label"
		}, {
			name:		"showAllItem",
			content:	$L("Show all stories"),
			ontap:		"showAll"
		}, {
			name:		"showUnreadItem",
			content:	$L("Show only unread stories"),
			ontap:		"showUnRead"
		}, {
			name:		"showNewItem",
			content:	$L("Show only new stories"),
			ontap:		"showNew"
		}, {
			name:		"orderingItem",
			content:	$L("Ordering"),
			classes: 	"onyx-menu-label"
		}, {
			name:		"orderByFeedItem",
			content:	$L("Order by feed"),
			ontap:		"orderToggled"
		}, {
			name:		"orderByDateItem",
			content:	$L("Order by date"),
			ontap:		"orderToggled"
		}]
	}, {
		kind:						enyo.Signals,
		onStoryListChanged:			"refresh",
		onSpoolerRunningChanged:	"spoolerRunningChanged"
	}],

	//
	// List handling
	//

	setupStory: function(sender, event) {
		var index;
		if((index = this.indexFromEvent(event)) === false)
			return false;

		// Make the story easily available.
		var story = this.items[index];

		// If necessary, shorten the summary.
		var summary = "";
		if(this.feed.showListSummary) {
			var summaryLength = parseInt(enyo.application.prefs.summaryLength, 10);
			summary = enyo.application.feeds.formatting.stripHTML(story.summary);
			if(summary.length > (summaryLength + 10)) {
				summary = summary.slice(0, summaryLength - 1) + "...";
			}
		}

		// Only show selection state, if not running on a phone.
		if(!enyo.Panels.isScreenNarrow()) {
			this.$.item.addRemoveClass(this.selectionClass, sender.isSelected(index));
		}

		// Set the contents.
		this.$.storyTitle.setContent(this.feed.showListCaption ? story.title : "");
		this.$.storyText.setContent(this.feed.showListSummary ? summary : "");
		this.$.starButton.updateState(story.isStarred);

		this.$.storyTitle.applyStyle("color", enyo.application.prefs.getCSSTitleColor());
		this.$.storyTitle.applyStyle("font-weight", story.isRead ? "normal" : "bold");

		this.$.storyDate.applyStyle("font-size", enyo.application.prefs.largeFont ? "14px" : "12px");
		this.$.storyTitle.applyStyle("font-size", enyo.application.prefs.largeFont ? "18px" : "16px");
		this.$.storyText.applyStyle("font-size", enyo.application.prefs.largeFont ? "17px" : "15px");

		// Set the feedDivider.
		var feedTitle = "";
		var dividerShown = false;
		this.$.feedDivider.canGenerate = false;
		if((this.feed.feedType == feedTypes.ftAllItems) ||
		   (this.feed.feedType == feedTypes.ftStarred)) {
			if((this.feed.sortMode & 0x0100) != 0x0100) {
				if((index == 0) ||
				   (this.items[index].fid != this.items[index - 1].fid)) {
					this.$.feedDivider.setCaption(enyo.application.feeds.getFeedTitle({
						feedType:	story.feedType,
						title:		story.feedTitle
					}));
					this.$.feedDivider.canGenerate = true;
					dividerShown = true;
				}
			} else {
				feedTitle = enyo.application.feeds.getFeedTitle({
					feedType:	story.feedType,
					title:		story.feedTitle
				}) + ', ';
			}
		}

		// Set the timeDivider.
		this.$.timeDivider.canGenerate = false;
		if((index == 0) ||
		   (!enyo.application.feeds.getDateFormatter().datesEqual(this.items[index].pubdate, this.items[index - 1].pubdate))) {
			this.$.timeDivider.setCaption(enyo.application.feeds.getDateFormatter().formatDate(story.pubdate));
			this.$.timeDivider.canGenerate = true;
			dividerShown = true;
		}

		this.$.item.applyStyle("border-top", dividerShown ? "none" : null);
		this.$.storyDate.setContent(feedTitle + enyo.application.feeds.getDateFormatter().formatTime(story.pubdate));

		return true;
	},

	isItemSwipeable: function(sender, event) {
		return true;
	},

	acquireData: function(filter, inserter) {
		enyo.application.feeds.getStories(this.feed, filter, inserter);
	},

	canRefresh: function() {
		return ((this.feed != null) && (this.feed != undefined));
	},

	refreshFinished: function() {
		this.inherited(arguments);
		this.updateOnly = false;
	},

	itemDeleted: function(sender, index) {
		if(this.inherited(arguments)) {
			this.doStorySelected({
				item:		null,
				isFirst:	true,
				isLast: 	true
			});
		}
		this.doStoryDeleted(this.deletedItem);
		enyo.application.feeds.deleteStory(this.deletedItem);
		this.deletedItem = null;
	},

	itemClicked: function(sender, event) {
		if(!this.inherited(arguments))
			return true;

		this.$.searchBox.blur();
		this.doStorySelected({
			item:		this.items[event.index],
			isFirst:	event.index == 0,
			isLast:		event.index == (this.items.length - 1)
		});
	},

	storyStarred: function(sender, event) {
		var story = this.items[event.rowIndex];
		story.isStarred = !story.isStarred;
		sender.updateState(story.isStarred);
		enyo.application.feeds.markStarred(story);

		if(this.selectedIndex == event.rowIndex) {
			// Refresh the story view.
			this.doStorySelected({
				item:		this.items[this.selectedIndex],
				isFirst:	this.selectedIndex == 0,
				isLast:		this.selectedIndex == (this.items.length - 1)
			});
		}
	},

	//
	// Ordering and filtering
	//

	sortClicked: function(sender, event) {
		var isAggregation = (this.feed.feedType == feedTypes.ftAllItems) ||
			(this.feed.feedType == feedTypes.ftStarred);

		// The headers are only shown in feed aggregations.
		this.$.visibilityItem.setShowing(isAggregation);
		this.$.orderingItem.setShowing(isAggregation);

		// Enyo2 has no MenuCheckItem like Enyo1 had. We simulate
		// that by making the 'checked' item look selected.
		this.$.showAllItem.addRemoveClass(this.selectionClass, (this.feed.sortMode & 0x00FF) == 0);
		this.$.showUnreadItem.addRemoveClass(this.selectionClass, (this.feed.sortMode & 0x00FF) == 1);
		this.$.showNewItem.addRemoveClass(this.selectionClass, (this.feed.sortMode & 0x00FF) == 2);

		if(isAggregation) {
			this.$.orderByFeedItem.addRemoveClass(this.selectionClass, (this.feed.sortMode & 0x0100) == 0);
			this.$.orderByDateItem.addRemoveClass(this.selectionClass, (this.feed.sortMode & 0x0100) != 0);
		}

		enyo.openMenuAtEvent(this.$.sortMenu, sender, event);
	},

	setSortMode: function(value) {
		this.feed.sortMode = value;
		enyo.application.feeds.setSortMode(this.feed);
	},

	showAll: function() {
		this.setSortMode((this.feed.sortMode & 0xFF00) | 0);
	},

	showUnRead: function() {
		this.setSortMode((this.feed.sortMode & 0xFF00) | 1);
	},

	showNew: function() {
		this.setSortMode((this.feed.sortMode & 0xFF00) | 2);
	},

	orderToggled: function() {
		this.setSortMode(this.feed.sortMode ^ 0x0100);
	},

	//
	// Toolbar handling
	//

	refreshClicked: function(sender, event) {
		if(this.feed) {
			enyo.application.feeds.enqueueUpdate(this.feed);
		}
	},

	shareClicked: function(sender, event) {
		this.$.shareViaIMItem.setShowing(enyo.application.helper.canShareViaIM);
		enyo.openMenuAtEvent(this.$.shareMenu, sender, event);
	},

	//
	// Sharing
	//

	shareViaEmail: function(sender, event) {
		enyo.application.feeds.getFeedURLList(this.feed, function(urls) {
			var text = '';
			if(enyo.application.helper.hasHTMLMail) {
				for(i = 0; i < urls.length; i++) {
					text += '<li><a href="' + urls[i].url + '">' + urls[i].title + '</a></li>';
				}
				text = '<ul>' + text + '</ul>';
			} else {
				for(i = 0; i < urls.length; i++) {
					text += urls[i].title + " (" + urls[i].url + ") ";
				}
			}

			enyo.application.openEMail($L("Check out these stories"), text);
		});
	},

	shareViaIM: function(sender, email) {
		enyo.application.feeds.getFeedURLList(this.feed, function(urls) {
			var text = $L("Check out these stories") + ': ' + urls[0].url;
			for(i = 1; i < urls.length; i++) {
				text += ', ' + urls[i].url;
			}
			enyo.application.openMessaging(text);
		});
	},

	//
	// Property handling
	//

	feedChanged: function() {
		var feedInvalid = !this.feed;
		if(feedInvalid) {
			this.$.headerCaption.setContent($L("Story list"));
		} else {
			this.$.headerCaption.setContent(enyo.application.feeds.getFeedTitle(this.feed));
		}

		this.$.list.setShowing(!feedInvalid);
		this.$.bgContainer.setShowing(feedInvalid);

		this.$.sortButton.setDisabled(feedInvalid);
		this.$.refreshButton.setDisabled(enyo.application.spooler.actionRunning || feedInvalid || !this.feed.enabled);
		this.$.shareButton.setDisabled(feedInvalid);
		this.$.searchButton.setDisabled(feedInvalid);

		if(!this.updateOnly) {
			this.hideSearchBox(true);
			this.clear();
		}
		this.refresh();
		this.resized();
	},

	isLastFeedChanged: function() {
		this.$.nextFeedButton.setDisabled(this.isLastFeed);
	},

	isFirstFeedChanged: function() {
		this.$.prevFeedButton.setDisabled(this.isFirstFeed);
	},


	//
	// Public functions
	//

	refresh: function() {
		if(this.feed) {
			this.inherited(arguments);
		}
	},

	spoolerRunningChanged: function(sender, event) {
		this.$.refreshButton.setDisabled(event.state || !this.feed || !this.feed.enabled);
		if(!event.state) {
			this.log("STORYLIST> Spooler finished; refreshing");
			this.refresh();
		}
	},

	//
	// Initialization
	//

	initComponents: function() {
		this.createChrome(this.tools);
		this.inherited(arguments);
	},

	create: function() {
		this.inherited(arguments);
		this.feedChanged();
	}
});
