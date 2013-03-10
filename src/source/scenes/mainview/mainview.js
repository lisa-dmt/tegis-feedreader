/*
 *		source/mainview/mainview.js
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
                kind:				"FeedList",
                name:				"feedList",
				onOpenAppMenu:		"openAppMenu",
                onFeedSelected:		"feedSelected",
                onAddFeed:			"addFeed",
                onEditFeed:			"editFeed"
            }, {
                kind:				"StoryList",
				name:				"storyList",
                onStorySelected:	"storySelected",
				onBackClick:		"backToFeedList"
            }, {
                name:		        "storyView",
                kind:		        "StoryView",
				onBackClick:		"backToStoryList"
            }]
        }, {
            name:				    "preferences",
            kind:				    "Preferences",
            onPrefsSaved:		    "prefsSaved"
        }, {
            name:					"feedImporter",
            kind:					"FeedImporter",
            onBackClick:			"importerClosed"
		}]
	}],

    tools:  [{
        name:					"errorDialog",
        kind:					"ErrorDialog"
    }, {
        name:					"licenseDialog",
        kind:					"LicenseDialog"
    }, {
        name:					"helpDialog",
        kind:					"HelpDialog"
    }, {
        name:					"editFeedDialog",
        kind:					"EditFeedDialog",
        onFeedSaved:			"feedSaved"
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

	feedSelected: function(sender, feed) {
		enyo.asyncMethod(this, function() {
			var selectedFeed = this.$.storyList.getFeed();
			if(selectedFeed && feed && (selectedFeed.id == feed.id)) {
				this.$.storyList.setUpdateOnly(true);
			} else {
				this.$.storyView.setStory(null);
			}

			this.$.storyList.setFeed(feed);
			this.$.storyView.setFeed(feed);

			if(enyo.Panels.isScreenNarrow()) {
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

	storySelected: function(sender, story) {
		enyo.asyncMethod(this, function() {
			var selectedStory = this.$.storyView.getStory();
			if(selectedStory && story && (selectedStory.id == story.id)) {
				this.$.storyView.setUpdateOnly(true);
			}

			this.$.storyView.setStory(story);

			if(enyo.Panels.isScreenNarrow()) {
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
	// Edit feed events
	//

	feedSaved: function() {
		this.$.storyView.refresh();
	},

	//
	// Prefs events
	//

	prefsSaved: function() {
		enyo.asyncMethod(this, function() {
			this.$.feedList.refresh();
			this.$.storyList.refresh();
			this.$.storyView.refresh();
			this.$.outerPane.setIndex(0);
		});
	},

	//
	// Importer events
	//

	importerClosed: function() {
		enyo.asyncMethod(this, function() {
			this.$.feedList.refresh();
			this.$.storyList.refresh();
			this.$.storyView.refresh();
			this.$.outerPane.setIndex(0);
		});
	},

	//
	// Application events
	//

	windowActivated: function() {
		this.log("WINDOW ACTIVATED");
		enyo.application.mainView = this;
		enyo.application.isActive = true;

		if(enyo.application.db.isReady) {
			this.dbReady();
		}
	},

	windowDeActivated: function() {
		this.log("WINDOW DE-ACTIVATED");
		enyo.application.isActive = false;
	},

	unloaded: function() {
		this.log("CLOSING");
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
