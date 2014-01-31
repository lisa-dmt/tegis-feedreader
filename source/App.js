/*
 *		source/launcher.js - Application launcher
 *
 * The classes defined here communicate with the FeedReader SQLite
 * database. It does not contain the migration code used to migrate
 * the older Depot-based database into the current structure.
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
	name:	"FeedReaderAppLauncher",
	kind:	enyo.Component,

	cleanup: function() {
		enyo.application.prefs.save(false);
		enyo.application.spooler.aboutToClose();
	},

	startup: function() {
		enyo.application.helper = new AppHelper();

		// Set global constants.
        applyGlobalConstants(enyo.application);

		enyo.application.assert = enyo.bind(this, this.assert);
		enyo.application.nop = function() {};
		enyo.application.showError = enyo.bind(this, this.showError);
		enyo.application.openLink = enyo.bind(this, this.openLink);
		enyo.application.openEMail = enyo.bind(this, this.openEMail);
		enyo.application.openMessaging = enyo.bind(this, this.openMessaging);

		// Create the necessary helper objects.
		enyo.application.spooler = new Spooler();
		enyo.application.ril = new RILService();
		enyo.application.prefs = new Prefs();
		enyo.application.timer = new Timer();
		enyo.application.connChecker = new ConnectionChecker();

		// Initialize helper objects.
		enyo.application.prefs.load();
		enyo.application.ril.checkCredentials(false);

		// Create the feeds object
		enyo.application.feeds = new Feeds();

		// Create the database
		enyo.application.db = new Database();

		// Launch the application
		enyo.application.launcher.relaunch(this);
	},

	relaunch: function(sender) {
		var params = enyo.windowParams;

		if(params && params.action && (params.action = "feedUpdate")) {
			this.log("LAUNCHER> scheduled feed update triggered");
			if(enyo.application.db.isReady) {
				enyo.application.feeds.enqueueUpdateAll();
			} else {
				enyo.application.feeds.updateWhenReady = true;
			}
			enyo.application.helper.afterScheduledUpdate();
		} else {
			this.openMainView(params);
		}
		enyo.application.timer.setTimer();
		return true;
	},

	//
	// Helper functions
	//

	showError: function(errorMsg, data) {
		if(enyo.application.mainView) {
			enyo.application.mainView.showError(errorMsg, data);
		}
	},

	assert: function(check, msg) {
		if(check) {
			return;
		}
		throw "Assertion failed: " + msg;
	},

	openLink: function(url) {
		enyo.application.helper.openLink(url);
	},

	openEMail: function(subject, text) {
		enyo.application.helper.openEMail(subject, text);
	},

	openMessaging: function(text) {
		enyo.application.helper.openMessaging(text);
	},

	openMainView: function(params) {
		enyo.application.helper.openMainView(params);
	}
});