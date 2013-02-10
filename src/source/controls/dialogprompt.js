/*
 *		source/controls/dialogprompt.js
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
    name:   	"DialogPrompt",
    kind:   	"ModalDialog",

    published:  {
		message:				"",
        acceptButtonCaption:    "",
        cancelButtonCaption:    ""
    },

    events: {
        onAccept:   "",
        onCancel:   ""
    },

    components: [{
		name:	"message"
    }, {
		kind:       enyo.FittableColumns,
		classes:	"center-text",
		style:		"padding-top: 8px; padding-bottom: 20px",
		components:	[{
			name:		"acceptButton",
			kind:		"onyx.Button",
			classes:	"onyx-affirmative",
			ontap:		"accepted"
		}, {
		}, {
			name:		"cancelButton",
			kind:		"onyx.Button",
			classes:	"onyx-negative",
			ontap:		"canceled"
		}]
	}],

	messageChanged: function() {
		this.$.message.setContent(this.message);
	},

	acceptButtonCaptionChanged: function() {
		this.$.acceptButton.setContent(this.acceptButtonCaption);
	},

	cancelButtonCaptionChanged: function() {
		this.$.cancelButton.setContent(this.cancelButtonCaption);
	},

	accepted: function() {
		this.doAccept();
		this.hide();
	},

	canceled: function() {
		this.doCancel();
		this.hide();
	},

	create: function() {
		this.inherited(arguments);
		this.messageChanged();
		this.acceptButtonCaptionChanged();
		this.cancelButtonCaptionChanged();
	}
});