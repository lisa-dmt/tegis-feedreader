/*
 *		source/controls/helper.js - Helper kinds and functions
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
		enyo.asyncMethod(this, function() {
			this.doBeforeShowMenu(event);
			this.dispatchToMenu("onRequestShowMenu", {activator: new FakeActivator(event.target)});
		});
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
	kind:			enyo.FittableColumns,
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
		classes:		"story-header-label-text",
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

function showGrabButtons() {
	return !enyo.Panels.isScreenNarrow();
}

enyo.kind({
	name:		"BackButton",
	kind:		"enyo.Control",

	classes:    "header-back-button float-left",

	published:	{
		isOnMainScene:	true
	},

	handlers:	{
		ondown:		"down",
		onleave:	"leave"
	},

	create: function() {
		this.inherited(arguments);
		this.isOnMainSceneChanged();
	},

	down: function(inSender, inEvent) {
		if(this.position == "top")
			this.addClass("pressed");
	},

	leave: function(inSender, inEvent) {
		if(this.position == "top")
			this.removeClass("pressed");
	},

    isOnMainSceneChanged: function() {
        if(this.isOnMainScene) {
            if(showGrabButtons()) {
                this.hide();
            } else {
                this.show();
            }
        }
    }
});

enyo.kind({
	name:	"DraggableView",
	kind:	enyo.FittableRows,

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
		classes:	"inner",
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
		}]
	}],

	deleteTap: function() {
		this.doDelete();
		return true;
	},

	cancelTap: function() {
		this.doCancel();
		return true;
	}
});

enyo.kind({
	name:	"ToggleIconButton",
	kind:	onyx.Icon,
	classes: "onyx-icon-button",

	published:	{
		pressed:	false
	},

	create: function() {
		this.handlers.ondown = "down";
		this.inherited(arguments);
	},

	down: function(inSender, inEvent) {
		this.setPressed(!this.pressed);
	},

	leave: function(inSender, inEvent) {
	},

	pressedChanged: function() {
		if(this.pressed) {
			this.addClass("pressed");
		} else {
			this.removeClass("pressed");
		}
	}
});

enyo.kind({
	name:		"SearchInput",
	kind: 		onyx.InputDecorator,
	showing:	false,
	fit:		true,
	tag:		"div",

	published: 	{
		value:			"",
		placeholder: 	$L("Search...")
	},

	events:		{
		onChange: "",
		onCancel: ""
	},

	timer:		null,

	layoutKind:	enyo.FittableColumnsLayout,
	components: [{
		kind:       onyx.Input,
		name:		"searchInput",
		fit:		true,
		oninput:	"termChanged"
	}, {
		kind: 		enyo.Image,
		name:		"searchIcon",
		src: 		"assets/search-input-search.png",
		ontap:		"searchCanceled"
	}],

	termChanged: function() {
		this.updateState();
		if(this.timer)
			window.clearTimeout(this.timer);
		this.timer = window.setTimeout(this.emitChange, 350);
	},

	emitChange: function() {
		this.timer = null;
		this.doChange();
	},

	updateState: function() {
		var newValue = this.$.searchInput.getValue();
		if(((newValue == "") && (this.value != "")) || ((newValue != "") && (this.value == "")))
			this.$.searchIcon.setSrc(this.getIconFor(newValue));
		this.value = newValue;
	},

	searchCanceled: function(sender, event) {
		this.$.searchInput.setValue("");
		this.updateState();
		this.doCancel();
	},

	valueChanged: function() {
		this.$.searchInput.setValue(this.value);
		this.$.searchIcon.setSrc(this.getIconFor(this.value));
	},

	getIconFor: function(term) {
		return term == ""
			? "assets/search-input-search.png"
			: "assets/search-input-cancel.png";
	},

	placeholderChanged: function() {
		this.$.searchInput.setPlaceholder(this.placeholder);
	},

	focus: function() {
		this.$.searchInput.focus();
	},

	blur: function() {
		if(this.$.searchInput.hasNode())
			this.$.searchInput.node.blur();
	},

	create: function() {
		this.inherited(arguments);
		this.emitChange = enyo.bind(this, this.emitChange);
		this.valueChanged();
		this.placeholderChanged();
	}
});

enyo.kind({
	name:	"EnhancedSlider",
	kind:	onyx.Slider,

	dragfinish: function(inSender, inEvent) {
		this.dragging = false;
		if(inEvent.ignoreTap)
			inEvent.ignoreTap();
		this.doChange({value: this.value});
		return true;
	}
});