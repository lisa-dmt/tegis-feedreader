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
	name:		"FirefoxNotificationManager",
	kind:		enyo.Component,

	current:	null,

	show: function(newCount) {
		if(!('mozNotification' in navigator))
			return;
		if(this.current)
			return;

		var body = enyo.macroize($L("Received {$num} new stories"), { num: newCount });
		var self = this;
		var request = navigator.mozApps.getSelf();
		request.onsuccess = function() {
			var app = request.result;
			var iconPath = app.installOrigin + "/icon.png";

			self.current = navigator.mozNotification.createNotification(
				enyo.application.appName, body,	iconPath);
			self.current.onclick = function() {
				app.launch();
				self.current = null;
			};
			self.current.onclose = function() {
				self.current = null;
			}
			self.current.show();
		};
	}
});

enyo.kind({
	name:   			"FirefoxAppHelper",
	kind:   			enyo.Component,

	hasHTMLMail:		false,
	hasEmbeddedVideo:	true,
	canShareViaIM:		true,
	canExtendLifetime:	false,

	rendered:			false,
	activity:			null,

	components:			[{
		kind:				enyo.Signals,
		onNewItemsArrived:	"newItemsArrived"
	}, {
		name:				"notifier",
		kind:				FirefoxNotificationManager
	}],

	create: function() {
		this.inherited(arguments);
		if(enyo.platform.firefoxOS)
			this.activity = window.MozActivity;
		if(!this.activity)
			this.log("APPHELPER> No Acitivity support");
	},

	openLink: function(url) {
		this._runActivity({
			name:	"view",
			data:	{
				type:	"url",
				url:	url
			}
		});
	},

	openEMail: function(subject, text) {
		this._runActivity({
			name:	"new",
			data:	{
				type:	"mail",
				URI:	"mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text)
			}
		});
	},

	openMessaging: function(text) {
		this._runActivity({
			name: "new",
			data: {
				type: "websms/sms",
				body: text
			}
		});
	},

	openMainView: function() {
		if(!this.rendered)
			(new FeedReaderMainView()).renderInto(document.body);
		this.rendered = true;
	},

	afterScheduledUpdate: function() {
		this.log("APPHELPER> Opening mainview after scheduled update");
		this.openMainView();
	},

	newItemsArrived: function(sender, event) {
		this.log("SHOW NEW ITEMS", event.count);
		this.$.notifier.show(event.count);
	},

	_runActivity: function(activity) {
		if(!this.activity)
			return;

		enyo.asyncMethod(this, function() {
			var self = this;
			var act = new this.activity(activity);
			act.onsuccess = function() {
				self.log("Activity launched");
			};
			act.onerror = function() {
				self.warn("Unable to launch activity ", activity.name, "of type", activity.data.type);
			};
		});
	}
});

enyo.kind({
	name:   	"FirefoxTimer",
	kind:   	enyo.Component,

	cookieName:	"comtegi-stuffAppFeedReaderAlarms",

	components:	[{
		kind:	"FirefoxConnectionChecker",
		name:	"connChecker"
	}],

	getCookieData: function() {
		var cookie = enyo.getCookie(this.cookieName);
		if(!cookie)
			return {};
		return enyo.json.parse(cookie);
	},

	setTimer: function() {
		if(!window.navigator.mozAlarms) {
			this.warn("FXOSTIMER> No mozAlarms available, unable to schedule updates");
			return;
		}

		var self = this;
		var haveConnection;
		var errorCount = this.getCookieData().error || 0;
		if(!enyo.windowParams || enyo.windowParams.action != "feedUpdate" ||
			enyo.application.prefs.updateInterval == 0) {
			this.clearTimer();
		}

		if(enyo.application.prefs.updateInterval == 0)
			return;

		function scheduleAlarm(when) {
			var request = window.navigator.mozAlarms.add(when, "ignoreTimezone", { action: "feedUpdate" });
			request.onsuccess = function (event) {
				self.log("FXOSTIMER> alarm scheduled, ID:", event.target.result);
				enyo.setCookie(self.cookieName, enyo.json.stringify({
					id:		event.target.result,
					error:	errorCount
				}));
			};
			request.onerror = function (e) { self.error("FXOSTIMER> Failed to setup alarm", e.target.error.name); };
		}

		var regularScheduleTime = new Date((new Date()).getTime() + enyo.application.prefs.updateInterval * 60000);
		if(enyo._haveConnection === undefined)
			enyo._haveConnection = fxOSHaveConnection();
		if(enyo._haveConnection) {
			errorCount = 0;
			scheduleAlarm(regularScheduleTime);
		} else {
			if(++errorCount >= 3) {
				errorCount = 0;
				scheduleAlarm(regularScheduleTime);
			} else {
				self.log("FXOSTIMER> No connection; scheduling alarm in 10 seconds");
				scheduleAlarm(new Date((new Date()).getTime() + 10000));
			}
		}
	},

	clearTimer: function() {
		var alarms = this.getCookieData();
		if(alarms.id) {
			navigator.mozAlarms.remove(alarms.id);
			this.log("FXOSTIMER> Unscheduled alarm", alarms.id);
		}
		enyo.setCookie(self.cookieName, "{}");
	}
});

function fxOSHaveConnection() {
	var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	if(!connection) {
		enyo.asyncMethod(this, onSuccess);
	} else if(connection.bandwidth > 0) {
		if(connection.bandwidth !== Infinity || navigator.onLine) {
			return true;
		} else {
			return false;
		}
	} else {
		return false;
	}
}

enyo.kind({
	name:   "FirefoxConnectionChecker",
	kind:   enyo.Component,

	checkConnection: function(onSuccess, onFail) {
		if(fxOSHaveConnection()) {
			enyo.asyncMethod(this, onSuccess);
		} else {
			enyo.asyncMethod(this, onFail);
		}
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

enyo.kind({
	name:	"FirefoxApplicationEvents",
	kind:	enyo.Component,

	events:	{
		onWindowActivated:		"",
		onWindowDeactivated:	"",
		onUnload:				""
	},

	create: function() {
		this.inherited(arguments);

		var self = this;
		var fireEvent = function() {
			if(document.hidden) {
				self.doWindowDeactivated();
			} else {
				self.doWindowActivated();
			}
		};
		document.addEventListener("visibilitychange", fireEvent);
		document.addEventListener("unload", function() { self.doUnload(); });
		enyo.asyncMethod(this, fireEvent);
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
	window.ApplicationEvents = window.FirefoxApplicationEvents;

	enyo.xhr.getXMLHttpRequest = function(inParams) {
		try {
			return new XMLHttpRequest({ mozSystem: true });
		} catch(e) {}
		return null;
	}

	if(navigator.mozSetMessageHandler) {
		navigator.mozSetMessageHandler("alarm", function (message) {
			enyo._haveConnection = fxOSHaveConnection();
			if(enyo.application && enyo.application.feeds) {
				enyo.application.feeds.enqueueUpdateAll();
				enyo.application.timer.setTimer();
			} else {
				enyo.windowParams = { action: "feedUpdate" };
			}
		});
	}
}