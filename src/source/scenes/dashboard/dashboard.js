/*
 *		source/dashboard/dashboard.js - Dashboard control
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
	name:			"dashboard",
	kind:			"Control",
	classes:		"dashboard-container",

	params:			{
		newCount:	1,
		isUpdate:	false
	},

	components:		[{
		kind:				"SwipeableItem",
		layoutKind: 		"FittableColumnsLayout",
		confirmRequired:	false,
		allowLeft:			false,
		onConfirm: 			"swipedAway",
		ontap:				"itemClicked",
		components:			[{
			classes:		"dashboard-icon-container",
			components: 	[{
				classes:	"dashboard-icon",
				kind:		"Image",
				src:		"../../icon48.png"
			}, {
				name:		"countContainer",
				classes:	"dashboard-count",
				components:	[{
					name: 		"count",
					nodeTag:	"span",
					classes:	"dashboard-count-label",
					content:	"0"
				}]
			}]
		}, {
			kind:		"FittableRows",
			classes:	"dashboard-content-container",
			fit:		true,
			components:	[{
				name:		"title",
				classes:	"dashboard-title",
				content:	enyo.application.appName
			}, {
				name:		"message",
				classes:	"dashboard-text",
				content:	"Empty"
			}]
		}]
	}, {
		kind:					"ApplicationEvents",
		onWindowParamsChange:	"updateDisplay"
	}],

	swipedAway:	function(sender, event) {
		window.close();
	},

	itemClicked: function(sender, event) {
		enyo.application.launcher.openMainView();
		window.close();
	},

	clickHandler: function() {
		this.itemClicked(null, null);
		return true;
	},

	updateDisplay: function() {
        if(!enyo.application.feeds)
            return;

		var oldCount = this.params.newCount;
		this.params = enyo.windowParams;
		if(this.params.isUpdate) {
			this.$.countContainer.hide();
			this.$.title.setContent($L("Updating feeds..."));
			this.$.message.setContent($L("Please do not close"));
			this.updateLEDThrobber(false);
		} else if(this.params.newCount <= 0) {
			this.warn("DASHBOARD> Invalid new count received; closing");
			window.close();
			this.updateLEDThrobber(false);
		} else {
			var msg = enyo.macroize($L("Received {$num} new stories"), { num: this.params.newCount });
			this.$.countContainer.show();
			this.$.title.setContent(enyo.application.appName);
			this.$.message.setContent(msg);
			this.$.count.setContent(this.params.newCount);

			// The Mojo version used a launch parameter here. I currently see
			// no reason to add one, thus we pass empty parameters here.
			if((this.params.newCount != oldCount) && (!enyo.application.prefs.unobtrusiveNotifications)) {
				enyo.windows.addBannerMessage(msg, "{}", undefined, enyo.application.prefs.notifyWithSound ? "alerts" : undefined);
			}
			this.updateLEDThrobber(true);
		}
	},

	updateLEDThrobber: function(activate) {
		// The LED throbber was once called core navi button. I don't know
		// why this has changed, but as Enyo is not as flexible as Mojo
		// concerning standard dashboards and the throbber, we need to
		// enable it by ourselves.
		if(this.throbberID) {
			window.PalmSystem.removeNewContentIndicator(this.throbberID);
			this.throbberID = undefined;
		}
		if(activate && enyo.application.prefs.blinkingEnabled) {
			this.throbberID = window.PalmSystem.addNewContentIndicator();
		}
	}
});
