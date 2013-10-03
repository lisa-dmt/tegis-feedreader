/*
 *		source/controls/starbutton.js
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
	name:		"ListStarButton",
	kind:		onyx.IconButton,

	src:	    "assets/lists/star-icon.png",

	handlers:	{
		ontap:	"tapped"
	},

	events:		{
		onChange:	""
	},

	updateState: function(checked) {
		var image = "assets/lists/" + (checked ? "starred-icon.png" : "star-icon.png");
		this.setSrc(image);
	},

	tapped: function(sender, event) {
		if(!this.disabled) {
			this.toggled();
			this.doChange(event);
		}
		return true;
	},

	toggled: function() {
	}
});

enyo.kind({
	name:		"StarButton",
	kind:		ListStarButton,
	classes:	"star-button",

	published:	{
		checked:	false
	},

	toggled: function() {
		this.setChecked(!this.checked);
		this.updateState(this.checked);
	},

	checkedChanged: function() {
		this.updateState(this.checked);
	},

	create: function() {
		this.inherited(arguments);
		this.updateState(this.checked);
	}
});
