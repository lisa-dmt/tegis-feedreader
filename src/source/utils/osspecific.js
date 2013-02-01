/*
 *		source/utils/osspecific.js - OS specific functions
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

function applyOSSpecific(to) {
    if(window.PalmSystem) {
        // Palm webOS
        enyo.log("OSSPECIFIC> Detected Palm webOS");
        window.AppHelper = window.PalmAppHelper;
        window.Timer = window.PalmTimer;
        window.ConnectionChecker = window.PalmConnectionChecker;
        window.PowerManager = window.PalmPowerManager;
		window.Database = window.WebSQLDatabase;
        enyo.openDatabase = function() {
            return openDatabase("ext:FeedReader", "", "FeedReader Database");
        }
    } else {
        // Unknown host OS/browser
        enyo.log("OSSPECIFIC> Using generic handlers; platform unkown/unsupported or running in browser");
        window.AppHelper = window.GenericAppHelper;
        window.Timer = window.GenericTimer;
        window.ConnectionChecker = window.GenericConnectionChecker;
        window.PowerManager = window.GenericPowerManager;
		window.Database = window.IndexedDB;
    }

	if(enyo.platform.firefox || enyo.platform.firefoxOS) {
		enyo.log("This is Firefox - patching XHR request machanism");
		enyo.xhr.getXMLHttpRequest = function(inParams) {
			try {
				return new XMLHttpRequest({ mozSystem: true });
			} catch(e) {}
			return null;
		}
	}

    enyo.application.helper = new AppHelper();

    to.openLink = function(url) {
        enyo.application.helper.openLink(url);
    };
    to.openEMail = function(subject, text) {
        enyo.application.helper.openEMail(subject, text);
    };
    to.openMessaging = function(text) {
        enyo.application.helper.openMessaging(text);
    };
    to.openMainView = function() {
        new FeedReaderMainView().renderInto(document.body);
    };
}
