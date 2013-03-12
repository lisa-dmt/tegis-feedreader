/*
 *		source/controls/activitybutton.js
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
    name:       "ActivityButton",
    kind:       onyx.Button,

    published:  {
        caption:    "",
        active:     false
    },

    components: [{
        name:       "spinner",
        kind:       onyx.Spinner,
        classes:    "onyx-light small",
		style:		"margin-right: 5px; margin-left: -10px;",
        showing:    false
    }, {
        name:       "label"
    }],

    contentChanged: function() {
        this.$.label.setContent(this.content);
    },

    activeChanged: function() {
        if(this.active) {
            this.$.spinner.show();
            this.$.spinner.start();
        } else {
            this.$.spinner.stop();
            this.$.spinner.hide();
        }
    },

	create: function() {
		this.inherited(arguments);
		this.contentChanged();
	}
});
