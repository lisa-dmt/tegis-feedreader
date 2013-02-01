/*
 *		source/storylist/storylist.js
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
	name:			"StoryList",
	kind:			"ListViewSkeleton",

	published:	{
		feed:		undefined,
		updateOnly:	false
	},

	events:	{
		onStorySelected:	"",
		onStoryDeleted:		"",
		onBackClick:		""
	},

	components:	[{
		kind:		"onyx.Toolbar",
		classes:	"toolbar-light",
		components:	[{
			kind:		"TopSceneControl",
			ontap:		"doBackClick"
		}, {
			name:		"header",
			classes:	"float-left"
		}]
	}, {
		name:		"searchBox",
		showing:	false,
		components:	[{
            kind: "onyx.InputDecorator",
            components: [{
                kind:           "onyx.Input",
                name:			"searchInput",
                onchange:		"filterChanged",
                onCancel:		"filterCanceled"
            }, {
                kind: "Image",
                src: "assets/search-input-search.png"
            }]
		}, {
			className:	"header-shadow"
		}]
	}, {
		kind:			enyo.List,
		name:			"list",
		fit:			true,

		onSetupItem: 	"setupStory",
		showing:		false,

		components: [{
			name:		"feedDivider",
			kind:		"Divider"
		}, {
			name:		"timeDivider",
			kind:		"Divider"
		}, {
			name:		"item",
			kind:		"onyx.Item",
			layoutKind:	"FittableRowsLayout",
			onConfirm:	"itemDeleted",
			ontap:		"itemClicked",
			components:	[{
				components: [{
					name:		"starButton",
					kind:		"StarButton",
					style:		"float: right",
					onChange:	"storyStarred"
				}, {
					name:		"storyDate",
					nodeTag:	"div",
					className:	"story-date"
				}]
			}, {
				name:		"storyTitle",
				nodeTag:	"div",
				className:	"story-title",
				allowHtml:	true
			}, {
				name:		"storyText",
				nodeTag:	"div",
				className:	"story-content",
				allowHtml:	true
			}]
		}]
	}, {
		name:		"bgContainer",
		kind:		"FittableColumns",
		classes:	"nodata-panel",
		fit:		true
	}, {
		kind:		"onyx.Toolbar",
		components:	[{
			kind:		"BottomSubSceneControl"
		}, {
			name:		"sortButton",
			kind:		"onyx.IconButton",
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-settings.png",
			ontap:		"sortClicked"
		}, {
			name:		"shareButton",
			kind:		"onyx.IconButton",
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-share.png",
			ontap:		"shareClicked"
		}, {
			name:		"searchButton",
			kind:		"onyx.IconButton",
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-search.png",
			ontap:		"searchClicked"
		}, {
			name:		"refreshButton",
			kind:		"onyx.IconButton",
			classes:    "float-right tool-button",
			src:		"assets/toolbars/icon-sync.png",
			ontap:		"refreshClicked"
		}]
	}],

	tools: [{
		name:			"shareMenu",
		kind:			"EnhancedMenu",
		components:		[{
			caption:	$L("Send via E-Mail"),
			ontap:		"shareViaEmail"
		}, {
			caption:	$L("Send via SMS/IM"),
			ontap:		"shareViaIM"
		}]
	}, {
		name:				"sortMenu",
		kind:				"EnhancedMenu",
		autoCloseSubItems:	false
	}, {
		kind:						enyo.Signals,
		onStoryListChanged:			"refresh"
//		onFeedUpdating:				"setFeedUpdateState",
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

		this.$.item.addRemoveClass(this.selectionClass, sender.isSelected(index));

		// Set the contents.
		this.$.storyTitle.setContent(this.feed.showListCaption ? story.title : "");
		this.$.storyText.setContent(this.feed.showListSummary ? summary : "");
		this.$.starButton.setChecked(story.isStarred);

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
/*					this.$.feedDivider.setCaption(enyo.application.feeds.getFeedTitle({
						feedType:	story.feedType,
						title:		story.feedTitle
					}));
					this.$.feedDivider.canGenerate = true;
					dividerShown = true;
					*/
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
/*		if((index == 0) ||
		   (!enyo.application.feeds.getDateFormatter().datesEqual(this.items[index].pubdate, this.items[index - 1].pubdate))) {
			this.$.timeDivider.setCaption(enyo.application.feeds.getDateFormatter().formatDate(story.pubdate));
			this.$.timeDivider.canGenerate = true;
			dividerShown = true;
		}*/

		this.$.item.applyStyle("border-top", dividerShown ? "none" : null);
		this.$.storyDate.setContent(feedTitle + enyo.application.feeds.getDateFormatter().formatTime(story.pubdate));

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
		if(this.selectedIndex >= 0) {
			this.doStorySelected(this.items[this.selectedIndex]);
		}
	},

	itemDeleted: function(sender, index) {
		if(this.inherited(arguments)) {
			this.doStorySelected(null);
		}
		this.doStoryDeleted(this.deletedItem);
		enyo.application.feeds.deleteStory(this.deletedItem);
		this.deletedItem = null;
	},

	itemClicked: function(sender, event) {
		this.inherited(arguments);
		this.doStorySelected(this.items[event.index]);
	},

	storyStarred: function(sender, event) {
		var story = this.items[event.rowIndex];
		story.isStarred = sender.getChecked();
		enyo.application.feeds.markStarred(story);

		if(this.selectedIndex == event.rowIndex) {
			// Refresh the story view.
			this.doStorySelected(story);
		}
	},

	//
	// Ordering and filtering
	//

	sortClicked: function(sender, event) {
		var visibleItems = [{
			kind:		"MenuCheckItem",
			caption:	$L("Show all stories"),
			checked:	(this.feed.sortMode & 0x00FF) == 0,
			ontap:		"showAll"
		}, {
			kind:		"MenuCheckItem",
			caption:	$L("Show only unread stories"),
			checked:	(this.feed.sortMode & 0x00FF) == 1,
			ontap:		"showUnRead"
		}, {
			kind:		"MenuCheckItem",
			caption:	$L("Show only new stories"),
			checked:	(this.feed.sortMode & 0x00FF) == 2,
			ontap:		"showNew"
		}];

		var items = undefined;
		if((this.feed.feedType == feedTypes.ftAllItems) ||
		   (this.feed.feedType == feedTypes.ftStarred)) {
			items = [{
				kind:		"MenuItem",
				caption:	$L("Visible stories"),
				open:		true,
				components:	visibleItems
			}, {
				kind:		"MenuItem",
				caption:	$L("Ordering"),
				open:		true,
				components:	[{
					kind:		"MenuCheckItem",
					caption:	$L("Order by feed"),
					checked:	(this.feed.sortMode & 0x0100) == 0,
					ontap:		"orderToggled"
				}, {
					kind:		"MenuCheckItem",
					caption:	$L("Order by date"),
					checked:	(this.feed.sortMode & 0x0100) != 0,
					ontap:		"orderToggled"
				}]
			}];
		}

		this.$.sortMenu.setItems(items || visibleItems);
		this.$.sortMenu.openAtEvent(event);
	},

	setSortMode: function(value) {
		this.feed.sortMode = value;
		enyo.application.feeds.setSortMode(this.feed);
		this.refresh();
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

	hideSearchBox: function(noRefresh) {
		if(this.$.searchBox.getShowing()) {
			if(this.filter != "") {
				this.$.list.scrollToStart();
			}
			this.$.searchBox.hide();
			this.$.searchInput.setValue("");
			this.filter = "";
			if(!noRefresh) {
				this.refresh();
			}
		}
	},

	searchClicked: function() {
		if(this.$.searchBox.getShowing()) {
			this.hideSearchBox();
		} else {
			this.$.searchBox.show();
			this.$.searchInput.forceFocus();
		}
	},

	filterCanceled: function() {
		this.filter = "";
		this.$.searchInput.forceBlur();
		this.$.list.scrollToStart();
		this.refresh();
	},

	filterChanged: function() {
		this.filter = this.$.searchInput.getValue();
		this.$.list.scrollToStart();
		this.refresh();
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
		this.$.shareMenu.openAtEvent(event);
	},

	//
	// Sharing
	//

	shareViaEmail: function(sender, event) {
		enyo.application.feeds.getFeedURLList(this.feed, function(urls) {
			var text = '';
			for(i = 0; i < urls.length; i++) {
				text += '<li><a href="' + urls[i].url + '">' + urls[i].title + '</a></li>';
			}
			enyo.application.openEMail($L("Check out these stories"),
									'<ul>' + text + '</ul>');
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
			this.$.header.setContent($L("Story list"));
		} else {
			this.$.header.setContent(enyo.application.feeds.getFeedTitle(this.feed));
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
		this.updateOnly = false;
	},

	//
	// Public functions
	//

	refresh: function() {
		if(this.feed) {
			this.inherited(arguments);
		}
	},

	spoolerRunningChanged: function(state) {
		this.$.refreshButton.setDisabled(state || !this.feed || !this.feed.enabled);
	},

	//
	// Initialization
	//

	initComponents: function() {
	//	this.createChrome(this.tools);
		this.inherited(arguments);
	},

	create: function() {
		this.inherited(arguments);
		this.feedChanged();
	}
});
