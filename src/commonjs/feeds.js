/*
 *		commonjs/feeds.js - Common feed processing
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

function FeedProcessor(conf) {
    this.cpConverter = new CodepageConverter();
    for(var key in conf) {
        this[key] = conf[key];
    }
}

FeedProcessor.prototype = {

    setFeedType:    null,
    showError:      null,
    log:            null,
    error:          null,

    formatting:     null,
    dateFormatter:  null,

    msgNoData:      null,
    msgUnsupported: null,

    cpConverter:    null,

    /**
	 * Determine the type of the given feed.
	 *
	 * @param 	feed		    {object}	feed object
	 * @param 	response	    {object} 	AJAX response
	 * @param	responseText	{object}	AJAX response text
     * @param   changingFeed    {boolean}   true, if this is an interactive update
	 * @return 				    {boolean}	true if type is supported
	 */
	determineFeedType: function(feed, response, responseText, changingFeed) {
		try {
			if(responseText.length === 0) {
				if(changingFeed) {
					this.showError(this.msgNoData, { title: feed.url });
				}
				this.log("FEEDS> Empty responseText in", feed.url);
				return this.setFeedType(feed, feedTypes.ftUnknown);
			}

			var feedType = response.getElementsByTagName("rss");
			if(feedType.length > 0) {
				return this.setFeedType(feed, feedTypes.ftRSS);
			} else {
				feedType = response.getElementsByTagName("RDF");
				if (feedType.length > 0) {
					return this.setFeedType(feed, feedTypes.ftRDF);
				} else {
					feedType = response.getElementsByTagName("feed");
					if (feedType.length > 0) {
						return this.setFeedType(feed, feedTypes.ftATOM);
					} else {
						if(changingFeed) {
							this.showError(this.msgUnsupported, { title: feed.url });
						}
						this.log("FEEDS> Unsupported feed format in", feed.url);
						return this.setFeedType(feed, feedTypes.ftUnknown);
					}
				}
			}
		} catch(e) {
			this.error("FEEDS EXCEPTION>", e);
		}
		return this.setFeedType(feed.url, feedTypes.ftUnknown);
	},

    /** @private
     *
     * Parse RDF Feed data.
     *
     * @param   db          {object}    feed database
     * @param 	feed		{object}	feed object
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    _parseAtom: function(db, feed, response, contentType) {
        var allStories = [];
        var story, enclosures, enclosure;
        var rel, url, enc, type, title, el;
        var item, summary, content;
        var updated, id;

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
                    story.pubdate = this.dateFormatter.dateToInt(updated.item(0).textContent, this.formatting);
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
                this.error("FEEDS EXCEPTION>", e);
            }
        }
        db.updateStories(feed, allStories);
    },

    /** @private
     *
     * Parse RSS feed data.
     *
     * @param   db          {object}    feed database
     * @param 	feed		{object}	feed object
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    _parseRSS: function(db, feed, response, contentType) {
        var allStories = [];
        var enclosures, enclosure, story, item;
        var url, type, enc;
        var title, description, link, el;
        var pubdate, date, guid;

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
                    story.pubdate = this.dateFormatter.dateToInt(pubdate.item(0).textContent, this.formatting);
                } else {
                    date = item.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "date");
                    if (date && date.item(0)) {
                        story.pubdate = this.dateFormatter.dateToInt(date.item(0).textContent, this.formatting);
                    } else {
                        this.log("FEEDS> no pubdate given");
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
                this.error("FEEDS EXCEPTION>", e);
            }
        }
        db.updateStories(feed, allStories);
    },

    /** @private
     *
     * Parse RDF feed data.
     *
     * @param   db          {object}    feed database
     * @param 	feed		{object}	feed object
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    _parseRDF: function(db, feed, response, contentType) {
        this._parseRSS(db, feed, response, contentType);		// Currently we do the same as for RSS.
    },

    /**
     * Parse feed data.
     *
     * @param   db          {object}    feed database
     * @param 	feed		{object}	feed object
     * @param   feedType    {object}    feed type
     * @param 	response	{object} 	AJAX XML response
     * @param	contentType	{string}	HTTP-Header "Content-Type"
     */
    parseFeed: function(db, feed, feedType, response, contentType) {


        try {
            switch(feedType) {
                case feedTypes.ftATOM:
                    this._parseAtom(db, feed, response, contentType);
                    break;

                case feedTypes.ftRSS:
                    this._parseRSS(db, feed, response, contentType);
                    break;

                case feedTypes.ftRDF:
                    this._parseRDF(db, feed, response, contentType);
            }
            db.endStoryUpdate(feed, feedType != feedTypes.ftUnknown);
        } catch(ex) {
            this.error("FEEDS EXCEPTION>", ex);
            db.endStoryUpdate(feed, false);
        }
    }
};