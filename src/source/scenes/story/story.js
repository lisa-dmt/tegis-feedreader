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
		feed:			null,
		story:			null,
		updateOnly:		false,
		isLastStory:	null,
		isFirstStory:	null
	},

	events:		{
		onBackClick:	"",
		onNextStory:	"",
		onPrevStory:	""
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
			classes:	"shorten-text header-caption",
			fit:		true
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
					classes:	"dotted-separator"
				}, {
					name:		"caption",
					kind:		HeaderInfoLabel,
					caption:	$L("Caption")
				}]
			}, {
				classes:	    "header-shadow",
				style:			"margin-bottom: 8px"
			}, {
				name: 			"video",
				kind: 			"EnhancedVideo",
				style:			"width: 100%",
				showing:		false,
				onStateChanged:	"mediaStateChanged",
				onProgress:		"mediaProgress",
				onCanPlay:		"mediaCanPlay"
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
				classes:			"silver-separator"
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
				}]
			}]
		}]
	}, {
		name:		"mediaControls",
		showing:	false,
		components:	[{
			name:			"audio",
			kind:			"EnhancedAudio",
			onStateChanged:	"mediaStateChanged",
			onProgress:		"mediaProgress",
			onCanPlay:		"mediaCanPlay"
		}, {
			style:		"margin-top: 10px;",
			kind:	enyo.FittableColumns,
			components: [{
				name:		"mediaSlider",
				kind:		EnhancedSlider,
				fit:		true,
				min:		0,
				max:		1000,
				onChanging:	"mediaSeeking",
				onChange:	"mediaSeeked",
				lockBar:	false
			}]
		}, {
			kind:		enyo.FittableColumns,
			style:		"margin: -3px 5px 3px 5px; font-size: 15px; font-weight: bold;",
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
			name:		"prevStoryButton",
			kind:       onyx.IconButton,
			src:		"assets/header/icon-back.png",
			disabled:	true,
			ontap:		"doPrevStory"
		}, {
			name:		"nextStoryButton",
			kind:       onyx.IconButton,
			src:		"assets/header/icon-forward.png",
			disabled:	true,
			ontap:		"doNextStory"
		}, {
			name:		"shareButton",
			kind:		onyx.IconButton,
			classes:    "float-right",
			src:		"assets/toolbars/icon-share.png",
			ontap:		"shareClicked"
		}, {
			name:		"mediaPlayButton",
			kind:		onyx.IconButton,
			classes:    "float-right",
			src:		"assets/player/enyo-icon-play.png",
			ontap:		"mediaPlayToggled",
			showing:	false
		}]
	}],

	tools:	[{
		name:			"linkMenu",
		kind:			onyx.Menu
	}, {
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
	}],

	//
	// Property handling
	//

	storyChanged: function() {
		if(!this.updateOnly) {
			this.$.loadSpinner.hide();
		}
		if(!this.story) {
			this.$.starButton.setChecked(false);
			this.$.starButton.setDisabled(true);
			this.$.shareButton.setDisabled(true);
			this.$.bgContainer.show();
			this.$.storyContainer.hide();
			this.$.mediaControls.hide();

			this.isLastStory = this.isFirstStory = null;
			this.$.prevStoryButton.setDisabled(true);
			this.$.nextStoryButton.setDisabled(true);

			this.setMediaTimer(false);
			this.$.audio.setSrc("");
			this.$.video.setSrc("");

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

	isLastStoryChanged: function() {
		this.$.nextStoryButton.setDisabled(this.isLastStory);
	},

	isFirstStoryChanged: function() {
		this.$.prevStoryButton.setDisabled(this.isFirstStory);
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
		this.$.date.applyStyle("font-size", enyo.application.prefs.largeFont ? "14px" : "12px");
		this.$.caption.applyStyle("font-size", enyo.application.prefs.largeFont ? "14px" : "12px");
		this.$.content.applyStyle("font-size", enyo.application.prefs.largeFont ? "18px" : "16px");

		this.$.date.setLabel(enyo.application.feeds.getDateFormatter().formatDateTime(this.story.pubdate));
		this.$.caption.setLabel(this.story.title);
		this.$.starButton.setChecked(this.story.isStarred);
		this.$.starButton.setDisabled(false);
		this.$.shareButton.setDisabled(false);

		this.$.contentScroller.scrollTo(0, 0);
		this.$.content.setContent(this.story.summary);

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
		this.$.loadSpinner.hide();

		// Mark the story as being read.
		if(!this.updateOnly && !this.story.isRead) {
			enyo.application.feeds.markStoryRead(this.story);
		}

		// Setup the visible elements.
		this.$.bgContainer.hide();
		this.$.storyContainer.show();
		this.$.linkButton.setDisabled(this.urls.length <= 0);

		this.setupMediaControls();

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
			var hasAudio = this.story.audio.length > 0;
			var hasVideo = this.story.video.length > 0;
			if(hasVideo || hasAudio) {
				this.$.mediaEnd.setContent("99:99");
				this.$.mediaControls.show();
				this.$.mediaPlayButton.show();
				this.$.mediaPlayButton.setDisabled(true);
				this.$.mediaSlider.setValue(0);

				this._mediaKind = hasVideo ? mediaKinds.video : mediaKinds.audio;

				if(hasVideo) {
					this.$.video.show();
					this.$.video.setSrc(this.story.video);
					this.$.audio.setSrc("");
				} else {
					this.$.video.hide();
					this.$.video.setSrc("");
					this.$.audio.setSrc(this.story.audio);
				}
				this.setMediaTimer(true);
			} else {
				this.$.video.hide();
				this.$.mediaControls.hide();
				this.$.mediaPlayButton.hide();
				this._mediaKind = mediaKinds.none;
				this.$.audio.setSrc("");
				this.$.video.setSrc("");
				this.setMediaTimer(false);
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
				return this.$.video;
			default:
				return null;
		}
	},

	mediaSeeking: function() {
		this._mediaSeeking = true;
		var mediaControl = this.getMediaControl();
		var position = mediaControl.getDuration() * this.$.mediaSlider.getValue() / 1000;
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
				sender.setSrc("assets/player/enyo-icon-play.png");
				this.setMediaTimer(false);
			} else {
				mediaControl.play();
				sender.setSrc("assets/player/enyo-icon-pause.png");
				this.setMediaTimer(true);
			}
		});
	},

	mediaStateChanged: function(sender) {
		if(!this.story)
			return;

		try {
			this.$.mediaState.setContent(sender.getReadableState());
			var duration = enyo.application.feeds.getDateFormatter().formatTimeString(Math.min(sender.getDuration(), 480 * 60 + 59));
			this.$.mediaEnd.setContent(duration);
			var mediaControl = this.getMediaControl();
			if(mediaControl && !mediaControl.getPlaying()) {
				this.$.mediaPlayButton.setSrc("assets/player/enyo-icon-play.png");
			}
		} catch(e) {
			this.log("STATE CHANGED EX>", e);
		}
	},

	mediaCanPlay: function(sender) {
		if(!this.story)
			return;

		this.$.mediaPlayButton.setDisabled(false);
	},

	mediaProgress: function(sender) {
		if(!this.story)
			return;

		var buffered = sender.getBuffered();
		var duration = sender.getDuration();

		if(!this._mediaSeeking && buffered && duration) {
			this.$.mediaSlider.animateProgressTo(Math.round(buffered.end(0) * 1000 / duration));
		}
	},

	mediaUpdate: function(sender) {
		if(!this.story)
			return;

		if(!this._mediaSeeking) {
			var duration = sender.getDuration();
			var time = sender.getCurrentTime();

			if(time && duration) {
				var position = time * 1000 / duration;
				this.$.mediaSlider.animateTo(position);
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
		this.$.shareViaIMItem.setShowing(enyo.application.helper.canShareViaIM);
		enyo.openMenuAtEvent(this.$.shareMenu, sender, event);
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

	initComponents: function() {
		this.createChrome(this.tools);
		this.inherited(arguments);
	},

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
