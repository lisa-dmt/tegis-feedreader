/*
 *		commonjs/helper.js - common helper functions
 *
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

function PrependHyperLinks(node, scope, handler) {
    if(!node) {
        return;
    }

    try {
        if((node.nodeName == 'A') && node.href && (!node.href.match(/javascript.*/))) {
            node.onclick = enyo.bind(scope, handler, node.href);
            node.href = 'javascript:void(0)';
        }

        for(var i = 0; i < node.childNodes.length; i++) {
            PrependHyperLinks(node.childNodes[i], scope, handler);
        }
    } catch(e) {
        LogException(e);
    }
}
