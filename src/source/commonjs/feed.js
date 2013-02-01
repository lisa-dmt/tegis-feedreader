/*
 *		commonjs/feed.js - Feed data model
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
	enyo.mixin(this, Feed.prototype);
	if(proto) {
		this.title = proto.title || this.title;
		this.url = proto.url || this.url;
		this.feedType = proto.feedType;
		if(proto.feedOrder !== undefined)
			this.feedOrder = proto.feedOrder;
		if(proto.enabled !== undefined)
			this.enabled = proto.enabled;
		if(proto.showPicture !== undefined)
			this.showPicture = proto.showPicture;
		if(proto.showMedia !== undefined)
			this.showMedia = proto.showMedia;
		if(proto.showListSummary !== undefined)
			this.showListSummary = proto.showListSummary;
		if(proto.showListCaption !== undefined)
			this.showListCaption = proto.showListCaption;
		if(proto.showDetailSummary !== undefined)
			this.showDetailSummary = proto.showDetailSummary;
		if(proto.showDetailCaption !== undefined)
			this.showDetailCaption = proto.showDetailCaption;
		if(proto.sortMode !== undefined)
			this.sortMode = proto.sortMode;
		if(proto.allowHTML !== undefined)
			this.allowHTML = proto.allowHTML;
		if(proto.numNew) {
			this.numNew = proto.numNew;
		}
		if(proto.numUnRead) {
			this.numUnRead = proto.numUnRead;
		}
		if(proto.id || proto.id === 0) {
			this.id = proto.id;
		}
		if(proto.fullStory !== null) {
			this.fullStory = proto.fullStory;
		}
		if(this.feedType < feedTypes.ftUnknown) {
			this.preventDelete = true;
		}
		if(proto.username && proto.password) {
			this.username = proto.username;
			this.password = proto.password;
		}
		if(proto.category !== null) {
			this.category = proto.category;
		}
		if(proto.categoryName !== null) {
			this.categoryName = proto.categoryName;
		}
	}
}

Feed.prototype.title =				"";
Feed.prototype.url =				"";
Feed.prototype.feedType =			feedTypes.ftRSS;
Feed.prototype.feedOrder =			0;
Feed.prototype.enabled =			1;
Feed.prototype.showPicture =		1;
Feed.prototype.showMedia =			1;
Feed.prototype.showListSummary =	1;
Feed.prototype.showDetailSummary =	1;
Feed.prototype.showListCaption =	1;
Feed.prototype.showDetailCaption =	1;
Feed.prototype.sortMode =			0;
Feed.prototype.allowHTML =			1;
Feed.prototype.numNew =				0;
Feed.prototype.numUnRead =			0;
Feed.prototype.preventDelete =		false;
Feed.prototype.username =			"";
Feed.prototype.password =			"";
Feed.prototype.fullStory =			true;
Feed.prototype.category =			0;
Feed.prototype.categoryName =		"Uncategorized";
