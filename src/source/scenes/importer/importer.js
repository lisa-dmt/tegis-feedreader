/*
 *		source/importer/importer.js
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
	name:			"FeedImporter",
	kind:			enyo.FittableRows,

	events:			{
		onBackClick:	""
	},

	items:			[],
	url:			"",
	inHeader:		false,
	parser:			null,
	parserHandler:	null,
	index:			0,

	components:	[{
		kind:		onyx.Toolbar,
		classes:	"toolbar-light",
		components:	[{
			kind:		TopSceneControl,
			ontap:		"doBackClick"
		}, {
			content:	$L("Discover feeds"),
			classes:	"float-left"
		}]	}, {
		kind:		onyx.Groupbox,
		layoutKind:	enyo.FittableRowsLayout,
		classes:	"additional-scene center-div",
		style:		additionalSceneWidthStyle(),
		components:	[{
			kind:       onyx.GroupboxHeader,
			content:    $L("Origin")
		}, {
			kind:           onyx.InputDecorator,
			components:     [{
				name:			"url",
				kind:			onyx.Input,
				placeholder:	$L("URL of website...")
			}]
		}]
	},{
		classes:		"additional-scene center-div center-text",
		style:			additionalSceneWidthStyle(),
		components:		[{
			name:		"scanButton",
			kind:		ActivityButton,
			content:	$L("Scan for feeds"),
			ontap:		"scanURL"
		}, {
			kind:		Divider,
			caption:	$L("Feeds found on website")
		}, {
			name:		"noScanLabel",
			style:		"margin-top: 10px",
			allowHtml:	true,
			content:	$L("Enter a URL and tap <b>Scan for feeds</b>.")
		}, {
			name:		"noConnLabel",
			content:	$L("No Internet connection available.")
		}, {
			name:		"noDataLabel",
			content:	$L("No feeds found. Maybe the URL is wrong.")
		}]
	}, {
		name:			"list",
		kind:			enyo.List,
		classes:		"additional-scene center-div",
		style:			additionalSceneWidthStyle(),
		reorderable:	false,
		fit:			true,
		onSetupItem:	"setupRow",
		components:	[{
			name:		"item",
			kind:		onyx.Item,
			classes:	"feedlist-item inline-item",
			ontap:		"feedClicked",
			components:	[{
				name:		"feedInfoBox",
				classes:	"feed-infobox",
				components:	[{
					kind:	enyo.Image,
					name:	"feedIcon",
					src:	"assets/lists/icon-rss.png",
					style:	"max-width: 40px; max-height: 40px;"
				}]
			}, {
				classes:	"feed-title-box large",
				components: [{
					name:		"feedTitle",
					classes:	"feed-title shorten-text"
				}, {
					name:		"feedURL",
					classes:	"feed-url shorten-text"
				}]
			}]
		}]
	}, {
		kind:		onyx.Toolbar,
		components:	[{
			kind:		BottomMainSceneControl,
			ontap:		"doBackClick"
		}]
	}, {
		name:					"subscribeDialog",
		kind: 					DialogPrompt,
		caption:				$L("Subscribe to feed"),
		acceptButtonCaption: 	$L("Yes"),
		cancelButtonCaption: 	$L("No"),
		onAccept: 				"doSubscribe"
	}],

	resetScanButton: function() {
		this.inHeader = false;
		this.$.scanButton.setActive(false);
		this.$.scanButton.setDisabled(false);
		this.$.scanButton.setCaption($L("Scan for feeds"));
	},

	reInitialize: function() {
		this.url = "";
		this.items = [];
		this.$.list.setCount(0);
		this.$.url.setValue("");
		this.resetScanButton();

		this.$.noDataLabel.hide();
		this.$.noConnLabel.hide();
		this.$.noScanLabel.show();
		this.resized();
	},

	scanURL: function(sender, event) {
		this.$.noScanLabel.hide();
		this.$.noConnLabel.hide();
		this.items = [];

		this.url = this.$.url.getValue().replace(/^\s+|\s+$/g, '');
		if(this.url.length <= 0) {
			this.reInitialize();
			return;
		}

		if(/^[a-z]{1,5}:/.test(this.url) === false) {
			this.url = "http://" + this.url.replace(/^\/{1,2}/, "");
			this.$.url.setValue(this.url);
		}

		this.$.scanButton.setCaption($L("Scanning for feeds..."));
		this.$.scanButton.setActive(true);
		this.resized();

		enyo.application.connChecker.checkConnection(this.connectionAvailable, this.connectionNotAvailable);
	},

	setupRow: function(sender, event) {
		var index = event.index;
		if((index < 0) || (index >= this.items.length)) {
			return false;
		}

		var feed = this.items[index];
		this.$.feedIcon.setSrc("assets/lists/icon-" + feed.type + ".png");
		this.$.feedTitle.setContent(feed.title);
		this.$.feedURL.setContent(feed.url);
	},

	feedClicked: function(sender, event) {
		this.index = event.rowIndex;

		var msg = enyo.macroize($L('Do you want to subscribe to "{$feed}"?'), { feed: this.items[this.index].title });
		this.$.subscribeDialog.setMessage(msg);
		this.$.subscribeDialog.show();
	},

	doSubscribe: function(sender, event) {
		// Create a new feed object.
		var f = new Feed();
		f.title = this.items[this.index].title;
		f.url = this.items[this.index].url;

		// Remove the feed from the list.
		this.items.splice(this.index, 1);
		this.items = enyo.clone(this.items);
		this.$.list.setCount(this.items.length);
		this.$.list.refresh();

		// Save the feed.
		enyo.asyncMethod(this, function() {
			enyo.application.feeds.addOrEditFeed(f);
		});
	},

	connectionAvailable: function() {
		var ajax = new enyo.Ajax({
			url:		this.url,
			handleAs:	"text"
		});
		ajax.response(this, "retrievalSuccess");
		ajax.error(this, "retrievalFailed");
		ajax.go({});
	},

	connectionNotAvailable: function() {
		this.$.noConnLabel.show();
		this.$.list.setCount(0);
		this.$.list.refresh();
		this.resetScanButton();
	},

	retrievalSuccess: function(sender, response) {
		if(response && response.length > 0) {
			var url = sender.xhr.getResponseHeader("Location");
			if(url && (url.length > 0)) {
				this.url = url;
				this.$.url.setValue(this.url);
			}

			this.log("Got response from web!");
			try {
				this.inHeader = true;
				this.parser.parse(response, this.parserHandler);
			} catch(e) {
				this.error("PARSE EXCEPTION>", e);
			}
		} else {
			this.log("No data retrieved.");
		}

		this.$.noDataLabel.setShowing(this.items.length <= 0);
		this.$.list.setCount(this.items.length);
		this.$.list.refresh();
		this.resetScanButton();
		this.resized();
	},

	retrievalFailed: function(sender, response) {
		this.log("Retrieval failed");
		this.$.noDataLabel.show();
		this.$.list.setCount(0);
		this.$.list.refresh();
		this.resetScanButton();
		this.resized();
	},

	parseStartTag: function(tag, attr) {
		if(tag.match(/head/i)) {
			this.inHeader = true;
		} else if(!this.inHeader) {
			return;
		} else if(tag.match(/link/i)) {
			var possibility = 0;
			var type = "";
			var href = "";
			var title = "RSS Feed";

			for(var i = 0; i < attr.length; i++) {
				if(attr[i] && attr[i].name && attr[i].value) {
					if(attr[i].name.match(/rel/i) &&
					   attr[i].value.match(/alternate/i)) {
						possibility++;
					} else if(attr[i].name.match(/type/i) &&
							  attr[i].value &&
							  attr[i].value.match(/application\/atom\+xml/i)) {
						type = "atom";
						possibility++;
					} else if(attr[i].name.match(/type/i) &&
							  attr[i].value &&
							  attr[i].value.match(/application\/rss\+xml/i)) {
						type = "rss";
						possibility++;
					} else if(attr[i].name.match(/href/i) && attr[i].value) {
						href = attr[i].value.replace("&amp;", "&");
						possibility++;
					} else if(attr[i].name.match(/title/i)) {
						title = attr[i].value;
					}
				}
			}

			if((possibility == 3) && (href.length > 0)) {
				if(/^[a-z]{1,5}:/.test(href) === false) {	// relative URL
					if(/^\//.test(href)) {					// relative to server root
						href = this.url.replace(/(^[a-z]{1,5}:\/\/[^\/]*).*/, "$1") + href;
					} else {								// relative to document path
						href = this.url.replace(/(.*)\//, "$1") + "/" + href;
					}
				}

				this.items.push({
					type:	type,
					title:	title,
					url:	href
				});

				this.log("Found a feed, type:", type, " url:", href);
			}
		}
	},

	parseEndTag: function(tag) {
		if(tag.match(/head/i)) {
			this.parser.finished = true;
		}
	},

	parseCharacters: function(s) {},
	parseComment: function(s) {},

	create: function() {
		this.inherited(arguments);

		this.connectionAvailable = enyo.bind(this, this.connectionAvailable);
		this.connectionNotAvailable = enyo.bind(this, this.connectionNotAvailable);
		this.parser = new SimpleHtmlParser();

		this.parserHandler = {
			startElement: 	enyo.bind(this, this.parseStartTag),
			endElement:		enyo.bind(this, this.parseEndTag),
			characters:		enyo.bind(this, this.parseCharacters),
			comment:		enyo.bind(this, this.parseComment)
		};
	}
});
