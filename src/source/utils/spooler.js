/*
 *		source/utils/spooler.js - activity spooler
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
	name:			"Spooler",
	kind:			"Component",

	list: 			[],
	actionRunning:	false,
	actionIdent:	"",
	updateCounter:	0,

	/**
	 * Enter update state. This will prevent the spooler from starting an
	 * activity until the update state is left.
	 */
	beginUpdate: function() {
		this.updateCounter++;
	},

	/**
	 * Leave update state. If actions were added while being in update state
	 * the spooler will start the first action from the list.
	 */
	endUpdate: function() {
		this.updateCounter--;
		if(!this.actionRunning && (this.list.length >= 1)) {
			this.nextAction();
		}
	},

	/**
	 * Add an action to the spooler list.
	 *
	 * @param	action		{Function}		function to execute
	 * @param	identifier	{String}		name of the action
	 * @param	unique		{Boolean}		if true, only one action with the
	 * 										given name is allowed to be executed
	 * 										at any time
	 */
	addAction: function(action, identifier, unique) {
		try {
			this.log("SPOOLER> Action action", identifier);
			if(!identifier) {
				identifier = "anon-action";
			}

			if(unique) {
				if(this.actionIdent == identifier) {
					return;
				} else {
					for(var i = 0; i < this.list.length; i++) {
						if(this.list[i].ident == identifier) {
							return;
						}
					}
				}
			}

			this.list.push({
				execute: action,
				ident: identifier
			});

			if((this.updateCounter === 0) && (this.list.length == 1) && !this.actionRunning)  {
				this.nextAction();
			}
		} catch(e) {
			this.error(e);
		}
	},

	/** @private
	 *
	 * Tell the system, that we enter a phase of activity.
	 */
	enterActivity: function(duration) {
		enyo.Signals.send("onSpoolerBeginActivity")
	},

	/** @private
	 *
	 * Tell the system, that we left our activity phase.
	 */
	leaveActivity: function() {
		enyo.Signals.send("onSpoolerEndActivity");
	},

	/**
	 * Called to indicate a spooled action has finished. The next spooled
	 * activity will be started if any.
	 */
	nextAction: function() {
		try {
			if(this.list.length >= 1) {
				if(!this.actionRunning) {
					enyo.Signals.send("onSpoolerRunningChanged", { state: true });
				}
				var action = this.list.shift();
				this.actionRunning = true;
				this.actionIdent = action.ident;
				this.enterActivity();
                action.execute();
			} else {
				if(this.actionRunning) {
					enyo.Signals.send("onSpoolerRunningChanged", { state: false });
				}
				this.actionRunning = false;
				this.actionIdent = "";
				enyo.application.feeds.interactiveUpdate = false;
				this.leaveActivity();
			}
		} catch(e) {
			this.error(e);
		}
	},

	hasWork: function() {
		return ((this.list.length > 0) ||
				(this.actionRunning) ||
				(this.updateCounter > 0));
	},

	/**
	 * Called to indicate that the app is about to be closed.
	 */
	aboutToClose: function() {
		try {
			if(this.hasWork() && enyo.application.helper.canExtendLifetime) {
				this.log("SPOOLER> trying to extend app lifetime");
				enyo.application.helper.extendAppLifeTime();
			}
		} catch(e) {
			this.error(e);
		}
	}
});
