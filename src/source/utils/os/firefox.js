/*
 *		source/utils/os/generic.js - OS dependent functions
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
	name:   	"FirefoxAppHelper",
	kind:   	enyo.Component,

	rendered:	false,

	openLink: function(url) {
		alert("Should open link: " + url);
	},

	openEMail: function(subject, text) {
		alert("Should start email: " + subject);
	},

	openMessaging: function(text) {
		alert("Should open messaging: " + text);
	},

	openMainView: function() {
		if(!this.rendered)
			(new FeedReaderMainView()).renderInto(document.body);
		this.rendered = true;
	},

	afterScheduledUpdate: function() {
		this.log("APPHELPER> Opening mainview after scheduled update");
		this.openMainView();
	}
});

enyo.kind({
	name:   	"FirefoxTimer",
	kind:   	enyo.Component,

	cookieName:	"comtegi-stuffAppFeedReaderAlarms",

	setTimer: function() {
		if(!window.navigator.mozAlarms) {
			this.warn("FXOSTIMER> No mozAlarms available, unable to schedule updates");
			return;
		}

		if(!enyo.windowParams || enyo.windowParams.action != "feedUpdate" ||
			enyo.application.prefs.updateInterval == 0) {
			this.clearTimer();
		}

		if(enyo.application.prefs.updateInterval == 0)
			return;

		var alarmTime = new Date((new Date()).getTime() + enyo.application.prefs.updateInterval * 60000);
		var request = window.navigator.mozAlarms.add(alarmTime, "ignoreTimezone", { action: "feedUpdate" });
		var self = this;
		request.onsuccess = function (event) {
			self.log("FXOSTIMER> alarm scheduled, ID:", event.target.result);
			enyo.setCookie(self.cookieName, enyo.json.stringify({
				id:	event.target.result
			}));
		};
		request.onerror = function (e) { self.error("FXOSTIMER> Failed to setup alarm", e.target.error.name); };
	},

	clearTimer: function() {
		try {
			var cookie = enyo.getCookie(this.cookieName);
			if(!cookie)
				return;
			var alarms = enyo.json.parse(cookie);
			if(alarms.id) {
				navigator.mozAlarms.remove(alarms.id);
				this.log("FXOSTIMER> Unscheduled alarm", alarms.id);
			}
			enyo.setCookie(this.cookieName, "{}");
		} finally {
			this.firstRun = false;
		}
	}
});

enyo.kind({
	name:   "FirefoxConnectionChecker",
	kind:   enyo.Component,

	checkConnection: function(onSuccess, onFail) {
		enyo.asyncMethod(this, onSuccess);
	}
});

enyo.kind({
	name:   "FirefoxPowerManager",
	kind:   enyo.Component,

	enterActivity: function() {
	},

	leaveActivity: function() {
	}
});

function isFirefox() {
	return enyo.platform.firefox || enyo.platform.firefoxOS;
}

function applyFirefoxSpecifics() {
	window.AppHelper = window.FirefoxAppHelper;
	window.Timer = window.FirefoxTimer;
	window.ConnectionChecker = window.FirefoxConnectionChecker;
	window.PowerManager = window.FirefoxPowerManager;
	window.Database = window.IndexedDB;

	if(isFirefox()) {
		enyo.log("This is Firefox - patching XHR request machanism");
		enyo.xhr.getXMLHttpRequest = function(inParams) {
			try {
				return new XMLHttpRequest({ mozSystem: true });
			} catch(e) {}
			return null;
		}
	}

	navigator.mozSetMessageHandler("alarm", function (message) {
		if(enyo.application && enyo.application.feeds) {
			enyo.application.feeds.enqueueUpdateAll();
			enyo.application.timer.setTimer();
		} else {
			enyo.windowParams = { action: "feedUpdate" };
		}
	});
}