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
    name:   	"HtmlContent",
    kind:   	enyo.Control,
	classes:	"html-content",

    allowHtml:  true,

    events: {
        onLinkClick:    ""
    },

    findLink: function(node, ancestor) {
        var run = node;
        while (run && run != ancestor) {
            if(run.tagName == 'A' || run.tagName == 'a') {
                return run["data-href"];
            }
            run = run.parentNode;
        }
        return null;
    },

    clickHandler: function(event) {
        event.preventDefault();
        event.stopPropagation();

        var url = this.findLink(event.target, this.node);
        if (url) {
            this.doLinkClick({ url: url });
        }

		return true;
    },

	rendered: function() {
		this.inherited(arguments);

		this.hasNode();
		this.applyClickHandler();
	},

	applyClickHandler: function(node) {
		node = node || this.node;
		if(node.tagName == 'A' || node.tagName == 'a') {
			node.onclick = this.clickHandler;
            node["data-href"] = node.href;
            node.href = "javascript:void(0)";
			return;
		}
		for(var i = 0; i < node.childNodes.length; i++)
			this.applyClickHandler(node.childNodes[i]);
	},

	setContent: function(data) {
		this.inherited(arguments);
        this._links = [];
		if(this.hasNode())
			this.applyClickHandler();
	},

	create: function() {
		this.inherited(arguments);
		this.clickHandler = enyo.bind(this, this.clickHandler);
	}
});
