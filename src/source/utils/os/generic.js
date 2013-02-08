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
    name:		"GenericAppHelper",
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
		this.openMainView();
	}
});

enyo.kind({
    name:   "GenericTimer",
    kind:   enyo.Component,

    setTimer: function() {
    }
});

enyo.kind({
    name:   "GenericConnectionChecker",
    kind:   enyo.Component,

    checkConnection: function(onSuccess, onFail) {
        enyo.asyncMethod(this, onSuccess);
    }
});

enyo.kind({
    name:   "GenericPowerManager",
    kind:   enyo.Component,

    enterActivity: function() {
    },

    leaveActivity: function() {
    }
});

function applyGenericHandlers() {
	// Unknown host OS/browser
	enyo.log("OSSPECIFIC> Using generic handlers; platform unkown/unsupported or running in browser");
	window.AppHelper = window.GenericAppHelper;
	window.Timer = window.GenericTimer;
	window.ConnectionChecker = window.GenericConnectionChecker;
	window.PowerManager = window.GenericPowerManager;
	window.Database = window.IndexedDB;
}