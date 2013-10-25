/*
 *		source/logic/indexeddb.js - Database functions
 *
 * The classes defined here communicate with the FeedReader IndexedDB
 * database.
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

function pubdateSort(a, b) {
	return b.pubdate - a.pubdate;
}

function feedOrderSort(a, b) {
	return a.feedOrder - b.feedOrder;
}

enyo.kind({
	name:				"IndexedDB",
	kind:				enyo.Component,

	indexedDb:			null,
	db:					null,
	isReady:			false,

	create: function() {
		this.inherited(arguments);

		// Pre-bind error handler.
		this.transactionFailed = enyo.bind(this, this.transactionFailed);
		this.nullData = enyo.bind(this, this.nullData);
		this.errorHandler = enyo.bind(this, this.errorHandler);

		// Obtain database API.
		this.indexedDb = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
		if(!this.indexedDb) {
			this.error("DB> no indexedDB support, dying");
			return;
		}

		// Initialize database.
		var request = this.indexedDb.open("FeedReader Database", 1); //enyo.application.versionInt);
		request.onerror = enyo.bind(this, this.dbSetupFailed);
		request.onsuccess = enyo.bind(this, this.dbReady, request);
		request.onupgradeneeded = enyo.bind(this, this.upgradeDb);
	},

	dbSetupFailed: function(event) {
		this.error("DB> error setting up database, code:", event.target.errorCode);
	},

	dbReady: function(event, request) {
		this.db = event.result;

		this.log("DB> Database schema ready");

		enyo.asyncMethod(function() {
			if(enyo.application.prefs.updateOnStart || enyo.application.feeds.updateWhenReady) {
				enyo.application.feeds.updateWhenReady = false;
				enyo.Signals.send("onUpdateAll");
			}
		});

		this.isReady = true;
		enyo.Signals.send("onDbReady");
	},

	upgradeDb: function(event) {
		var db = event.currentTarget.result;

		// Setup object storages.
		var categories = db.createObjectStore("categories", { keyPath: "id", autoIncrement: true });
		var feeds = db.createObjectStore("feeds", { keyPath: "id", autoIncrement: true });
		var stories = db.createObjectStore("stories", { keyPath: "id", autoIncrement: true });

		// Create indexes.
		categories.createIndex("title", "title", { unique: true });
		categories.createIndex("catOrder", "catOrder", { unique: false });

		feeds.createIndex("title", "title", { unique: false });
		feeds.createIndex("feedType", "feedType", { unique: false });
		feeds.createIndex("category", "category", { unique: false });
		feeds.createIndex("feedOrder", "feedOrder", { unique: false });

		stories.createIndex("fid", "fid", { unique: false });

		// Create default objects.
		categories.add(new Category({ title: "Uncategorized", catOrder: 0 }));
		categories.add(new Category({ title: "Aggregations", catOrder: 1 }));

		feeds.add(new Feed({
			title: "Starred Items",
			url: "starred",
			feedType: feedTypes.ftStarred,
			category: 2,
			feedOrder: 0,
			enabled: 1
		}));
		feeds.add(new Feed({
			title: "All Items",
			url:"allItems",
			feedType: feedTypes.ftAllItems,
			category: 2,
			feedOrder: 1,
			enabled: 1
		}));
	},

	cloneWhenNeeded: function(obj, constructor) {
		if(!obj.originator)
			return obj;
		return new constructor(obj);
	},

	boundBetween: function(a, b) {
		var lower = Math.min(a, b);
		var upper = Math.max(a, b);

		return IDBKeyRange.bound(lower, upper);
	},

	boundOnly: function(a) {
		return IDBKeyRange.only(a);
	},

	/** @private
	 *
	 * Open a read/write transaction.
	 *
 	 * @param tables	Object storages used in transaction
 	 * @param onSuccess	Called when transaction succeeds
	 * @param onFail	Called when transaction fails
	 */
	writeTransaction: function(tables, onSuccess, onFail) {
		var transaction = this.db.transaction(tables, "readwrite");
		if(onSuccess) {
			transaction.oncomplete = function() {
				onSuccess();
			};
		}
		if(onFail) {
			var self = this;
			transaction.onerror = function(event) {
				self.transactionFailed(event);
				onFail();
			};
		} else {
			transaction.onerror = this.transactionFailed;
		}
		return transaction;
	},

	/** @private
	 *
	 * Open a read-only transaction.
	 *
	 * @param tables	Object storages used in transaction
	 * @param onSuccess	Called when transaction succeeds
	 * @param onFail	Called when transaction fails
	 */
	readTransaction: function(tables, onSuccess, onFail) {
		var transaction = this.db.transaction(tables);
		if(onSuccess) {
			transaction.oncomplete = function() {
				onSuccess();
			};
		}
		if(onFail) {
			var self = this;
			transaction.onerror = function(event) {
				self.transactionFailed(event);
				onFail();
			};
		} else {
			transaction.onerror = this.transactionFailed;
		}
		return transaction;
	},

	/** @private
	 *
	 * Called in case a transactions fails.
	 *
	 * @param event
	 */
	transactionFailed: function(event) {
		this.error("DB> transaction failed, code:", event.target.errorCode);
	},

	/** @private
	 *
	 * Default data handler. Does nothing.
	 *
	 */
	nullData: function() {
	},

	/** @private
	 *
	 * Default error handler.
	 *
	 */
	errorHandler: function(event) {
		this.error("DB> query failed");
	},

	/** @private
	 *
	 * Reorder a database item list by changing the order property.
	 *
	 * @param items			array of items
	 * @param orderProp		name of order property
	 * @param oldOrder		old order value of the item
	 * @param newOrder		new order value of the item
	 */
	reorderList: function(items, orderProp, oldOrder, newOrder) {
		var itemToMove;
		for(var i = 0; i < items.length; i++) {
			var item = items[i];
			if(item[orderProp] == oldOrder) {
				itemToMove = item;
				item[orderProp] = -1;
			} else if(item[orderProp] > oldOrder) {
				item[orderProp]--;
			}
		}
		for(var i = 0; i < items.length; i++) {
			var item = items[i];
			if(item[orderProp] >= newOrder) {
				item[orderProp]++;
			}
		}
		itemToMove[orderProp] = newOrder;
	},

	/**
	 * Retrieve a list of categories.
	 *
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getCategories: function(onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getCategories needs data handler");
		onFail = onFail || this.errorHandler;

		var result = [];
		var cats = this.readTransaction(["categories"], function() {
			onSuccess(result);
		}, onFail).objectStore("categories");
		cats.index("catOrder").openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var cat = cursor.value;
				result.push(cat);
				cursor.continue();
			}
		}
	},

	/**
	 * Delete a category.
	 *
	 * @param	category	{object}		category to delete
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	deleteCategory: function(category, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		this.log("DB> deleting category", category.id);

		// Open transaction.
		var transaction = this.writeTransaction(["categories", "feeds", "stories"], onSuccess, onFail);

		// Get needed object storages
		var categories = transaction.objectStore("categories");
		var feeds = transaction.objectStore("feeds");
		var stories = transaction.objectStore("stories");

		// Get all feeds in this category.
		categories.delete(category.id);
		feeds.index("category").openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var feed = cursor.value;
				stories.index("fid").openCursor().onsuccess = function(event) {
					var cursor = event.target.result;
					if(cursor) {
						var story = cursor.value;
						stories.delete(story.id);
						cursor.continue();
					}
				};
				feeds.delete(feed.id);
				cursor.continue();
			}
		}
	},

	/**
	 * Change the order of a category.
	 *
	 * @param	oldOrder	{int}			old order of the category
	 * @param	newOrder	{int}			new order of the category
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	reOrderCategory: function(oldOrder, newOrder, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var self = this;
		this.getCategories(function(cats) {
			self.reorderList(cats, "catOrder", oldOrder, newOrder);
			var catStore = this.writeTransaction(["categories"], onSuccess, onFail).objectStore("categories");
			for(var i = 0; i < cats.length; i++) {
				catStore.put(self.cloneWhenNeeded(cats[i], Category));
			}
		}, onFail);
	},

	/** @private
	 *
	 * Save a feed.
	 *
	 * @param feed			Feed to be saved
	 * @param onSuccess		function to be called on success
	 * @param onFail		function to be called on failure
	 */
	saveFeed: function(feed, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var feeds = this.writeTransaction(["feeds"], null, onFail).objectStore("feeds");
		feeds.put(this.cloneWhenNeeded(feed, Feed)).onsuccess = function(event) {
			feed.id = event.target.result;
			onSuccess(feed);
		};
	},

	/**
	 * Add a feed or edit a feed's properties.
	 *
	 * @param	feed		{Object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	addOrEditFeed: function(feed, onSuccess, onFail) {
		var maxOrder = 0;
		var id = feed.id || null;

		var feeds = this.writeTransaction(["feeds"], null, onFail).objectStore("feeds");
		if(id !== null) {
			feed = this.cloneWhenNeeded(feed, Feed);
			feeds.put(feed).onsuccess = function() { onSuccess(feed); };
		} else {
			feeds.index("feedOrder").openCursor().onsuccess = function(event) {
				var cursor = event.target.result;
				if(cursor) {
					maxOrder = Math.max(maxOrder, cursor.value.feedOrder);
					cursor.continue();
				} else {
					feed.feedOrder = maxOrder + 1;
					feeds.put(feed).onsuccess = function(event) {
						feed.id = event.target.result;
						onSuccess(feed);
					};
				}
			}
		}
	},

	/**
	 * Set the type of a feed.
	 *
	 * @param	feed		{object}		feed object
	 * @param	type		{int}			type of the feed
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	setFeedType: function(feed, type, onSuccess, onFail) {
		feed.feedType = type;
		this.saveFeed(feed, onSuccess, onFail);
		return type;
	},

	/**
	 * Set the sort mode of a feed.
	 *
	 * @param	feed		{object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	setSortMode: function(feed, onSuccess, onFail) {
		this.saveFeed(feed, onSuccess, onFail);
	},

	/**
	 * Disable a feed.
	 *
	 * @param 	feed		{object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	disableFeed: function(feed, onSuccess, onFail) {
		feed.enabled = 0;
		feed.feedType = feedTypes.ftUnknown;
		this.saveFeed(feed, onSuccess, onFail);
	},

	/**	@protected
	 *
	 * Update the counts of a feed.
	 *
	 * @param feeds				feed object store
	 * @param deltaUnRead		count to be added to the current "unread count"
	 * @param deltaNew			count to be added to the current "new count"
	 * @param event				result of a get operation on the feed object store
	 */
	updateFeedCount: function(feeds, deltaUnRead, deltaNew, event) {
		var feed = event.target.result;
		if(!feed)
			return;
		this.doUpdateFeedCount(feeds, deltaUnRead, deltaNew, feed);
	},

	/**	@protected
	 *
	 * Update the counts of a feed.
	 *
	 * @param feeds				feed object store
	 * @param deltaUnRead		count to be added to the current "unread count"
	 * @param deltaNew			count to be added to the current "new count"
	 * @param feed				feed to update
	 */
	doUpdateFeedCount: function(feeds, deltaUnRead, deltaNew, feed) {
		feed.numUnRead += deltaUnRead;
		feed.numNew += deltaNew;
		feeds.put(feed);
	},

	/**
	 * Delete a feed.
	 *
	 * @param	feed		{object}		feed to delete
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	deleteFeed: function(feed, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var self = this;
		var transaction = this.writeTransaction(["stories", "feeds"], onSuccess, onFail);
		var stories = transaction.objectStore("stories");
		var feeds = transaction.objectStore("feeds");

		function updateFeed(event) {
			var oldFeed = event.target.result;

			// Update feed aggregations.
			var feedupdater = enyo.bind(self, self.updateFeedCount, feeds, -oldFeed.numUnRead, -oldFeed.numNew);
			feeds.index("feedType").get(feedTypes.ftAllItems).onsuccess = feedupdater;
			feeds.index("feedType").get(feedTypes.ftStarred).onsuccess = feedupdater;

			// Delete feed.
			feeds.delete(feed.id);
		}

		stories.index("fid").openCursor(this.boundOnly(feed.id)).onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				stories.delete(cursor.value.id);
				cursor.continue();
			} else {
				feeds.get(feed.id).onsuccess = updateFeed;
			}
		}
	},

	/**
	 * Change the order of a feed.
	 *
	 * @param	oldOrder	{int}			old order of the feed
	 * @param	newOrder	{int}			new order of the feed
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	reOrderFeed: function(oldOrder, newOrder, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var self = this;
		this.getFeeds(null, function(feeds) {
			self.reorderList(feeds, "feedOrder", oldOrder, newOrder);
			var feedsStore = self.writeTransaction(["feeds"], onSuccess, onFail).objectStore("feeds");
			for(var i = 0; i < feeds.length; i++) {
				feedsStore.put(self.cloneWhenNeeded(feeds[i], Feed));
			}
		}, onFail);
	},

	/**
	 * Retrieve a list of updatable feeds.
	 *
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getUpdatableFeeds: function(onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getUpdatableFeeds needs data handler");
		onFail = onFail || this.errorHandler;

		var list = [];
		this.getFeeds(null, function(feeds) {
			for(var i = 0; i < feeds.length; i++) {
				if((feeds[i].enabled != 0) && (feeds[i].feedType > feedTypes.ftUnknown))
					list.push(feeds[i]);
			}
			onSuccess(list);
		}, onFail);
	},

	/**
	 * Retrieve a list of feeds.
	 *
	 * @param	filter		{String}		filter string
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getFeeds: function(filter, onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getFeeds needs data handler");
		onFail = onFail || this.errorHandler;

		var result = [];
		var noFilter = !filter || (filter == "");
		var self = this;
		if(!noFilter)
			filter = filter.toLowerCase();
		var feeds = this.readTransaction(["feeds"], function() {
			onSuccess(result);
		}, onFail).objectStore("feeds");
		feeds.index("feedOrder").openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var feed = cursor.value;
				if(noFilter || (feed.title.toLowerCase().indexOf(filter)) >= 0)
					result.push(self.cloneWhenNeeded(feed, Feed));
				cursor.continue();
			}
		}
	},

	/**
	 * Retrieve a feed.
	 *
	 * @param	id			{Integer}		feed id
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getFeed: function(id, onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getFeed needs data handler");
		onFail = onFail || this.errorHandler;

		var feeds = this.readTransaction(["feeds"], null, onFail).objectStore("feeds");
		feeds.get(id).onsuccess = function(event) {
			onSuccess(event.target.result);
		};
	},

	/**
	 * Get the count of new stories.
	 *
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getNewStoryCount: function(onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getNewStoryCount needs data handler");
		onFail = onFail || this.errorHandler;

		var count = 0;
		var stories = this.readTransaction(["stories"], null, onFail).objectStore("stories");
		stories.openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				if(cursor.value.isNew)
					count++;
				cursor.continue();
			} else {
				onSuccess(count);
			}
		};
	},

	/**
	 * Retrieve a list of stories matching a filter string.
	 *
	 * @param	feed		{Object}		feed object
	 * @param	filter		{String}		filter string
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getStories: function(feed, filter, onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getStories needs data handler");
		onFail = onFail || this.errorHandler;

		var self = this;
		var data = [];
		var noFilter = !filter || (filter == "");
		if(!noFilter)
			filter = filter.toLowerCase();
		var request = this.readTransaction(["stories"], function() {
			data.sort(pubdateSort);
			if(feed.feedType < feedTypes.ftUnknown) {
				self.getFeeds(null, function(feeds) {
					function getFeed(fid) {
						for(var i = 0; i < feeds.length; i++) {
							if(feeds[i].id == fid)
								return feeds[i];
						}
						return null;
					}
					for(var i = 0; i < data.length; i++) {
						var aFeed = getFeed(data[i].fid);
						data[i].feedType = aFeed.feedType;
						data[i].feedTitle = aFeed.title;
						data[i].feedOrder = aFeed.feedOrder;
					}
					if((feed.sortMode & 0xFF00) != 0x0100) {
						data.sort(feedOrderSort);
					}
					onSuccess(data);
				});
			} else {
				// Is is not needed to retrieve information about the feed if only
				// a single feeds stories are requested.
				onSuccess(data);
			}
		}, onFail).objectStore("stories");

		switch(feed.feedType) {
			case feedTypes.ftStarred:
			case feedTypes.ftAllItems:
				request = request.openCursor();
				break;
			default:
				request = request.index("fid").openCursor(this.boundOnly(feed.id));
				break;
		}

		var showMode = feed.sortMode & 0xFF;
		request.onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				if(feed.feedType != feedTypes.ftStarred || cursor.value.isStarred) {
					if((showMode == 0) ||
						((showMode == 1) && (!cursor.value.isRead)) ||
						((showMode == 2) && (cursor.value.isNew))) {
						if(noFilter ||
							(cursor.value.title.toLowerCase().indexOf(filter) >= 0) ||
							(cursor.value.summary.toLowerCase().indexOf(filter) >= 0))
							data.push(self.cloneWhenNeeded(cursor.value, Story));
					}
				}
				cursor.continue();
			}
		}
	},

	/**
	 * Retrieve a list of urls of stories.
	 *
	 * @param	feed		{Object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getFeedURLList: function(feed, onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getFeedURLList needs data handler");
		onFail = onFail || this.errorHandler;

		var data = [];
		var request = this.readTransaction(["stories"], function() {
			data.sort(pubdateSort);
			onSuccess(data);
		}, onFail).objectStore("stories");

		switch(feed.feedType) {
			case feedTypes.ftStarred:
			case feedTypes.ftAllItems:
				request = request.openCursor();
				break;
			default:
				request = request.index("fid").openCursor(this.boundOnly(feed.id));
				break;
		}

		request.onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				if(feed.feedType != feedTypes.ftStarred || cursor.value.isStarred) {
					var urls = cursor.value.url;
					for(var i = 0; i < urls.length; i++) {
						data.push({
							title:		cursor.value.title,
							url:		urls[i].href,
							pubdate:	cursor.value.pubdate
						});
					}
				}
				cursor.continue();
			}
		}
	},

	/**
	 * Retrieve a story.
	 *
	 * @param	id		{Integer}		story id
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getStory: function(id, onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getStory needs data handler");
		onFail = onFail || this.errorHandler;

		var self = this;
		this.readTransaction(["stories"], null, onFail).objectStore("stories").get(id).onsuccess = function(event) {
			var result = event.target.result;
			self.getFeed(result.fid, function(feed) {
				onSuccess(feed, result, result.url);
			});
		}
	},

	_findStory: function(allStories, storyToFind) {
		for(var i = 0; i < allStories.length; i++) {
			if(allStories[i].uuid == storyToFind.uuid)
				return i;
		}
		return undefined;
	},

	/**
	 * Called update the feed, when new stories have arrived.
	 *
	 * @param 	feed			{object}		feed object
	 * @param 	stories			{Array}			stories received
	 * @param 	wasSuccesful	{bool}			indicate whether the retrieval was successful
	 * @param	onSuccess		{function}		function to be called on success
	 * @param	onFail			{function}		function to be called on failure
	 */
	updateStories: function(feed, stories, wasSuccesful, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var self = this, storiesToDelete = [], i;
		var deltaNew = 0, deltaUnread = 0;
		var starDeltaNew = 0, starDeltaUnread = 0;
		var date = new Date();
		var keepthreshold = date.getTime() - (enyo.application.prefs.storyKeepTime * 60 * 60 * 1000);
		var newthreshold = date.getTime() - (24 * 60 * 60 * 1000);

		var transaction = this.writeTransaction(["stories", "feeds"], onSuccess, onFail);
		var storyStore = transaction.objectStore("stories");
		var feedStore = transaction.objectStore("feeds");

		storyStore.index("fid").openCursor(this.boundOnly(feed.id)).onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var story = cursor.value;

				// Check, whether the story is still in the feed.
				var newStoryIndex = self._findStory(stories, story);
				if((story.pubdate < keepthreshold) && (!story.isStarred) && wasSuccesful) {
					// Do story count accounting. The star counts won't be bothered,
					// as starred stories won't be deleted.
					if(story.isNew)
						deltaNew--;
					if(!story.isRead)
						deltaUnread--;

					// The story is old and not starred, it should no longer be displayed.
					// If the story is still in the feed, we mark it deleted, otherwise we
					// delete it from the database.
					if(newStoryIndex !== undefined) {
						story.deleted = 1;
						storyStore.put(story);
					} else {
						storiesToDelete.push(story);
					}
				} else {
					if(newStoryIndex !== undefined) {
						// If the story is still in the feed, remove it from the new stories
						// array, as we do not need to insert it afterwards.
						var newStory = stories[newStoryIndex];
						stories.splice(newStoryIndex, 1);

						// Update the story contents.
						story.title = newStory.title;
						story.summary = newStory.summary;
						story.picture = newStory.picture;
						story.audio = newStory.audio;
						story.video = newStory.video;
						story.url = [];
						if(newStory.url) {
							for(i = 0; i < newStory.url.length; i++) {
								story.url.push(new URL(newStory.url[i]));
							}
						}
					}

					// Update new flag and do accounting.
					if((story.pubdate < newthreshold) && (story.isRead == 1)) {
						if(story.isNew)
							deltaNew--;
						if(story.isStarred)
							starDeltaNew--;
						story.isNew = 0;
					}

					// Save the story.
					storyStore.put(story);
				}

				cursor.continue();
			} else  {
				// Delete stories that are no longer in the feed.
				for(i = 0; i < storiesToDelete.length; i++)
					storyStore.delete(storiesToDelete[i].id);

				// Insert stories that are new in the feed.
				for(i = 0; i < stories.length; i++) {
					// If the story is new in the feed, but for whatever reason
					// is older than the keep time, we simply ignore it.
					if(stories[i].pubdate < keepthreshold)
						continue;

					stories[i].fid = feed.id;
					stories[i].isNew = stories[i].pubdate >= newthreshold;
					stories[i].isRead = false;
					stories[i].isStarred = false;
					deltaUnread++;
					if(stories[i].isNew)
						deltaNew++;
					storyStore.put(stories[i]);
				}

				// And now apply the new counts to the feeds.
				if((deltaNew != 0) || (deltaUnread != 0)) {
					feedStore.get(feed.id).onsuccess = enyo.bind(self, self.updateFeedCount, feedStore,
						deltaUnread, deltaNew);
					feedStore.index("feedType").get(feedTypes.ftAllItems).onsuccess = enyo.bind(self,
						self.updateFeedCount, feedStore, deltaUnread, deltaNew);
				}
				if((starDeltaNew != 0) || (starDeltaUnread != 0)) {
					feedStore.index("feedType").get(feedTypes.ftStarred).onsuccess = enyo.bind(self,
						self.updateFeedCount, feedStore, starDeltaUnread, starDeltaNew);
				}
			}
		}
	},

	/**
	 * Set the starred flag of a story.
	 *
	 * @param	story		{Object}		story object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	markStarred: function(story, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var transaction = this.writeTransaction(["feeds", "stories"], onSuccess, onFail);
		var stories = transaction.objectStore("stories");

		var self = this;
		stories.get(story.id).onsuccess = function(event) {
			var original = event.target.result;
			if(original.isStarred == story.isStarred)
				return;

			original.isStarred = story.isStarred;
			stories.put(original);
			if(!story.isRead || story.isNew) {
				var deltaUnread = !story.isRead ? 1 : 0;
				var deltaNew = story.isNew ? 1 : 0;

				// If the story was starred before, the counts need to be decreased, so
				// simply multiply them by -1.
				if(!story.isStarred) {
					deltaNew *= -1;
					deltaUnread *= -1;
				}

				var feeds = transaction.objectStore("feeds");
				var feedupdater = enyo.bind(self, self.updateFeedCount, feeds, deltaUnread, deltaNew);
				feeds.index("feedType").get(feedTypes.ftStarred).onsuccess = feedupdater;
			}
		};
	},

	/**
	 * Reset the starred flag all stories of a feed.
	 *
	 * @param	feed		{Object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	markAllUnStarred: function(feed, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var transaction = this.writeTransaction(["feeds", "stories"], onSuccess, onFail);
		var feeds = transaction.objectStore("feeds");
		var stories = transaction.objectStore("stories");
		var self = this;

		var req = stories;
		if(feed.feedType >= feedTypes.ftUnknown) {
			req = req.index("fid").openCursor(this.boundOnly(feed.id));
		} else {
			if(feed.feedType == feedTypes.ftStarred) {
				feed.numNew = feed.numUnRead = 0;
				feeds.put(self.cloneWhenNeeded(feed, Feed));
			}
			req = req.openCursor();
		}

		req.onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var story = cursor.value;
				if(story.isStarred) {
					story.isStarred = false;
					stories.put(self.cloneWhenNeeded(story, Story));
				}
				cursor.continue();
			}
		};
	},

	/**
	 * Mark a story as being read.
	 *
	 * @param	story		{Object}		story object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	markStoryRead: function(story, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		if(story.isRead) {
			onSuccess();
			return;
		}

		var transaction = this.writeTransaction(["feeds", "stories"], onSuccess, onFail);
		var stories = transaction.objectStore("stories");
		var feeds = transaction.objectStore("feeds");
		var feedupdater = enyo.bind(this, this.updateFeedCount, feeds,
			story.isRead ? 0 : -1, story.isNew ? -1 : 0);

		story.isRead = true;
		story.isNew = false;
		stories.put(story);

		feeds.get(story.fid).onsuccess = feedupdater;
		feeds.index("feedType").get(feedTypes.ftAllItems).onsuccess = feedupdater;
		if(story.isStarred)
			feeds.index("feedType").get(feedTypes.ftStarred).onsuccess = feedupdater;
	},

	/**
	 * Mark all stories of a feed as being read or unread.
	 *
	 * @param	feed		{Object}		feed object
	 * @param	state		{boolean}		state of the flag
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	markAllRead: function(feed, state, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var transaction = this.writeTransaction(["feeds", "stories"], onSuccess, onFail);
		var feeds = transaction.objectStore("feeds");
		var stories = transaction.objectStore("stories");
		var request = null;

		switch(feed.feedType) {
			case feedTypes.ftStarred:
			case feedTypes.ftAllItems:
				request = stories.openCursor();
				break;
			default:
				request = stories.index("fid").openCursor(this.boundOnly(feed.id));
				break;
		}

		state = !!state;
		var increment = state ? -1 : 1;
		var deltaUnread = { total: 0, starred: 0 };
		var deltaNew = { total: 0, starred: 0 };
		var self = this;

		function incCount(counter, story, inc) {
			counter["total"] = counter["total"] + inc;
			if(story.isStarred)
				counter["starred"] = counter["starred"] + inc;

			var fid = story.fid;
			if(!counter[fid]) {
				counter[fid] = inc;
			} else {
				counter[fid] += inc;
			}
		}

		function updateFeeds(event) {
			var cursor = event.target.result;
			if(cursor) {
				var feed = cursor.value;
				var key = feed.feedType == feedTypes.ftAllItems ? "total"
					: feed.feedType == feedTypes.ftStarred ? "starred"
					: feed.id;
				var deltaNewCount = deltaNew[key];
				var deltaUnreadCount = deltaUnread[key];
				if(deltaUnreadCount)
					self.doUpdateFeedCount(feeds, deltaUnreadCount, deltaNewCount, feed);

				cursor.continue();
			}
		}

		request.onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var story = cursor.value;

				// Skip stories that should not be changed.
				if((state == (!!story.isRead)) || ((feed.feedType == feedTypes.ftStarred) && !story.isStarred)) {
					cursor.continue();
					return;
				}

				// Set new state and account changes.
				story.isRead = state;
				incCount(deltaUnread, story, increment);
				if(state && story.isNew) {
					story.isNew = false;
					incCount(deltaNew, story, increment);
				}

				stories.put(story);
				cursor.continue();
			} else {
				feeds.openCursor().onsuccess = updateFeeds;
			}
		};
	},

	/**
	 * Delete a story.
	 * This does no "real" delete as the item would possibly come back on the next
	 * update. Instead, the story is marked as being deleted and will not
	 * be selected again.
	 *
	 * @param	story		{object}		story to delete
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	deleteStory: function(story, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var transaction = this.writeTransaction(["feeds", "stories"], onSuccess, onFail);
		var stories = transaction.objectStore("stories");
		var feeds = transaction.objectStore("feeds");

		story.deleted = 1;
		stories.put(story);
		if(story.isNew || !story.isRead) {
			var feedupdater = enyo.bind(this, this.updateFeedCount, feeds,
				story.isRead ? 0 : -1, story.isNew ? -1 : 0);
			feeds.get(story.fid).onsuccess = feedupdater;
			feeds.index(feedType).get(feedTypes.ftAllItems).onsuccess = feedupdater;
			if(story.isStarred)
				feeds.index("feedType").get(feedTypes.ftStarred).onsuccess = feedupdater;
		}
	}
});