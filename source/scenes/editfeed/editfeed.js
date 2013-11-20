/*
 *		source/editfeed/editfeed.js
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
	name:			"EditFeedDialog",
	kind:			ModalDialog,

	events:	{
		onFeedSaved:	"",
		onCanceled:		""
	},

	published:	{
		feed:			null
	},

	components:	[{
		kind:		enyo.Scroller,
		horizontal:	"hidden",
		fit:		true,
		components:	[{
			kind:		onyx.Groupbox,
			components:	[{
                kind:       onyx.GroupboxHeader,
                content:	$L("Basic settings")
            }, {
                kind:               onyx.InputDecorator,
                components:         [{
                    name:			"url",
                    kind:			onyx.Input,
					type:			"url",
                    placeholder:	$L("URL of RSS/ATOM Feed...")
                }]
			}, {
                kind:               onyx.InputDecorator,
                components:         [{
                    name:		    "name",
                    kind:		    onyx.Input,
                    placeholder:    $L("Feed name...")
                }]
			}, {
				name:		"activateFeed",
				kind:		ToggleItem,
				caption:	$L("Activate Feed"),
				value:		true
			}]
		}, {
			kind:		onyx.Groupbox,
			components:	[{
                kind:       onyx.GroupboxHeader,
                content:	$L("Credentials")
            }, {
                kind:               onyx.InputDecorator,
                components:         [{
                    name:				"username",
                    kind:				onyx.Input,
                    placeholder:		$L("User name")
                }]
			}, {
                kind:   onyx.InputDecorator,
                components: [{
					name:	        "password",
                    kind:           onyx.Input,
                    type:           "password",
                    placeholder:    $L("Password")
                }]
			}]
		}, {
			kind:		onyx.Groupbox,
			components:	[{
                kind:       onyx.GroupboxHeader,
                content:	$L("Story list display")
            }, {
				name:	"listMode",
				kind:	SelectorItem,
				items:	[{
					caption:	$L("Captions and summaries"),
					value:		0
				}, {
					caption:	$L("Only captions"),
					value:		1
				}, {
					caption:	$L("Only summaries"),
					value:		2
				}],
				caption:	$L("Show")
			}, {
				name:	"sortMode",
				kind:	SelectorItem,
				items:	[{
					caption:	$L("Show all stories"),
					value:		0
				}, {
					caption:	$L("Show only unread stories"),
					value:		1
				}, {
					caption:	$L("Show only new stories"),
					value:		2
				}],
				caption:	$L("Filter")
			}]
		}, {
			kind:		onyx.Groupbox,
			components:	[{
                kind:       onyx.GroupboxHeader,
                content:	$L("Story display")
			}, {
				name:		"showPicture",
				kind:		ToggleItem,
				caption:	$L("Show story picture"),
				value:		true
			}, {
				name:		"showMedia",
				kind:		ToggleItem,
				caption:	$L("Show story media"),
				value:		true
			}, {
				name:		"allowHTML",
				kind:		ToggleItem,
				caption:	$L("Render HTML"),
				value:		true
			}]
		}]
	}, {
        kind:       enyo.FittableColumns,
		classes:	"center-text",
		style:		"padding-top: 8px; padding-bottom: 20px",
		components:	[{
			name:		"saveButton",
			kind:		ActivityButton,
			classes:	"onyx-affirmative",
			content:	$L("Save"),
			ontap:		"saveClicked"
		}, {
		}, {
			name:		"cancelButton",
			kind:		onyx.Button,
			classes:	"onyx-negative",
			content:	$L("Cancel"),
			ontap:		"cancelClicked"
		}]
	}],

	create: function() {
		this.inherited(arguments);

		this.updateSuccess = enyo.bind(this, this.updateSuccess);
		this.updateFailed = enyo.bind(this, this.updateFailed);
	},

	saveClicked: function() {
		if(!this.$.url.getValue || (this.$.url.getValue().length <= 0)) {	// In case no url is entered, simply exit the scene.
			return this.cancelClicked();
		}

		// Update the UI.
		this.$.saveButton.setActive(true);
		this.$.saveButton.setCaption(this.adding ? $L("Adding Feed...") : $L("Updating Feed..."));
		this.$.saveButton.setDisabled(true);

		// Update the feed object.
		this.feed.url = this.$.url.getValue();
		this.feed.title = this.$.name.getValue();
		this.feed.enabled = this.$.activateFeed.getValue();

		this.feed.username = this.$.username.getValue();
		this.feed.password = this.$.password.getValue();

		this.feed.showListCaption = (this.$.listMode.getValue() == 0) || ((this.$.listMode.getValue() % 2) == 1);
		this.feed.showListSummary = (this.$.listMode.getValue() % 2) == 0;

		this.feed.showDetailCaption = true;
		this.feed.showDetailSummary = true;

		this.feed.showPicture = this.$.showPicture.getValue();
		this.feed.showMedia = this.$.showMedia.getValue();
		this.feed.sortMode = this.$.sortMode.getValue();
		this.feed.allowHTML = this.$.allowHTML.getValue();

		if(/^[a-z]{1,5}:/.test(this.feed.url) === false) {
			this.feed.url = this.feed.url.replace(/^\/{1,2}/, "");
			this.feed.url = "http://" + this.feed.url;
		}

		// Update the entered URL
		this.$.url.setValue(this.feed.url);

		// Save the feed.
		enyo.application.feeds.addOrEditFeed(this.feed, this.updateSuccess, this.updateFailed);
        return true;
	},


	resetButtons: function() {
		this.$.saveButton.setActive(false);
		this.$.saveButton.setCaption($L("Save"));
		this.$.saveButton.setDisabled(false);
	},

	updateSuccess: function() {
		this.doFeedSaved();
		this.resetButtons();
		this.hide();

        return true;
	},

	updateFailed: function() {
		this.resetButtons();
        return true;
	},

	cancelClicked: function() {
		this.doCanceled();
		this.hide();
		this.resetButtons();
        return true;
	},

	feedChanged: function() {
		if(!this.feed) {
			this.adding = true;
			this.feed = new Feed();
			this.setCaption($L("Add feed"));
		} else {
			this.adding = false;
			this.setCaption($L("Edit feed"));
		}

		var listMode = 0;

		if(this.feed.showListSummary && this.feed.showListCaption) {
			listMode = 0;
		} else if(this.feed.showListCaption) {
			listMode = 1;
		} else if(this.feed.showListSummary) {
			listMode = 2;
		}

		this.$.name.setValue(this.feed.title);
		this.$.url.setValue(this.feed.url);
		this.$.activateFeed.setValue(this.feed.enabled);

		this.$.username.setValue(this.feed.username || "");
		this.$.password.setValue(this.feed.password || "");

		this.$.listMode.setValue(listMode);
		this.$.sortMode.setValue(this.feed.sortMode);

		this.$.showPicture.setValue(this.feed.showPicture);
		this.$.showMedia.setValue(this.feed.showMedia);
		this.$.allowHTML.setValue(this.feed.allowHTML);

        return true;
	},

	show: function(feed) {
		this.feed = feed;
		this.inherited(arguments);
		this.feedChanged();
        if(!enyo.Panels.isScreenNarrow())
			this.$.url.focus();
	}
});
