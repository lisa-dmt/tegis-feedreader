/*
 *		source/logic/feeds.js - Feedlist data model
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
	name:	"Feeds",
	kind:	"Component",

	components: [{
		name:		"dateFormatter",
		kind:		"DateFormatter"
	}, {
        kind:           enyo.Signals,
        onUpdateAll:    "enqueueUpdateAll"
    }],

	interactiveUpdate:  false,		// true if the update is interactive
	changingFeed:       false,	    // true if a feed is changed
	updateWhenReady:    true,
	formatting:	        null,
    cpConverter:        null,

    msgNoData:          $L("The Feed '{$title}' does not return data."),
    msgUnspported:      $L("The format of Feed '{$title}' is unsupported."),

	/**
	 * Constructor.
	 */
	create: function() {
		this.inherited(arguments);
		this.updateWhenReady = enyo.application.prefs.updateOnStart;
		this.formatting = new Formatting();
        this.cpConverter = new CodepageConverter();
        this.getNewCount = enyo.bind(this, this.getNewCount);
        this.enqueueUpdateList = enyo.bind(this, this.enqueueUpdateList);
		this.postNotification = enyo.bind(this, this.postNotification);
	},

	/**
	 * Returns the date formatter kind.
	 */
	getDateFormatter: function() {
		return this.$.dateFormatter;
	},

	/**
	 * Updates a feed.
	 *
	 * @param feed	{Object} 	feed to update
	 */
	enqueueUpdate: function(feed) {
        if(feed.feedType == feedTypes.ftAllItems || feed.feedType == feedTypes.ftStarred) {
            this.enqueueUpdateAll();
            return;
        }

		enyo.application.spooler.addAction(enyo.bind(this, this.doUpdateFeed, feed), feed.id, true);
	},

	/**
	 * Update all feeds.
	 */
	enqueueUpdateAll: function() {
		enyo.log("FEEDLIST> Full update requested");
		enyo.application.db.getUpdatableFeeds(this.enqueueUpdateList);
	},

	/** @private
	 *
	 * Called from the database with a list of all updatable feeds.
	 */
	enqueueUpdateList: function(feeds) {
		if(feeds.length > 0) {
			enyo.application.spooler.beginUpdate();
			for(var i = 0; i < feeds.length; i++) {
				this.enqueueUpdate(feeds[i]);
			}
			enyo.application.spooler.addAction(this.getNewCount, "getNewCount", true);
			enyo.application.spooler.endUpdate();
		}
	},

    /**
     * Send a notification of the update state of a feed.
     *
     * @param	feed	{object}		feed object
     * @param	state	{object}		state of the feed
     */
    notifyOfUpdate: function(feed, state) {
        enyo.Signals.send("onFeedUpdating", {state: state, index: feed.feedOrder});
    },

	/** @private
	 *
	 * Called by the spooler to update a feed.
	 *
	 * @param	feed	{object}	feed object to update
	 */
	doUpdateFeed: function(feed) {
		try {
			enyo.application.connChecker.checkConnection(
				enyo.bind(this, this.haveConnection, feed),
				enyo.bind(this, this.haveNoConnection, feed)
			);
		} catch(e) {
			enyo.error("FEEDS EXCEPTION>", e);
			enyo.application.spooler.nextAction();
		}
	},

	/** @private
	 *
	 * Called when the connection status could be retrieved.
	 *
	 * @param feed		{object}	feed object to be updated
	 */
	haveConnection: function(feed) {
		try {
			enyo.log("FEEDS> Internet connection available, requesting", feed.url);
			this.notifyOfUpdate(feed, true);

			var ajax = new enyo.Ajax({
				feed:		feed,
				url:		feed.url,
				username:	feed.username || "",
				password:	feed.password || "",
				handleAs:	"xml"
			});
			ajax.response(this, "updateFeedSuccess");
			ajax.error(this, "updateFeedFailed");
			ajax.go({});
		} catch(e) {
			enyo.error("FEEDS EXCEPTION>", e);
            this.notifyOfUpdate(feed, false);
			enyo.application.spooler.nextAction();
		}
	},

	/** @private
	 *
	 * Called when no connection is available or the request failed.
	 *
	 */
	haveNoConnection: function() {
		enyo.application.spooler.nextAction();
	},

	/** @private
	 *
	 * Called when an Ajax request succeeds.
	 *
	 * @param	sender		{object}	sender
	 * @param 	response	{object} 	response object
	 */
	updateFeedSuccess: function(sender, response) {
		var feed = sender.feed;
		enyo.log("FEEDS> Got new content from", feed.url);
		try {
			if(response === null) {
				if(sender.xhr.responseText.length <= 0) {
					enyo.log("FEEDS> No response at all... maybe no connection available");
					enyo.application.spooler.nextAction();
					return;
				} else if(sender.xhr.responseText !== null) {
					enyo.log("FEEDS> Manually converting feed info to xml for", feed.url);
					response = new DOMParser().parseFromString(request.xhr.responseText, "text/xml");
					enyo.log(sender.xhr.responseText);
				}
			}

			var type = this._determineFeedType(feed, response, sender.xhr.responseText);
            this._parseFeed(feed, type, response, sender.xhr.getResponseHeader("Content-Type"));
		} catch(e) {
			enyo.error("FEEDS EXCEPTION>", e);
		}
	},

    finishUpdateFeed: function(feed) {
        this.notifyOfUpdate(feed, false);
        enyo.log("FEEDS> Finished updating feed", feed.url);
        enyo.application.spooler.nextAction();
    },

	/** @private
	 *
	 * Called when an Ajax request fails.
	 *
	 * @param 	sender		{object}	event sender
	 * @param 	response	{object} 	error response
	 */
	updateFeedFailed: function(sender, response) {
		var feed = sender.feed;
		try {
			var error = "";
			var ignore = (!sender.xhr) || (sender.xhr.status == 0);
			switch(sender.xhr ? sender.xhr.status : 0) {
				case 400:
					error = $L("Bad Request");
					break;
				case 401:
					error = $L("Unauthorized");
					break;
				case 403:
					error = $L("Forbidden");
					break;
				case 404:
					error = $L("Not Found");
					break;
				case 405:
					error = $L("Method Not Allowed");
					break;
				case 406:
					error = $L("Not Acceptable");
					break;
				default:
					if (sender.xhr && sender.xhr.status >= 500) {
						error = $L("Server error");
					} else {
						error = $L("Unexpected error");
					}
					break;
			}
			if(!ignore) {
				enyo.warn("FEEDS> Feed", feed.url, "is defect; error:", error);
				if (this.changingFeed) {
					enyo.application.db.disableFeed(feed);
					enyo.application.showError($L("The Feed '{$title}' could not be retrieved. The server responded: {$err}. The Feed was automatically disabled."),
											   { title: feed.url, err: error} );
				}
			}
		} catch(e) {
			enyo.error("FEEDS EXCEPTION>", e);
		}
		enyo.application.spooler.nextAction();
	},

	/** @private
	 *
	 * Get the count of new stories and post a notification.
	 */
	getNewCount: function() {
		enyo.application.db.getNewStoryCount(this.postNotification);
	},

	/** @private
	 *
	 * Post a notification about new story count.
	 *
	 * @param	count	{integer}		count of new stories
	 */
	postNotification: function(count) {
		try {
			if(count > 0) {
				if((!enyo.application.isActive) && (!this.interactiveUpdate) && (enyo.application.prefs.notificationEnabled)) {
					enyo.log("FEEDS> About to post notification for new items; count =", count);
					enyo.Signals.send("onNewItemsArrived", { count: count });
				}
			}
		} catch(e) {
			enyo.error("FEEDS EXCEPTION>", e);
		}
		enyo.application.spooler.nextAction();
	},

    /**
     * Determine the type of the given feed.
     *
     * @param 	feed		    {object}	feed object
     * @param 	response	    {object} 	AJAX response
     * @param	responseText	{object}	AJAX response text
     * @param   changingFeed    {boolean}   true, if this is an interactive update
     * @return 				    {boolean}	true if type is supported
     */
    _determineFeedType: function(feed, response, responseText) {
        try {
            if(responseText.length === 0) {
                if(this.changingFeed) {
                    enyo.application.showError(this.msgNoData, { title: feed.url });
                }
                enyo.log("FEEDS> Empty responseText in", feed.url);
                return enyo.application.db.setFeedType(feed, feedTypes.ftUnknown);
            }

            var feedType = response.getElementsByTagName("rss");
            if(feedType.length > 0) {
                return enyo.application.db.setFeedType(feed, feedTypes.ftRSS);
            } else {
                feedType = response.getElementsByTagName("RDF");
                if (feedType.length > 0) {
                    return enyo.application.db.setFeedType(feed, feedTypes.ftRDF);
                } else {
                    feedType = response.getElementsByTagName("feed");
                    if (feedType.length > 0) {
                        return enyo.application.db.setFeedType(feed, feedTypes.ftATOM);
                    } else {
                        if(this.changingFeed) {
                            enyo.application.showError(this.msgUnsupported, { title: feed.url });
                        }
                        enyo.log("FEEDS> Unsupported feed format in", feed.url);
                        return enyo.application.db.setFeedType(feed, feedTypes.ftUnknown);
                    }
                }
            }
        } catch(e) {
            enyo.error("FEEDS EXCEPTION>", e);
            enyo.application.showError(this.msgUnsupported, { title: feed.url });
            return enyo.application.db.setFeedType(feed, feedTypes.ftUnknown);
        }
    },

    /**
     * Parse feed data.
     *
     * @param 	feed		{object}	feed object
     * @param   feedType    {object}    feed type
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    _parseFeed: function(feed, feedType, response, contentType) {
        try {
            switch(feedType) {
                case feedTypes.ftATOM:
                    this._parseAtom(feed, response, contentType);
                    break;

                case feedTypes.ftRSS:
                    this._parseRSS(feed, response, contentType);
                    break;

                case feedTypes.ftRDF:
                    this._parseRDF(feed, response, contentType);
            }
        } catch(ex) {
            enyo.error("FEEDS EXCEPTION>", ex);
        }
    },

    /** @private
     *
     * Parse RDF Feed data.
     *
     * @param 	feed		{object}	feed object
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    _parseAtom: function(feed, response, contentType) {
        var allStories = [];
        var story, enclosures, enclosure;
        var rel, url, enc, type, title, el;
        var item, summary, content;
        var updated, id;
        var success = true;

        var atomItems = response.getElementsByTagName("entry");
        var l = atomItems.length;
        for (var i = 0; i < l; i++) {
            try {
                item = atomItems[i];
                story = {
                    title:		"",
                    summary:	"",
                    url:		[],
                    picture:	"",
                    audio:		"",
                    video:		"",
                    pubdate:	0,
                    uuid:		""
                };

                title = item.getElementsByTagName("title");
                if(title && title.item(0)) {
                    story.title = this.formatting.stripBreaks(this.cpConverter.convert(contentType, unescape(title.item(0).textContent)));
                }

                content = item.getElementsByTagName("content");
                if(content && content.item(0)) {
                    story.summary = this.formatting.reformatSummary(this.cpConverter.convert(contentType, content.item(0).textContent));
                } else {
                    summary = item.getElementsByTagName("summary");
                    if (summary && summary.item(0)) {
                        story.summary = this.formatting.reformatSummary(this.cpConverter.convert(contentType, summary.item(0).textContent));
                    }
                }

                // Analyse the enclosures.
                enclosures = item.getElementsByTagName("link");
                if(enclosures && (enclosures.length > 0)) {
                    el = enclosures.length;
                    for(enc = 0; enc < el; enc++) {
                        enclosure = enclosures.item(enc);
                        rel = enclosure.getAttribute("rel");
                        url = enclosure.getAttribute("href");
                        type = enclosure.getAttribute("type");
                        if(!type) {
                            type = "";
                        }
                        if(url && (url.length > 0)) {
                            if(url.match(/.*\.htm(l){0,1}/i) ||
                                (type && (type.match(/text\/html/i) || type.match(/application\/xhtml\+xml/i)))){
                                title = enclosures.item(enc).getAttribute("title");
                                if((title === null) || (title.length === 0)) {
                                    if(rel && rel.match(/alternate/i)) {
                                        title = $L("Weblink");
                                    } else if (rel && rel.match(/replies/i)) {
                                        title = $L("Replies");
                                    } else {
                                        title = $L("Weblink");
                                    }
                                }
                                story.url.push({
                                    title:	this.cpConverter.convert(contentType, title),
                                    href:	url
                                });
                            } else if(rel && rel.match(/enclosure/i)) {
                                if(url.match(/.*\.jpg/i) ||
                                    url.match(/.*\.jpeg/i) ||
                                    url.match(/.*\.gif/i) ||
                                    url.match(/.*\.png/i)) {
                                    story.picture = url;
                                } else if(url.match(/.*\.mp3/i) ||
                                    (url.match(/.*\.mp4/i) && type.match(/audio\/.*/i)) ||
                                    url.match(/.*\.wav/i) ||
                                    url.match(/.*\.m4a/i) ||
                                    url.match(/.*\.aac/i)) {
                                    story.audio = url;
                                } else if(url.match(/.*\.mpg/i) ||
                                    url.match(/.*\.mpeg/i) ||
                                    url.match(/.*\.m4v/i) ||
                                    url.match(/.*\.avi/i) ||
                                    (url.match(/.*\.mp4/i) && type.match(/video\/.*/i))) {
                                    story.video = url;
                                }
                            }
                        }
                    }
                }

                // Set the publishing date.
                updated = item.getElementsByTagName("updated");
                if (updated && updated.item(0)) {
                    story.pubdate = this.$.dateFormatter.dateToInt(updated.item(0).textContent, this.formatting);
                }

                // Set the unique id.
                id = item.getElementsByTagName("id");
                if (id && id.item(0)) {
                    story.uuid = this.formatting.stripBreaks(id.item(0).textContent);
                } else {
                    story.uuid = this.formatting.stripBreaks(story.title);
                }

                allStories.push(story);
            } catch(e) {
                enyo.error("FEEDS EXCEPTION>", e);
                success = false;
            }
        }

        var finish = enyo.bind(this, this.finishUpdateFeed, feed);
        enyo.application.db.updateStories(feed, allStories, success, finish, finish);
    },

    /** @private
     *
     * Parse RSS feed data.
     *
     * @param 	feed		{object}	feed object
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    _parseRSS: function(feed, response, contentType) {
        var allStories = [];
        var enclosures, enclosure, story, item;
        var url, type, enc;
        var title, description, link, el;
        var pubdate, date, guid;
        var success = true;

        var rssItems = response.getElementsByTagName("item");
        var l = rssItems.length;
        for (var i = 0; i < l; i++) {
            item = rssItems[i];
            try {
                story = {
                    title: 		"",
                    summary:	"",
                    url:		[],
                    picture:	"",
                    audio:		"",
                    video:		"",
                    pubdate:	0,
                    uuid:		""
                };

                title = item.getElementsByTagName("title");
                if(title && title.item(0)) {
                    story.title = this.formatting.stripBreaks(this.cpConverter.convert(contentType, unescape(title.item(0).textContent)));
                }

                description = item.getElementsByTagName("description");
                if(description && description.item(0)) {
                    story.summary = this.formatting.reformatSummary(this.cpConverter.convert(contentType, description.item(0).textContent));
                }

                link = item.getElementsByTagName("link");
                if(link && link.item(0)) {
                    story.url.push({
                        title:	$L("Weblink"),
                        href:	this.formatting.stripBreaks(link.item(0).textContent)
                    });
                }

                // Analyse the enclosures.
                enclosures = rssItems[i].getElementsByTagName("enclosure");
                if(enclosures && (enclosures.length > 0)) {
                    el = enclosures.length;
                    for(enc = 0; enc < el; enc++) {
                        enclosure = enclosures.item(enc);
                        url = enclosure.getAttribute("url");
                        type = enclosure.getAttribute("type") || "";
                        if(url && (url.length > 0)) {
                            if(url.match(/.*\.jpg/i) ||
                                url.match(/.*\.jpeg/i) ||
                                url.match(/.*\.gif/i) ||
                                url.match(/.*\.png/i)) {
                                story.picture = url;
                            } else if(url.match(/.*\.mp3/i) ||
                                (url.match(/.*\.mp4/i) && type.match(/audio\/.*/i)) ||
                                url.match(/.*\.wav/i) ||
                                url.match(/.*\.aac/i)) {
                                story.audio = url;
                            } else if(url.match(/.*\.mpg/i) ||
                                url.match(/.*\.mpeg/i) ||
                                (url.match(/.*\.mp4/i) && type.match(/video\/.*/i)) ||
                                url.match(/.*\.avi/i) ||
                                url.match(/.*\.m4v/i)) {
                                story.video = url;
                            }
                        }
                    }
                }

                // Set the publishing date.
                pubdate = item.getElementsByTagName("pubDate");
                if(pubdate && pubdate.item(0)) {
                    story.pubdate = this.$.dateFormatter.dateToInt(pubdate.item(0).textContent, this.formatting);
                } else {
                    date = item.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "date");
                    if (date && date.item(0)) {
                        story.pubdate = this.$.dateFormatter.dateToInt(date.item(0).textContent, this.formatting);
                    } else {
                        enyo.log("FEEDS> no pubdate given");
                    }
                }

                // Set the unique id.
                guid = item.getElementsByTagName("guid");
                if(guid && guid.item(0)) {
                    story.uuid = this.formatting.stripBreaks(guid.item(0).textContent);
                } else {
                    story.uuid = this.formatting.stripBreaks(story.title);
                }

                allStories.push(story);
            } catch(e) {
                enyo.error("FEEDS EXCEPTION>", e);
                success = false;
            }
        }

        var finish = enyo.bind(this, this.finishUpdateFeed, feed);
        enyo.application.db.updateStories(feed, allStories, success, finish, finish);
    },

    /** @private
     *
     * Parse RDF feed data.
     *
     * @param 	feed		{object}	feed object
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    _parseRDF: function(feed, response, contentType) {
        this._parseRSS(feed, response, contentType);  // Currently we do the same as for RSS.
    },

	/**
	 * Mark all stories of the given feed as being read.
	 *
	 * @param {Object}	feed		feed object
	 */
	markAllRead: function(feed) {
		enyo.application.db.markAllRead(feed, 1, function() {
			enyo.Signals.send("onFeedListChanged");
			enyo.Signals.send("onStoryListChanged");
		});
	},

	/**
	 * Mark a given story as being read.
	 *
	 * @param {Object} story	story object
	 */
	markStoryRead: function(story) {
		enyo.application.db.markStoryRead(story, function() {
			enyo.Signals.send("onFeedListChanged");
			enyo.Signals.send("onStoryListChanged");
		});
	},

	/**
	 * Mark all stories of the given feed as being unread.
	 *
	 * @param {Object} feed		feed object
	 */
	markAllUnRead: function(feed) {
		enyo.application.db.markAllRead(feed, 0, function() {
			enyo.Signals.send("onFeedListChanged");
			enyo.Signals.send("onStoryListChanged");
		});
	},

	/**
	 * Set a story's isStarred flag.
	 *
	 * @param	story	{Object}	story object
	 */
	markStarred: function(story) {
		enyo.application.db.markStarred(story, function() {
			enyo.Signals.send("onFeedListChanged");
			enyo.Signals.send("onStoryListChanged");
		});

		var storyMarker = function(feed, story, urls) {
			if(urls.length <= 0) {
				return;
			} else if(story.isStarred) {
				enyo.application.ril.addURL(story.title, urls[0].href);
			} else {
				enyo.application.ril.removeURL(urls[0].href);
			}
		};
		enyo.application.db.getStory(story.id, storyMarker);
	},

	/**
	 * Remove the star state from all feeds of a given feed.
	 *
	 * @param	feed	{object}	feed object
	 */
	markAllUnStarred: function(feed) {
		var storyMarker = function(list) {
			if(list.length > 0) {
				enyo.application.ril.removeURLs(list);
			}
		};
		enyo.application.db.getFeedURLList(feed, storyMarker.bind(this));
		enyo.application.db.markAllUnStarred(feed, function() {
			enyo.Signals.send("onFeedListChanged");
			enyo.Signals.send("onStoryListChanged");
		});
	},

	/**
	 * Delete a given feed.
	 *
	 * @param 	feed	{object}		feed object
	 */
	deleteFeed: function(feed) {
		var onSuccess = function() {
			enyo.Signals.send("onFeedListChanged");
		};
		var onFail = function(transaction, error) {
			enyo.Signals.send("onFeedListChanged");
			enyo.error("FEEDS> Deleting feed failed:", error.message);
		};
		enyo.application.db.deleteFeed(feed, onSuccess, onFail);
	},

	/**
	 * Delete a given story.
	 *
	 * @param 	story	{object}		story object
	 */
	deleteStory: function(story) {
		var onSuccess = function() {
			enyo.Signals.send("onFeedListChanged");
		};
		var onFail = function(transaction, error) {
			enyo.Signals.send("onStoryListChanged");
			enyo.error("FEEDS> Deleting story failed:", error.message);
		};
		enyo.application.db.deleteStory(story, onSuccess, onFail);
	},

	/**
	 * Move a feed in the list.
	 *
	 * @param {int} fromIndex	Feed to be moved
	 * @param {int} toIndex		Index to move it to
	 */
	moveFeed: function(fromIndex, toIndex) {
		if(fromIndex == toIndex) {
			return;
		}

		var onSuccess = function() {
			enyo.Signals.send("onFeedListChanged");
		};

		enyo.application.db.reOrderFeed(fromIndex, toIndex, onSuccess);
	},

	/** @private
	 *
	 * Called when editing a feed succeeds.
	 *
	 * @param onSuccess	{function}	called on success
	 * @param	feed	{object}	feed object
	 */
	onAddOrEditFeedSuccess: function(onSuccess, feed) {
		enyo.Signals.send("onFeedListChanged");
		if(onSuccess) {
			onSuccess();
		}
		if(feed.enabled) {
			this.changingFeed = true;
			this.enqueueUpdate(feed);
		}
	},

	/**
	 * Add a new feed or edit an existing one.
	 *
	 * @param feed		{object} 	feed object
	 * @param onSuccess	{function}	called on success
	 * @param onFail	{function}	called on failure
	 */
	addOrEditFeed: function(feed, onSuccess, onFail) {
		if(feed.title === "") {
			feed.title = "RSS Feed";
		}
		enyo.application.db.addOrEditFeed(new Feed(feed), enyo.bind(this, this.onAddOrEditFeedSuccess, onSuccess), onFail);
	},

	/**
	 * Get the effective title of a feed.
	 *
	 * @param		feed		{object} 	feed object
	 * @returns					{string}	title
	 */
	getFeedTitle: function(feed) {
		switch(feed.feedType) {
			case feedTypes.ftStarred:	return $L("Starred items");
			case feedTypes.ftAllItems:	return $L("All items");
		}
		return feed.title;
	},

	/**
	 * Get the effective url of a feed.
	 *
	 * @param		feed		{object} 	feed object
	 * @returns					{string}	url
	 */
	getFeedURL: function(feed) {
		switch(feed.feedType) {
			case feedTypes.ftStarred:	return $L("All starred items");
			case feedTypes.ftAllItems:	return $L("Aggregation of all items");
		}
		return feed.url;
	},

	/**
	 * Return a feeds icon.
	 *
	 * @param	feed			{Object} 	a feed object
	 * @param	ignoreUnknown	{Boolean}
	 * @param	ignoreEnabled	{Boolean}
	 * @return					{String}	the header icon
	 */
	getFeedIcon: function(feed, ignoreEnabled, ignoreUnknown) {
		var prefix = "assets/lists/icon-";
		var icon = "";
		var suffix = "";
		if(enyo.application.scrimMode) {
			icon = "starred";
		} else {
			switch(feed.feedType) {
				case feedTypes.ftAllItems:	icon = "allitems";	break;
				case feedTypes.ftStarred:	icon = "starred";	break;
				case feedTypes.ftRDF:
				case feedTypes.ftRSS:		icon = "rss";		break;
				case feedTypes.ftATOM:		icon = "atom";		break;
				default:					icon = ignoreUnknown ? "rss" : "unknown"; break;
			}
			if(!ignoreEnabled && !feed.enabled) {
				suffix = '-disabled';
			}
		}
		return prefix + icon + suffix + '.png';
	},

	getFeeds: function(filter, onSuccess) {
		enyo.application.db.getFeeds(filter, onSuccess);
	},

	getFeed: function(id, onSuccess) {
		enyo.application.db.getFeed(id, onSuccess);
	},

	getFeedURLList: function(feed, onSuccess) {
		enyo.application.db.getFeedURLList(feed, onSuccess);
	},

	getStories: function(feed, filter, onSuccess) {
		enyo.application.db.getStories(feed, filter, onSuccess);
	},

	getStory: function(id, onSuccess) {
		enyo.application.db.getStory(id, onSuccess);
	},

	/**
	 * Set the sort mode of a feed.
	 *
	 * @param		feed		{object} 	feed object
	 */
	setSortMode: function(feed) {
		enyo.application.db.setSortMode(feed, function() {
			enyo.Signals.send("onStoryListChanged");
		});
	},

	/**
	 * Returns true, if initialization is complete.
	 *
	 * @returns		{bool}	readyness state
	 */
	isReady: function() {
		return (enyo.application.db.ready && (!enyo.application.db.loading));
	},

	/**
	 * Returns true, if an update is in progress.
	 *
	 * @returns		{bool}		update state
	 */
	isUpdating: function() {
		return enyo.application.spooler.hasWork();
	},

	/**
	 * Return a single pseudo-feed used for the main scrim.
	 *
	 * @returns		{array}		array containing pseudo-feed
	 */
	getCopyrightFeed: function() {
		var list = [];

		list.push(new Feed({
			title:		enyo.application.appName,
			url:		"© " + enyo.application.copyrightYears + " " + enyo.application.appAuthor,
			feedType:	feedTypes.ftRSS,
			feedOrder:	0,
			enabled:	true
		}));
		return list;
	}
});
