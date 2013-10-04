/*
 *		source/logic/prefs.js - preferences data model
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
	name:						"Prefs",
	kind:						"Component",

	cookieName:					"comtegi-stuffAppFeedReaderPrefs",
	timer: 						null,

	constructor: function() {
		this.cookie = enyo.getCookie(this.cookieName);
	},

	load: function() {
        var settings = {};
		if(this.cookie) {
			settings = enyo.json.parse(this.cookie);
		}
        var loader = new PrefsLoader(settings, enyo.application.versionInt);
        loader.loadInto(this);
	},

	save: function(showCredentialsWarning) {
        var settings = {};
        var saver = new PrefsSaver(this, enyo.application.versionInt);
        saver.saveInto(settings);
		enyo.setCookie(this.cookieName, enyo.json.stringify(settings));
		enyo.application.timer.setTimer();
		enyo.application.ril.checkCredentials(showCredentialsWarning);
	},

	getCSSTitleColor: function() {
		switch(this.titleColor) {
			case "purple":
				return "#800080";

			default:
				return this.titleColor || "black";
		}
	}
});
