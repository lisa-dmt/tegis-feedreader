/*
 *		commonjs/feed.js - Feed data model
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

/**
 * This enumeration contains all feed types used by FeedReader.
 * To check for a non-special feed, check the feedType member of
 * a feed object if it is lower than feedTypes.ftUnknown.
 */
var feedTypes = {
	ftStarred:	-3,
	ftAllItems:	-2,
	ftUnknown:	-1,
	ftRDF:		1,
	ftRSS:		2,
	ftATOM:		3
};

/**
 * Create a new Feed.
 *
 * @param	proto		{object}		feed object to clone
 */
function Feed(proto) {
	if(proto) {
		this.title = proto.title || this.title;
		this.url = proto.url || this.url;
		this.feedType = proto.feedType;
		this.feedOrder = proto.feedOrder || Feed.prototype.feedOrder;
		this.enabled = proto.enabled || Feed.prototype.enabled;
		this.showPicture = proto.showPicture || Feed.prototype.showPicture;
		this.showMedia = proto.showMedia || Feed.prototype.showMedia;
		this.showListSummary = proto.showListSummary || Feed.prototype.showListSummary;
		this.showListCaption = proto.showListCaption || Feed.prototype.showListCaption;
		this.showDetailSummary = proto.showDetailSummary || Feed.prototype.showDetailSummary;
		this.showDetailCaption = proto.showDetailCaption || Feed.prototype.showDetailCaption;
		this.sortMode = proto.sortMode || Feed.prototype.sortMode;
		this.allowHTML = proto.allowHTML || Feed.prototype.allowHTML;
		this.numNew = proto.numNew || Feed.prototype.numNew;
		this.numUnRead = proto.numUnRead || Feed.prototype.numUnRead;
		this.category = proto.category || Feed.prototype.category;
		this.categoryName = proto.categoryName || Feed.prototype.categoryName;

		if(proto.id || proto.id === 0) {
			this.id = proto.id;
		}

        this.username = proto.username || this.username;
        this.password = proto.password || this.password;
	}
}

Feed.prototype = {
    title:              "",
    url:				"",
    feedType:			feedTypes.ftRSS,
    feedOrder:			0,
    enabled:			1,
    showPicture:		1,
    showMedia:			1,
    showListSummary:	1,
    showDetailSummary:	1,
    showListCaption:	1,
    showDetailCaption:	1,
    sortMode:			0,
    allowHTML:			1,
    numNew:				0,
    numUnRead:			0,
    username:			"",
    password:			"",
    category:			0,
    categoryName:		"Uncategorized"
};
