/*
 *		source/controls/selectoritem.js
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
	name:		    "SelectorItem",
    classes:        "selector-item",

    updating:       0,

	components:	[{
		name:		"caption",
		classes:	"caption float-left"
	}, {
        kind:       onyx.PickerDecorator,
		name:		"pickerDecorator",
		classes:	"float-right",
		onChange:	"pickerChanged",
        components: [{
			name:			"pickerButton"
		}, {
            kind:       	onyx.FlyweightPicker,
            name:			"selector",
			onSetupItem:	"setupItem",
			components:		[{
				name:		"itemCaption"
			}]
        }]
	}, {
		kind:	"FloatBreaker"
	}],

	events:		{
		onChange:   ""
	},

	published:	{
		caption:	"",
		items:		[],
		value:		0
	},

	captionChanged: function() {
		this.updating++;
		this.$.caption.setContent(this.caption);
		this.updating--;
        return true;
	},

	pickerChanged: function(sender, event) {
		if(event.index !== undefined) {
			this.value = this.items[event.index].value;
			if(!this.updating)
				this.doChange();
		}
		return true;
	},

	setupItem: function(sender, event) {
		if(event.index === null)
			return;
		this.$.itemCaption.setContent(this.items[event.index].caption);
	},

	itemsChanged: function() {
		this.updating++;
		this.$.selector.setCount(this.items.length);
		if(this.items && this.items.length > 0)
			this.setValue(this.items[0].value);
		this.updating--;
	},

	getValue: function() {
		return this.value;
	},

	setValue: function(value) {
		this.updating++;
		var index = 0;
		for(var i = 0; i < this.items.length; i++) {
			if(this.items[i].value == value) {
				index = i;
				break;
			}
		}
		this.value = value;
		this.$.selector.setSelected(index);
		this.$.pickerButton.setContent(this.items[index].caption);
		this.updating--;
	},

	render: function() {
		this.resized();
		this.inherited(arguments);
	},

	create: function() {
		this.inherited(arguments);

		this.captionChanged();
		this.itemsChanged();
		this.setValue(this.value);
	}
});
