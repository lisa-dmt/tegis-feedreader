/*
 *		source/models/indexeddb.js - Database functions
 *
 * The classes defined here communicate with the FeedReader IndexedDB
 * database.
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

		if(enyo.application.prefs.updateOnStart || enyo.application.feeds.updateWhenReady) {
			enyo.application.feeds.updateWhenReady = false;
			enyo.Signals.send("onUpdateAll");
		}

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
		stories.createIndex("isNew", "isNew", { unique: false });
		stories.createIndex("isRead", "isRead", { unique: false });
		stories.createIndex("isStarred", "isStarred", { unique: false });

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
		cats.index("feedOrder").openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var cat = cursor.value;
				result.push(new Category(cat));
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
				catStore.put(new Category(cats[i]));
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
		feeds.put(feed).onsuccess = function(event) {
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
			feed = new Feed(feed);
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
				feedsStore.put(new Feed(feeds[i]));
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
		var feeds = this.readTransaction(["feeds"], function() {
			onSuccess(result);
		}, onFail).objectStore("feeds");
		feeds.index("feedOrder").openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var feed = cursor.value;
				if(!filter || (filter == "") || (feed.title.indexOf(filter)))
					result.push(new Feed(feed));
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
		var stories = this.readTransaction(["stories"], function() {
			onSuccess(count);
		}, onFail).objectStore("stories");
		stories.index("isNew").openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				count++;
				cursor.continue();
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
						var feed = getFeed(data[i].fid);
						data[i].feedType = feed.feedType;
						data[i].feedTitle = feed.title;
						data[i].feedOrder = feed.feedOrder;
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
				request = request.index("isStarred").openCursor();
				break;
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
				if((showMode == 0) ||
					((showMode == 1) && (!cursor.value.isRead)) ||
					((showMode == 1) && (!cursor.value.isNew))) {
					data.push(new Story(cursor.value));
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
		}, onFail);

		switch(feed.feedType) {
			case feedTypes.ftStarred:
				request = request.index("isStarred");
				break;
			default:
				request = request.index("fid");
				break;
		}

		request.openCursor().onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var urls = cursor.value.url;
				for(var i = 0; i < urls.length; i++) {
					data.push({
						title:		urls[i].title,
						url:		urls[i].href,
						pubdate:	cursor.value.pubdate
					});
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

	/**
	 * Called to indicate a beginning update.
	 *
	 * @param 	feed		{object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	beginStoryUpdate: function(feed, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;
		var nullData = this.nullData;

		var date = new Date();
		var keepthreshold = date.getTime() - (enyo.application.prefs.storyKeepTime * 60 * 60 * 1000);
		var newthreshold = date.getTime() - (24 * 60 * 60 * 1000);

		var stories = this.writeTransaction(["stories"], onSuccess, onFail).objectStore("stories")
		stories.index("fid").openCursor(this.boundOnly(feed.id)).onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var story = cursor.value;
				if((story.pubdate < newthreshold) && (story.isRead == 1))
					story.isNew = 0;
				if((story.isStarred == 0) && ((story.isRead == 1) || (story.pubdate < keepthreshold)))
					story.flag = 1;
				stories.put(story);
				cursor.continue();
			}
		}
	},

	/**
	 * Called to indicate a finished update.
	 *
	 * @param 	feed		{object}		feed object
	 * @param	successful	{bool}			update was successful?
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	endStoryUpdate: function(feed, successful, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var newUnreadCount = 0, unreadStarDelta = 0;
		var newNewCount = 0, newStarDelta = 0;

		var self = this;
		var transaction = this.writeTransaction(["stories", "feeds"], onSuccess, onFail);
		var stories = transaction.objectStore("stories");
		var feeds = transaction.objectStore("feeds");

		function updateFeed(event) {
			var oldFeed = event.target.result;
			var oldUnreadCount = oldFeed.numUnRead;
			var oldNewCount = oldFeed.numNew;

			// Update feed information.
			oldFeed.numUnRead = feed.numUnRead = newUnreadCount;
			oldFeed.numNew = feed.numNew = newNewCount;
			feeds.put(oldFeed);

			// Calculate delta.
			var deltaUnread = newUnreadCount - oldUnreadCount;
			var deltaNew = newNewCount - oldNewCount;

			// Update feed aggregations.
			feeds.index("feedType").get(feedTypes.ftAllItems).onsuccess = enyo.bind(self, self.updateFeedCount,
																					feeds, deltaUnread, deltaNew);
			if((unreadStarDelta > 0) || (newStarDelta > 0))
				feeds.index("feedType").get(feedTypes.ftStarred).onsuccess = enyo.bind(self, self.updateFeedCount,
																					   feeds, -unreadStarDelta,
																					   -newStarDelta);
		}

		stories.index("fid").openCursor(this.boundOnly(feed.id)).onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var story = cursor.value;
				if(story.flag) {
					if(successful) {
						stories.delete(story.id);
					} else {
						delete story.flag;
						stories.put(story);
						if(story.isStarred) {
							if(!story.isRead)
								unreadStarDelta++;
							if(story.isNew)
								newStarDelta++;
						}
					}
				}
				if(!story.flag || !successful) {
					if(story.isNew)
						newNewCount++;
					if(!story.isRead)
						newUnreadCount++;
				}
				cursor.continue();
			} else {
				feeds.get(feed.id).onsuccess = updateFeed;
			}
		}
	},

	/**
	 *
	 * @param feed          {object}    feed to which the stories belong
	 * @param stories       {Array}     Stories to be inserted or updated
	 * @param onSuccess     {function}  function to call on success
	 * @param onFail        {function}  function to call on failure
	 */
	updateStories: function(feed, stories, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var transaction = this.writeTransaction(["feeds", "stories"], onSuccess, onFail);
		var feeds = transaction.objectStore("feeds");
		var storyStore = transaction.objectStore("stories");

		var allStories = [];

		// Helper function.
		function findStory(story) {
			for(var i = 0; i < allStories.length; i++) {
				if(allStories[i].uuid == story.uuid)
					return i;
			}
			return undefined;
		}

		// Collect all stories and when we have them, update existing stories
		// and insert new ones.
		storyStore.index("fid").openCursor(this.boundOnly(feed.id)).onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				allStories.push(cursor.value);
				cursor.continue();
			} else {
				for(var i = 0; i < stories.length; i++) {
					stories[i].fid = feed.id;
					var index = findStory(allStories[i]);
					if(index !== undefined) {
						stories[i].id = allStories[index].id;
						stories[i].isNew = allStories[index].isNew;
						stories[i].isRead = allStories[index].isRead;
					} else {
						stories[i].isNew = true;
						stories[i].isRead = false;
					}
					storyStore.put(stories[i]);
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

		if(story.isStarred) {
			onSuccess();
			return;
		}

		var transaction = this.writeTransaction(["feeds", "stories"], onSuccess, onFail);
		var stories = transaction.objectStore("stories");

		story.isStarred = true;
		stories.put(story);
		if(!story.isRead || story.isNew) {
			var deltaUnread = !story.isRead ? 1 : 0;
			var deltaNew = story.isNew ? 1 : 0;

			var feeds = transaction.objectStore("feeds");
			var feedupdater = enyo.bind(this, this.updateFeedCount, feeds, deltaUnread, deltaNew);
			feeds.index("feedType").get(feedTypes.ftStarred).onsuccess = feedupdater;
		}
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

		var req = stories;
		if(feed.feedType >= feedTypes.ftUnknown) {
			req = req.index("fid").openCursor(this.boundOnly(feed.id));
		} else {
			if(feed.feedType == feedTypes.ftStarred) {
				feed.newCount = feed.numUnRead = 0;
				feeds.put(feed);
			}
			req = req.openCursor();
		}

		req.onsuccess = function(event) {
			var cursor = event.target.result;
			if(cursor) {
				var story = cursor.result;
				if(story.isStarred) {
					story.isStarred = false;
					stories.put(story);
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

		state = state ? 1 : 0;

		this.writeTransaction(function(transaction) {
			switch(feed.feedType) {
				case feedTypes.ftAllItems:
					transaction.executeSql("UPDATE stories SET isRead = ?, isNew = 0",
						[state], onSuccess, onFail);
					break;

				case feedTypes.ftStarred:
					transaction.executeSql("UPDATE stories SET isRead = ?, isNew = 0 WHERE isStarred = 1",
						[state], onSuccess, onFail);
					break;

				default:
					transaction.executeSql("UPDATE stories SET isRead = ?, isNew = 0 WHERE fid = ?",
						[state, feed.id], onSuccess, onFail);
					break;
			}
		});
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