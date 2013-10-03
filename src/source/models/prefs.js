/*
 *		commonjs/prefs.js - preferences defaults and helper functions
 *
 *  This class is used to make the prefs handling between the different versions
 *  more uniform. The functions here are completely framework agnostic.
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

function DefaultPrefs() {
}

DefaultPrefs.prototype = {
    updateInterval:				30,
    storyKeepTime:				24 * 3,
    updateOnStart:				true,
    notificationEnabled:		true,
    notifyWithSound:			false,
    blinkingEnabled:			true,
    notifyWhileRunning:			true,
    unobtrusiveNotifications:	true,
    wakingEnabled:				false,
    titleColor:					"black",
    summaryLength: 				120,
    largeFont: 					false,
    showNewCount:               true,
    showUnreadCount:            true,
    showChanges: 				false,
    leftHanded: 				true,
    enableRotation: 			true,

    rilUser: 					"",	// Read it Later
    rilPassword:				"",

    gReaderUser:				"",	// Google Reader
    gReaderPassword:			""
};

function _copyPrefs(source, target) {
    var defaults = new DefaultPrefs();
    for(key in defaults) {
        var sourceSetting = source[key];
        target[key] = sourceSetting !== undefined ? sourceSetting : defaults[key];
    }
}

function PrefsLoader(source) {
    this.source = source;
}

PrefsLoader.prototype.loadInto = function(target, currentVersion) {
    _copyPrefs(this.source, target);
    if(this.source.version < currentVersion) {
        target.showChanges = true;
        target.save(false);
    }
};

function PrefsSaver(source) {
    this.source = source;
}

PrefsSaver.prototype.saveInto = function(target, currentVersion) {
    _copyPrefs(this.source, target);
    target["version"] = currentVersion;
};
