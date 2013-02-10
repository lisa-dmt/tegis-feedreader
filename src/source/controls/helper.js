/*
 *		source/controls/helper.js - Helper kinds and functions
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

function FakeActivator(node) {
	this.node = node;
}

FakeActivator.prototype = {
	hasNode: function() {
		return this.node;
	}
};

enyo.kind({
	name:		"MenuDecoupler",
	kind:		enyo.Control,

	published:	{
		menu:	""
	},

	events:		{
		onBeforeShowMenu:	""
	},

	handlers:	{
		ontap:		"tapped"
	},

	tapped: function(sender, event) {
		this.doBeforeShowMenu(event);
		this.dispatchToMenu("onRequestShowMenu", {activator: new FakeActivator(event.target)});
		return true;
	},

	dispatchToMenu: function(eventName, event) {
		this.owner.$[this.menu].dispatchEvent(eventName, event, this);
	}
});

enyo.openMenuAtEvent = function(menu, sender, event) {
	enyo.asyncMethod(this, function() {
		menu.dispatchEvent("onRequestShowMenu", {activator: new FakeActivator(event.target)}, sender);
	});
};

enyo.kind({
	name:			"HeaderInfoLabel",
	kind:			"FittableColumns",
	classes:		"story-header-info",

	published:	{
		caption:		"",
		label:			""
	},

	events:		{
		onBackClick:	""
	},

	components:	[{
		name:			"caption",
		classes:		"story-header-label"
	}, {
		name:			"label",
		fit:            true
	}],

	captionChanged: function() {
		this.$.caption.setContent(this.caption);
	},

	labelChanged: function() {
		this.$.label.setContent(this.label);
	},

	create: function() {
		this.inherited(arguments);
		this.captionChanged();
		this.labelChanged();
	}
});

function useTopBackButton() {
	return true; //isFirefox() && !showGrabButtons();
}

function showGrabButtons() {
	return false;// !enyo.Panels.isScreenNarrow();
}

enyo.kind({
	name:		"BackButton",
	kind:		useTopBackButton() ? "enyo.Control" : "onyx.Button",

	classes:	useTopBackButton() ? "header-back-button float-left" : "back-button float-left",
	content:	useTopBackButton() ? "<" : $L("Back"),

	published:	{
		position:		"bottom",
		isOnMainScene:	true
	},

	handlers:	{
		ondown:		"down",
		onleave:	"leave"
	},

	positionChanged: function() {
		if((this.position == "top") == useTopBackButton()) {
			this.show();
		} else {
			this.hide();
		}
	},

	create: function() {
		this.inherited(arguments);
		this.positionChanged();
	},

	down: function(inSender, inEvent) {
		if(this.position == "top")
			this.addClass("pressed");
	},

	leave: function(inSender, inEvent) {
		if(this.position == "top")
			this.removeClass("pressed");
	}
});

enyo.kind({
	name:		"TopSceneControl",
	kind:		"BackButton",
	position:	"top"
});

enyo.kind({
	name:		"BottomMainSceneControl",
	kind:		"BackButton",
	position:	"bottom"
});

enyo.kind({
	name:		"BottomSubSceneControl",
	classes:	"float-left",
	components:	[{
		kind:		showGrabButtons() ? "onyx.Grabber" : "enyo.Control",
		classes:	"float-left"
	}]
});

enyo.kind({
	kind:	"FittableRows",
	name:	"DraggableView",

	handlers: {
		ondragstart: "dragstart"
	},

	dragstart: function(sender, event) {
		// Stop drag event bubbling if the originator is not a Grabber.
		return event.originator.kind != "onyx.Grabber";
	}
});

enyo.kind({
	name:		"FloatBreaker",
	classes:	"float-breaker",
	content:	"&nbsp;",
	allowHtml:	true
});

function additionalSceneWidthStyle() {
	if(enyo.Panels.isScreenNarrow()) {
		return "width: 95%;";
	} else {
		return "width: 640px;";
	}
}

enyo.kind({
	name:		"SwipeItem",
	kind:		onyx.Item,
	classes:	"list-item-swiped",

	events:		{
		onDelete:	"",
		onCancel:	""
	},

	components:	[{
		kind:		onyx.Button,
		classes:	"onyx-negative",
		content:	$L("Delete"),
		ontap:		"deleteTap"
	}, {
		kind:		onyx.Button,
		classes:	"onyx-affirmative",
		content:	$L("Cancel"),
		ontap:		"cancelTap"
	}],

	deleteTap: function() {
		this.doDelete();
	},

	cancelTap: function() {
		this.doCancel();
	}
});
