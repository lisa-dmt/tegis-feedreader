/*
 *		source/controls/popupmenu.js
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
	name:	"PopupMenu",
	kind:	onyx.Menu,

	scrolling:	false,
	floating:	true,

	// Modified version of original adjustPosition. Only works for floating menus, so beware.
	// It handles situations where the menu should be display above of its activator, but
	// without having enough space to do so.
	adjustPosition: function() {
		if (!(this.showing && this.hasNode()))
			return;

		this.removeClass("onyx-menu-up");

		var b = this.node.getBoundingClientRect();
		var bHeight = (b.height === undefined) ? (b.bottom - b.top) : b.height;
		var innerHeight = (window.innerHeight === undefined) ? document.documentElement.clientHeight : window.innerHeight;
		var innerWidth = (window.innerWidth === undefined) ? document.documentElement.clientWidth : window.innerWidth;

		//position the menu above the activator if it's getting cut off, but only if there's more room above than below
		this.menuUp = (b.top + bHeight > innerHeight) && ((innerHeight - b.bottom) < (b.top - bHeight));
		this.moveMenuToTop = this.menuUp;// && (r.top - bHeight + (this.showOnTop ? r.height : 0) < 0);
		this.addRemoveClass("onyx-menu-up", this.menuUp);

		var r = this.activatorOffset;
		//if the menu doesn't fit below the activator, move it up
		if(this.moveMenuToTop) {
			this.applyPosition({top: 0, bottom: "auto"});
		} else if (this.menuUp) {
			this.applyPosition({top: (r.top - bHeight + (this.showOnTop ? r.height : 0)), bottom: "auto"});
		} else {
			//if the top of the menu is above the top of the activator and there's room to move it down, do so
			if ((b.top < r.top) && (r.top + (this.showOnTop ? 0 : r.height) + bHeight < innerHeight)) {
				this.applyPosition({top: r.top + (this.showOnTop ? 0 : r.height), bottom: "auto"});
			}
		}

		//adjust the horizontal positioning to keep the menu from being cut off on the right
		if ((b.right) > innerWidth) {
			this.applyPosition({left: innerWidth - b.width});
		}

		//finally prevent the menu from being cut off on the left
		if (b.left < 0) {
			this.applyPosition({left: 0, right: "auto"});
		}
	}
});