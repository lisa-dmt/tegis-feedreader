/*
 *		source/controls/modaldialog.js
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

function getDialogStyle() {
	var maxHeight = "max-height: " + Math.ceil(window.innerHeight * 0.9) + "px;"
	var minHeight = "min-height: " + Math.ceil(Math.min(window.innerHeight * 0.8, 800, maxHeight)) + "px;";
	var maxWidth = "max-width: " + (window.innerWidth > 500 ? 500 : Math.ceil(window.innerWidth * 0.9)) + "px;";
	var color = "color: black;"

	return maxHeight + " " + minHeight + " " + maxWidth + " " + color;
}

enyo.kind({
    name:           "ModalDialog",
    kind:           onyx.Popup,
	layoutKind:		enyo.FittableRowsLayout,
	classes:		"modal-dialog",
    modal:          true,
    centered:       true,
    floating:       true,
    autoDismiss:    false,
	scrim:			true,
	scrimClassName:	"onyx-scrim-translucent",
	style:			getDialogStyle(),

    published:      {
        caption:    ""
    },

    tools: [{
        name:       "header",
        classes:    "dialog-header"
    }],

    initComponents: function() {
        this.createChrome(this.tools);
        this.inherited(arguments);
    },

    captionChanged: function() {
        this.$.header.setContent(this.caption);
    },

    create: function() {
        this.inherited(arguments);
        this.captionChanged();
    }
});