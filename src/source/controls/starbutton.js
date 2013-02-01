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
	name:		"StarButton",
	kind:		"onyx.IconButton",

    src:	    "assets/lists/star-icon.png",

	published:	{
		checked:	false
	},

	events:		{
		onChange:	""
	},

	handlers:	{
		ontap:	"tapped"
	},

	checkedChanged: function() {
		var image = "assets/lists/" + (this.checked ? "starred-icon.png" : "star-icon.png");
		this.setSrc(image);
	},

	tapped: function(sender, event) {
		// Prevent any further handling. As a result, no
		// 'onclick'/'ontap' event will be triggered. Instead, we
		// fire the custom 'onChange' event here.
		if(!this.disabled) {
			this.setChecked(!this.checked);
			this.doChange(event);
		}
		return true;
	},

	create: function() {
		this.inherited(arguments);
		this.checkedChanged();
	}
});
