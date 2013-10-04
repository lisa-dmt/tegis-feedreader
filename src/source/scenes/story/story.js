/*
 *		source/story/story.js
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

var mediaKinds = {
	none:	0,
	audio:	1,
	video:	2
};

enyo.kind({
	name:		"StoryView",
	kind:		DraggableView,
	classes:	"story-body",

	published:	{
		feed:		null,
		story:		null,
		updateOnly:	false
	},

	events:		{
		onBackClick:	""
	},

	urls:			[],
	originFeed:		null,

	_mediaKind:		mediaKinds.none,
	_timer:			null,
	_mediaSeeking:	false,
    _scrolling:     false,

	components:	[{
		name:			"header",
		kind:			onyx.Toolbar,
		layoutKind:		enyo.FittableColumnsLayout,
		classes:		"toolbar-light",
		components:		[{
			kind:		TopSceneControl,
			ontap:		"doBackClick"
		}, {
			name:		"headerCaption",
			classes:	"shorten-text",
			fit:		true
		}, {
			name:		"backButton",
            kind:       onyx.IconButton,
			icon:		"assets/header/icon-back.png",
			enabled:	false,
			showing:	false,
			ontap:		"backClicked"
		}, {
			name:		"forwardButton",
            kind:       onyx.IconButton,
			icon:		"assets/header/icon-forward.png",
			enabled:	false,
			showing:	false,
			ontap:		"forwardClicked"
		}, {
			name:		"loadSpinner",
			kind:		onyx.Spinner
		}, {
			name:		"starButton",
			kind:		StarButton,
			disabled:	true,
			onChange:	"storyStarred"
		}]
	}, {
		name:			"storyContainer",
		kind:			enyo.FittableRows,
		fit:			true,
		showing:		false,
		defaultKind:	enyo.Control,
		components:		[{
			name:           "contentScroller",
			kind:			enyo.Scroller,
            onScrollStart:  "scrollingStarted",
            onScrollStop:   "scrollingStopped",
			fit:			true,
			components:		[{
				classes:	"story-body-header",
				components:	[{
					name:		"date",
					kind:		HeaderInfoLabel,
					caption:	$L("Date")
				}, {
					kind:		DottedSeparator
				}, {
					name:		"caption",
					kind:		HeaderInfoLabel,
					caption:	$L("Caption")
				}]
			}, {
				classes:	    "header-shadow",
				style:			"margin-bottom: 8px"
			}, {
				name:		"pictureBox",
				nodeTag:	"div",
				style:		"text-align: center;",
				components:	[{
					name:			"picture",
					kind:			enyo.Image,
					style:			"max-width: 98%",
					onload:			"pictureLoaded"
				}]
			}, {
				name:			    "content",
				kind:			    HtmlContent,
				style:				"margin-left: 5px; margin-right: 5px;",
				onLinkClick:	    "innerLinkClicked"
			}, {
				kind:				SilverSeparator
			}, {
				classes:			"center-text",
				components:			[{
					name:				"linkButton",
					kind:				onyx.Button,
					ontap:				"linkClicked",
					components:	[{
						kind:			onyx.Icon,
						src:			"assets/web-icon.png",
						classes:		"button-icon"
					}, {
						content:		$L("Open Weblink")
					}]
				}, {
					name:				"playVideoButton",
					kind:				onyx.Button,
					ontap:				"playVideoClicked",
					components:	[{
						kind:			onyx.Icon,
						src:			"assets/player-icon.png",
						classes:		"button-icon"
					}, {
						content:		$L("Play Video")
					}]
				}]
			}]
		}]
	}, {
		name:				"webView",
		//kind:				"WebView",
		fit:				true,
		showing:			false,
		ignoreMetaTags:		true,
		blockPopups:		true,
		enableJavascript: 	true,
		onLoadStarted:		"loadStarted",
		onLoadStopped:		"loadFinished",
		onLoadComplete:		"loadFinished",
		onPageTitleChanged: "pageTitleChanged"
	}, {
		name:		"mediaControls",
		showing:	false,
		components:	[{
			kind:	enyo.FittableColumns,
			pack:	"center",
			components: [{
				name:		"mediaSlider",
				kind:		ProgressSlider,
				style:		"width: 94%",
				minimum:	0,
				maximum:	1000,
				barMinimum:	0,
				barMaximum:	1000,
				onChanging:	"mediaSeeking",
				onChange:	"mediaSeeked"
			}]
		}, {
			kind:		enyo.FittableColumns,
			style:		"margin: 5px; font-size: 15px; font-weight: bold;",
			components:	[{
				name:		"mediaStart",
				content:	"00:00"
			}, {
				name:		"mediaState",
				style:		"text-align: center;",
				content:	$L("Playing"),
				fit:		true
			}, {
				name:		"mediaEnd",
				content:	"99:99"
			}]
		}]
	}, {
		name:		"bgContainer",
		kind:		enyo.FittableColumns,
		classes:	"nodata-panel",
		fit:		true
	}, {
		kind:			onyx.Toolbar,
		components:		[{
			kind:		BottomSubSceneControl
		}, {
			name:		"mediaPlayButton",
			kind:		onyx.IconButton,
			icon:		"../../assets/player/enyo-icon-play.png",
			ontap:		"mediaPlayToggled",
			showing:	false
		}, {
			name:		"shareButton",
			kind:		onyx.IconButton,
			icon:		"../../assets/toolbars/icon-share.png",
			ontap:		"shareClicked"
		}]
/*	}, {
		name:			"linkMenu",
		kind:			"EnhancedMenu"
	}, {
		name:			"shareMenu",
		kind:			"EnhancedMenu",
		components:		[{
			caption:	$L("Send via E-Mail"),
			ontap:		"shareViaEmail"
		}, {
			caption:	$L("Send via SMS/IM"),
			ontap:		"shareViaIM"
		}]*/
/*	}, {
		name:			"audio",
		kind:			"EnhancedAudio",
		onStateChanged:	"mediaStateChanged",
		onProgress:		"mediaProgress",
		onCanPlay:		"mediaCanPlay"
	}, {
		name: 			"videoPlayer",
		kind: 			"PalmService",
		service:		"palm://com.palm.applicationManager/",
		method:			"launch"*/
	}],

	//
	// Property handling
	//

	storyChanged: function() {
		if(!this.updateOnly) {
			this.$.loadSpinner.hide();
			this.$.backButton.setDisabled(true);
			this.$.forwardButton.setDisabled(true);
		}
		if(!this.story) {
			this.$.starButton.setChecked(false);
			this.$.starButton.setDisabled(true);
			this.$.shareButton.setDisabled(true);
			this.$.bgContainer.show();
			this.$.storyContainer.hide();
			this.$.webView.hide();
			this.$.mediaControls.hide();

			this.setMediaTimer(false);
//			this.$.audio.setSrc("");

			this._mediaKind = mediaKinds.none;
			this.updateOnly = false;
			this.originFeed = null;
			this.urls = [];
		} else {
			enyo.application.feeds.getStory(this.story.id, this.gotStory);
		}
	},

	feedChanged: function() {
		var title = this.feed
			? enyo.application.feeds.getFeedTitle(this.feed)
			: "";
		this.$.headerCaption.setContent(title);
	},

	//
	// Story handling
	//

	gotStory: function(feed, story, urls) {
		this.originFeed = feed;
		this.story = story;
		this.urls = urls;

        this._scrolling = false;

		// Handle the largeFont setting.
		this.$.date.applyStyle("font-size", enyo.application.prefs.largeFont ? "120%" : "100%");
		this.$.caption.applyStyle("font-size", enyo.application.prefs.largeFont ? "120%" : "100%");
		this.$.content.applyStyle("font-size", enyo.application.prefs.largeFont ? "120%" : "100%");

		this.$.date.setLabel(enyo.application.feeds.getDateFormatter().formatDateTime(this.story.pubdate));
		this.$.caption.setLabel(this.story.title);
		this.$.starButton.setChecked(this.story.isStarred);
		this.$.starButton.setDisabled(false);
		this.$.shareButton.setDisabled(false);

		if(this.originFeed.fullStory) {
            this.$.contentScroller.scrollTo(0, 0);
			this.$.content.setContent(this.story.summary);
            PrependHyperLinks(this.$.content.node, this, this.handleClick);
			if(!this.story.picture || (this.story.picture.length <= 0)) {
				this.$.picture.hide();
				this.$.loadSpinner.hide();
			} else {
				this.log("STORY> retrieving picture from", this.story.picture);
				this.$.picture.setSrc("");
				this.$.picture.show();
				if(!this.updateOnly) {
					this.$.loadSpinner.show();
				}
				this.$.picture.setSrc(this.story.picture);
				enyo.application.connChecker.checkConnection(
					enyo.application.nop,
					this.noConnection);
			}
			this.$.backButton.hide();
			this.$.forwardButton.hide();
			this.$.loadSpinner.hide();
		} else {
			if(this.urls.length > 0) {
				if(!this.updateOnly) {
					this.$.webView.clearHistory();
					this.$.webView.setUrl(this.urls[0].href);
					this.$.loadSpinner.show();
				}
				this.$.backButton.show();
				this.$.forwardButton.show();
			}
		}

		// Mark the story as being read.
		if(!this.updateOnly && !this.story.isRead) {
			enyo.application.feeds.markStoryRead(this.story);
		}

		// Setup the visible elements.
		this.$.bgContainer.hide();
		if(this.originFeed.fullStory) {
			this.$.webView.hide();
			this.$.storyContainer.show();
			this.$.linkButton.setDisabled(this.urls.length <= 0);
		} else {
			this.$.storyContainer.hide();
			this.$.webView.show();
		}

//		this.setupMediaControls();

		this.resized();
		this.updateOnly = false;
	},

	noConnection: function() {
		this.$.picture.hide();
		this.$.loadSpinner.hide();
	},

	pictureLoaded: function() {
		this.$.loadSpinner.hide();
	},

	loadStarted: function() {
		this.$.loadSpinner.show();
	},

	loadFinished: function() {
		this.$.loadSpinner.hide();
	},

	pageTitleChanged: function(sender, title, url, canGoBack, canGoForward) {
		if(this.$.loadSpinner.getShowing()) {
			this.$.backButton.setDisabled(!canGoBack);
			this.$.forwardButton.setDisabled(!canGoForward);
		}
	},

	backClicked: function(sender, event) {
		this.$.webView.goBack();
	},

	forwardClicked: function(sender, event) {
		this.$.webView.goForward();
	},

	innerLinkClicked: function(sender, url) {
		enyo.application.openLink(url);
	},

	linkClicked: function(sender, event) {
		if(this.urls.length == 1) {
			enyo.application.openLink(this.urls[0].href);
		} else if(this.urls.length > 1) {
			// show a menu
		}
	},

    handleClick: function(href) {
        if(!this._scrolling) {
            enyo.application.openLink(href);
        }
    },

	//
	// Media handling
	//

	setupMediaControls: function() {
		try {
			if(this.originFeed.fullStory && (this.story.audio.length > 0)) {
				this.$.mediaEnd.setContent("99:99");
				this.$.mediaControls.show();
				this.$.mediaPlayButton.show();
				this.$.mediaPlayButton.setDisabled(true);
				this.$.mediaSlider.setPosition(0);

				this._mediaKind = mediaKinds.audio;
				this.$.audio.setSrc(this.story.audio);
				this.setMediaTimer(true);
			} else {
				this.$.mediaControls.hide();
				this.$.mediaPlayButton.hide();
				this._mediaKind = mediaKinds.none;
				this.$.audio.setSrc("");
				this.setMediaTimer(false);
			}

			// Once webOS 3.x is able to play the video inside the app,
			// this should be changed to provide the player inside
			// the app. In this case the storyContainer should be hidden
			// and a videoContainer should be shown.
			// This kind is programmed to be easily changeable once this
			// is possible.
			if(this.story.video.length > 0) {
				this.$.playVideoButton.show();
			} else {
				this.$.playVideoButton.hide();
			}
		} catch(e) {
			this.error("SETUP MEDIA EX>", e);
		}
	},

	getMediaControl: function() {
		switch(this._mediaKind) {
			case mediaKinds.audio:
				return this.$.audio;
			case mediaKinds.video:
				return null;
				// return this.$.video; /* Uncomment this once available */
			default:
				return null;
		}
	},

	mediaSeeking: function() {
		this._mediaSeeking = true;
		var mediaControl = this.getMediaControl();
		var position = mediaControl.getDuration() * this.$.mediaSlider.getPosition() / 1000;
		mediaControl.seek(position);
	},

	mediaSeeked: function() {
		this.mediaSeeking();
		this._mediaSeeking = false;
	},

	mediaPlayToggled: function(sender) {
		enyo.asyncMethod(this, function() {
			var mediaControl = this.getMediaControl();
			if(mediaControl.getPlaying()) {
				mediaControl.pause();
				sender.setIcon("../../assets/player/enyo-icon-play.png");
				this.setMediaTimer(false);
			} else {
				mediaControl.play();
				sender.setIcon("../../assets/player/enyo-icon-pause.png");
				this.setMediaTimer(true);
			}
		});
	},

	mediaStateChanged: function(sender) {
		try {
			this.$.mediaState.setContent(sender.getReadableState());
			var duration = enyo.application.feeds.getDateFormatter().formatTimeString(Math.min(sender.getDuration(), 480 * 60 + 59));
			this.$.mediaEnd.setContent(duration);
			var mediaControl = this.getMediaControl();
			if(mediaControl && !mediaControl.getPlaying()) {
				this.$.mediaPlayButton.setIcon("../../assets/player/enyo-icon-play.png");
			}
		} catch(e) {
			this.log("STATE CHANGED EX>", e);
		}
	},

	mediaCanPlay: function(sender) {
		this.$.mediaPlayButton.setDisabled(false);
	},

	mediaProgress: function(sender) {
		var buffered = sender.getBuffered();
		var duration = sender.getDuration();

		if(!this.seeking && buffered && duration) {
			this.$.mediaSlider.setBarPosition(buffered.end(0) * 1000 / duration);
		}
	},

	mediaUpdate: function(sender) {
		if(!this._mediaSeeking) {
			var duration = sender.getDuration();
			var time = sender.getCurrentTime();

			if(time && duration) {
				var position = time * 1000 / duration;
				this.$.mediaSlider.setPosition(position);
			}
		}
		this.setMediaTimer(true);
	},

	setMediaTimer: function(active) {
		var mediaControl = this.getMediaControl();
		if(active && mediaControl && (mediaControl.getPlaying())) {
			if(!this._timer) {
				this._timer = window.setInterval(enyo.bind(this, this.mediaUpdate, mediaControl), 200);
			}
		} else if(this._timer) {
			window.clearInterval(this._timer);
			this._timer = null;
		}
	},

	playVideoClicked: function() {
		this.$.videoPlayer.call({
            id:	"com.palm.app.videoplayer",
            params: {
                target: this.story.video
            }
        }, {});
	},

    //
    // Scroll handling
    //

    scrollingStarted: function() {
        this._scrolling = true;
    },

    scrollingStopped: function() {
        this._scrolling = false;
    },

	//
	// Toolbar handling
	//

	storyStarred: function() {
		this.story.isStarred = this.$.starButton.getChecked();
		enyo.application.feeds.markStarred(this.story);
	},

	shareClicked: function(sender, event) {
		this.$.shareMenu.openAtEvent(event);
	},

	//
	// Sharing
	//

	shareViaEmail: function(sender, event) {
		text = this.story.summary + "<br><br>";
		for(i = 0; i < this.urls.length; i++) {
			text += (i > 0 ? "<br>" : "") +
					'<a href="' + this.urls[i].href + '">' +
					this.urls[i].title + '</a>';
		}
		enyo.application.openEMail($L("Check out this story"), text);
	},

	shareViaIM: function(sender, email) {
		text = $L("Check out this story") + ": ";
		for(i = 0; i < this.urls.length; i++) {
			text += (i > 0 ? ", " : "") + this.urls[i].href;
		}
		enyo.application.openMessaging(text);
	},

	//
	// Public functions
	//

	refresh: function() {
		this.updateOnly = true;
		this.storyChanged();
	},

	//
	// Initialization
	//

	create: function() {
		this.inherited(arguments);

		this.gotStory = enyo.bind(this, this.gotStory);
		this.noConnection = enyo.bind(this, this.noConnection);

		this.storyChanged();
	},

	destroy: function() {
		this.setMediaTimer(false);
		this.inherited(arguments);
	}
});
