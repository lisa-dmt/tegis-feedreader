/*
 *		source/mainview/mainview.js
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
	name:		    "FeedReaderMainView",
    kind:           enyo.FittableRows,

    components:     [{
		name:			"outerPane",
        kind:		    enyo.Panels,
        classes:        "back-color",
        fit:            true,
		draggable:		false,
        components:     [{
            name:           	"mainPane",
            kind:		    	enyo.Panels,
            classes:        	"panel-slider",
            arrangerKind:   	"CollapsingArranger",
            wrap:           	false,
			onTransitionFinish:	"mainTransitionFinished",

            components:	[{
				name:				"feedList",
                kind:				FeedList,
				onOpenAppMenu:		"openAppMenu",
                onFeedSelected:		"feedSelected",
                onAddFeed:			"addFeed",
                onEditFeed:			"editFeed"
            }, {
				name:				"storyList",
				kind:				StoryList,
                onStorySelected:	"storySelected",
				onBackClick:		"backToFeedList",
				onNextFeed:			"selectNextFeed",
				onPrevFeed:			"selectPrevFeed"
            }, {
                name:		        "storyView",
                kind:		        StoryView,
				onBackClick:		"backToStoryList",
				onNextStory:		"selectNextStory",
				onPrevStory:		"selectPrevStory"
            }]
        }, {
            name:				    "preferences",
            kind:				    Preferences,
            onPrefsSaved:		    "prefsSaved"
        }, {
            name:					"feedImporter",
            kind:					FeedImporter,
            onBackClick:			"importerClosed"
		}]
	}],

    tools:  [{
        name:					"errorDialog",
        kind:					ErrorDialog
    }, {
        name:					"licenseDialog",
        kind:					LicenseDialog
    }, {
        name:					"helpDialog",
        kind:					HelpDialog
    }, {
        name:					"editFeedDialog",
        kind:					EditFeedDialog
    }, {
        kind:                   enyo.Signals,
        onDbReady:              "dbReady"
    }, {
		name:					"applicationEvents",
		kind:					"ApplicationEvents",

		onWindowActivated:		"windowActivated",
		onWindowDeactivated:	"windowDeActivated",
		onUnload:				"unloaded"
    }, {
		name:					"mainMenu",
		kind:					PopupMenu,
		components:				[{
			content:			$L("License"),
			ontap:				"openLicense"
		}, {
			content:			$L("Discover feeds"),
			ontap:				"openImporter"
		}, {
			content:			$L("Preferences"),
			ontap:				"openPrefs"
		}, {
			content:			$L("Help"),
			ontap:				"openHelp"
		}]
	}],

	//
	// Transition handling
	//

	mainTransitionFinished: function(sender, event) {
		switch(event.toIndex) {
			case 0:	this.$.feedList.resized(); break;
			case 1: this.$.storyList.resized(); break;
			case 2:	this.$.storyView.resized(); break;
		}
	},

	//
	// FeedList events
	//

	openAppMenu: function(sender, event) {
		enyo.openMenuAtEvent(this.$.mainMenu, this, event);
	},

	feedSelected: function(sender, event) {
		enyo.asyncMethod(this, function() {
			var feed = event.item;
			var selectedFeed = this.$.storyList.getFeed();
			if(selectedFeed && feed && (selectedFeed.id == feed.id)) {
				this.$.storyList.setUpdateOnly(true);
			} else {
				this.$.storyView.setStory(null);
			}

			this.$.storyList.setIsLastFeed(event.isLast);
			this.$.storyList.setIsFirstFeed(event.isFirst);
			this.$.storyList.setFeed(feed);
			this.$.storyView.setFeed(feed);

			if(enyo.Panels.isScreenNarrow() && (this.$.mainPane.getIndex() < 1) && feed) {
				enyo.asyncMethod(this, function() {
					this.$.mainPane.setIndex(1);
				});
			}
		});
	},

	addFeed: function(sender) {
		enyo.asyncMethod(this, function() {
			this.$.editFeedDialog.show(null);
		});
	},

	editFeed: function(sender, feed) {
		enyo.asyncMethod(this, function() {
			this.$.editFeedDialog.show(feed);
		});
	},

	//
	// StoryList events
	//

	storySelected: function(sender, event) {
		enyo.asyncMethod(this, function() {
			var story = event.item;
			var selectedStory = this.$.storyView.getStory();
			if(selectedStory && story && (selectedStory.id == story.id)) {
				this.$.storyView.setUpdateOnly(true);
			}

			this.$.storyView.setIsLastStory(event.isLast);
			this.$.storyView.setIsFirstStory(event.isFirst);
			this.$.storyView.setStory(story);

			if(enyo.Panels.isScreenNarrow() && (this.$.mainPane.getIndex() < 2) && story) {
				enyo.asyncMethod(this, function() {
					this.$.mainPane.setIndex(2);
				});
			}
		});
	},

	//
	// Back button handling
	//

	backToFeedList: function() {
		enyo.asyncMethod(this, function() {
			this.$.mainPane.setIndex(0);
		});
	},

	backToStoryList: function() {
		enyo.asyncMethod(this, function() {
			this.$.mainPane.setIndex(1);
		});
	},

	//
	// Previous & next story|feed handing
	//

	selectNextFeed: function() {
		this.$.feedList.selectNext();
	},

	selectPrevFeed: function() {
		this.$.feedList.selectPrev();
	},

	selectNextStory: function() {
		this.$.storyList.selectNext();

	},

	selectPrevStory: function() {
		this.$.storyList.selectPrev();
	},

	//
	// App menu events
	//

	openPrefs: function() {
		enyo.asyncMethod(this, function() {
			this.$.preferences.reInitialize();
			this.$.outerPane.setIndex(1);
		});
	},

	openImporter: function() {
		enyo.asyncMethod(this, function() {
			this.$.feedImporter.reInitialize();
			this.$.outerPane.setIndex(2);
		});
	},

	openHelp: function() {
		enyo.asyncMethod(this, function() {
			this.$.helpDialog.show();
		});
	},

	openLicense: function() {
		enyo.asyncMethod(this, function() {
			this.$.licenseDialog.show();
		});
	},

	//
	// Prefs events
	//

	prefsSaved: function() {
		this.fullRefresh();
	},

	//
	// Importer events
	//

	importerClosed: function() {
		this.fullRefresh();
	},

	//
	// Application events
	//

	windowActivated: function() {
		var firstActivation = enyo.application.mainView === undefined;

		enyo.application.mainView = this;
		enyo.application.isActive = true;

		if(firstActivation && enyo.application.db.isReady) {
			this.dbReady();
		}
	},

	windowDeActivated: function() {
		enyo.application.isActive = false;
	},

	unloaded: function() {
		enyo.application.spooler.aboutToClose();
		enyo.application.mainView = undefined;
	},

	//
	// Notifications
	//

	dbReady: function() {
		this.$.feedList.refresh();
	},

	showError: function(errorMsg, data) {
		var msg = errorMsg;
		if(data !== undefined) {
			msg = enyo.macroize(msg, data);
		}

		enyo.asyncMethod(this, function() {
			this.$.errorDialog.show(msg);
		});
	},

	//
	// Helper functions
	//

	fullRefresh: function() {
		enyo.asyncMethod(this, function() {
			this.$.feedList.setUpdateOnly(true);
			this.$.feedList.refresh();

			this.$.storyList.setUpdateOnly(true);
			this.$.storyList.refresh();

			this.$.storyView.setUpdateOnly(true);
			this.$.storyView.refresh();

			if(enyo.Panels.isScreenNarrow() && (this.$.mainPane.getIndex() > 0)) {
				this.$.mainPane.setIndex(0);
			}
			this.$.outerPane.setIndex(0);
		});
	},

	//
	// Initialization
	//

	rendered: function() {
		this.resized();
		this.inherited(arguments);
	},

    initComponents: function() {
        this.createChrome(this.tools);
        this.inherited(arguments);
    },

	create: function() {
		this.inherited(arguments);
		enyo.application.isActive = true;
	}
});
