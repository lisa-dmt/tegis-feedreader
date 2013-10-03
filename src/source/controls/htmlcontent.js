/*
 *		source/control/htmlcontent.js
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
    name:   "HtmlContent",
    kind:   enyo.Control,

    allowHtml: true,

    events: {
        onLinkClick:    ""
    },

    findLink: function(node, ancestor) {
        var run = node;
        while (run && run != ancestor) {
            if (run.href) {
                return run.href;
            }
            run = run.parentNode;
        }
    },

    clickHandler: function(sender, event) {
        var url = this.findLink(event.target, this.hasNode());
        if (url) {
            this.doLinkClick(url, event);
            event.preventDefault();
            return true;
        } else if (event.didDrag) {
            return true;
        } else {
            return this.doClick();
        }
    }
});