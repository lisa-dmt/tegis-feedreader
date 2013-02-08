/*
 *		source/utils/os/palm.js - Palm webOS specific kinds
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
    name:   "PalmAppHelper",
    kind:   enyo.Component,

    components: [{
        kind: 					"ApplicationEvents",
        onApplicationRelaunch:	"relaunch",
        onUnload:				"cleanup"
    }, {
        name:					"appMgr",
        kind: 					"PalmService",
        service:				"palm://com.palm.applicationManager/",
        method:					"open",
        subscribe:				true
    }],

    openLink: function(url) {
        this.$.appMgr.call({
            target: url
        });
    },

    openEMail: function(subject, text) {
        this.$.appMgr.call({
            id:	"com.palm.app.email",
            params: {
                summary:	subject,
                text:		text
            }
        });
    },

    openMessaging: function(text) {
        this.$.appMgr.call({
            id:	"com.palm.app.messaging",
            params: {
                messageText: text
            }
        });
    },

    openMainView: function(params) {
        this._openCard("mainview", "FeedReaderMainView", params);
    },

    _openCard: function(name, windowName, windowParams) {
        var cardPath = "source/" + name + "/index.html";
        return enyo.windows.activate(cardPath, windowName, windowParams);
    },

	afterScheduledUpdate: function() {
	}
});

enyo.kind({
    name:	"PalmTimer",
    kind:	"Component",

    key:	"com.tegi-stuff.feedreader.timer",

    components:	[{
        name:		"setAlarm",
        kind:		"PalmService",
        service:	"palm://com.palm.power/timeout/",
        onSuccess:	"setTimerSuccess",
        onFailure:	"setTimerFailed"
    }],

    setTimer: function() {
        if(enyo.application.prefs.updateInterval > 0) {
            var hours, minutes, seconds;
            if(enyo.application.prefs.updateInterval >= 1440) {
                hours   = 23;
                minutes = 59;
                seconds = 59;
            } else {
                hours   = parseInt(enyo.application.prefs.updateInterval / 60, 10);
                minutes = enyo.application.prefs.updateInterval % 60;
                seconds = 0;

                if(hours < 10) {
                    hours = "0" + hours;
                }
                if(minutes < 10) {
                    minutes = "0" + minutes;
                }
                if(seconds < 10) {
                    seconds = "0" + seconds;
                }
            }

            this.$.setAlarm.call({
                "key":		this.key,
                "in":		enyo.macroize("{$h}:{$m}:{$s}", {
                    h: hours,
                    m: minutes,
                    s: seconds
                }),
                "wakeup":	enyo.application.prefs.wakingEnabled,
                "uri":		"palm://com.palm.applicationManager/open",
                "params": {
                    "id":	"com.tegi-stuff.app.feedreader",
                    "params": {
                        "action": "feedUpdate"
                    }
                }
            }, {
                method:		"set"
            });
        } else {
            this.$.setAlarm.call({
                "key": this.key
            }, {
                method:		"clear"
            });
        }
    },

    setTimerSuccess: function() {
        this.log("TIMER> successfully set");
    },

    setTimerFailed: function() {
        this.error("TIMER> setting timer failed!");
    }
});

enyo.kind({
    name:	"PalmConnectionChecker",
    kind:   enyo.Component,

    components:	[{
        name:		"connectionService",
        kind:		"PalmService",
        service:	"palm://com.palm.connectionmanager/",
        method:		"getstatus",
        onSuccess:	"getConnStatusSuccess",
        onFailure:	"getConnStatusFailed"
    }],

    /**
     * Check the internet connection status
     *
     * @param onSuccess		{function}	function to be called on success
     * @param onFail		{function}	function to be called on failure
     */
    checkConnection: function(onSuccess, onFail) {
        onFail = onFail || this.defaultOnFail;
        this.$.connectionService.call({}, {
            onSuccessHandler: onSuccess,
            onFailureHandler: onFail
        });
    },

    /** @private
     *
     * Called when the connection status could be retrieved.
     *
     * @param sender		{object}	sender (the service)
     * @param result		{object}	result object
     * @param request		{object}	information about the request
     */
    getConnStatusSuccess: function(sender, result, request) {
        try {
            if(result.isInternetConnectionAvailable) {
                request.onSuccessHandler();
            } else {
                request.onFailureHandler();
            }
        } catch(e) {
            this.error("CONN EXCEPTION>", e);
        }
    },

    /** @private
     *
     * Called when the connection status could not be retrieved.
     *
     * @param sender		{object}	sender (the service)
     * @param result		{object}	result object
     * @param request		{object}	information about the request
     */
    getConnStatusFailed: function(sender, result, request) {
        try {
            this.warn("CONN> Unable to determine connection status");
            request.onFailureHandler();
        } catch(e) {
            this.error("CONN EXCEPTION>", e);
        }
    },

    /** @private
     *
     * Default onFail-Handler.
     */
    defaultOnFail: function() {
    }
});

enyo.kind({
    name:   "PalmPowerManager",
    kind:   enyo.Component,

    key:			"com.tegi-stuff.app.feedreader",

    components:	[{
        name:		"powerService",
        kind:		"PalmService",
        service:	"palm://com.palm.power/com/palm/power/"
    }],

    enterActivity: function(duration) {
        if(duration === undefined) {
            duration = 60000;
        }

        this.$.powerService.call({
            id:				this.key,
            duration_ms: 	duration
        }, {
            method:		"activityStart",
            onSuccess:	"setActivitySuccess",
            onFailure:	"setActivityFailed"
        });
    },

    /** @private
     *
     * Gets called when setting the activity was successful.
     */
    setActivitySuccess: function(response) {
        this.log("POWER> Successfully set activity");
    },

    /** @private
     *
     * Gets called when setting the acitivity failed.
     */
    setActivityFailed: function(response) {
        this.error("POWER> Unable to set activity", response);
    },

    /** @private
     *
     * Tell the system, that we left our activity phase.
     */
    leaveActivity: function() {
        this.$.powerService.call({
            id:			this.key
        }, {
            method: 	"activityEnd",
            onSuccess: 	"leaveActivitySuccess",
            onFailure: 	"leaveActivityFailed"
        });
    },

    /** @private
     *
     * Gets called when setting the activity was successful.
     */
    leaveActivitySuccess: function(response) {
        this.log("POWER> Successfully left activity");
    },

    /** @private
     *
     * Gets called when setting the acitivity failed.
     */
    leaveActivityFailed: function(response) {
        this.error("POWER> Unable to leave activity", response);
    }
});

function applyPalmSpecifics() {
	window.AppHelper = window.PalmAppHelper;
	window.Timer = window.PalmTimer;
	window.ConnectionChecker = window.PalmConnectionChecker;
	window.PowerManager = window.PalmPowerManager;
	window.Database = window.WebSQLDatabase;
	enyo.openDatabase = function() {
		return openDatabase("ext:FeedReader", "", "FeedReader Database");
	}
}