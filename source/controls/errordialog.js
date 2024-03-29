/*
 *		source/controls/errordialog.js
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
	name:			"ErrorDialog",
	kind:			onyx.Popup,
	layoutKind:		enyo.FittableRowsLayout,
	contentHeight:	"95%",
	style:			"width: 400px; height: 400px;",
    modal:          true,
    centered:       true,
    floating:       true,

	published:	{
		message:	"",
		buttonText:	$L("OK")
	},

	components:	[{
		name:			"message",
		classes:		"text-error warning-icon",
		fit:			true
	 }, {
		kind:			onyx.Button,
		name:			"dismissButton",
		ontap:			"dismissClick"
	}],

	dismissClick: function() {
		this.close();
	},

	messageChanged: function() {
		this.$.message.setContent(this.message);
	},

	buttonTextChanged: function() {
		this.$.dismissButton.setCaption(this.buttonText);
	},

	show: function(message, caption, buttonText) {
		this.message = message;
		this.caption = caption || $L("Error");
		this.buttonText = buttonText || this.buttonText;

		this.inherited(arguments);
		this.messageChanged();
		this.buttonTextChanged();
	}
});
