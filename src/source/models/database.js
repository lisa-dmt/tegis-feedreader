/*
 *		source/models/database.js - Database functions
 *
 * The classes defined here communicate with the FeedReader SQLite
 * database.
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

/** @private
 *
 * Common SQL statements.
 */
var commonSQL = {
	csGetFeedData:	"SELECT COALESCE(SUM(isNew), 0) AS numNew, COALESCE((COUNT(uuid) - SUM(isRead)), 0) AS numUnRead, feeds.*" +
					"  FROM feeds" +
					"  LEFT JOIN stories" +
					"    ON (stories.fid = feeds.id) OR (feeds.feedType = ? AND stories.isStarred = 1) OR (feeds.feedType = ?) ",
	csGetStoryIDs:	"SELECT id" +
					"  FROM stories",
	csSetVersion:	"INSERT INTO system (version) VALUES (?)"
};

/**
 * This class is the main database class. All database communication
 * is centralized here.
 * The feed list class encapsulated an object of this class.
 */
enyo.kind({

	name:				"WebSQLDatabase",
	kind:				enyo.Component,

	db:					null,
	openTransactions:	0,
	isReady:			false,

	updateSqls:			[
	],

	/** @private
	 *
	 * Constructor.
	 */
	create: function() {
		this.inherited(arguments);

		// Transaction handlers.
		this.transactionSuccess = enyo.bind(this, this.transactionSuccess);
		this.transactionFailed = enyo.bind(this, this.transactionFailed);

		// Pre-bind query handlers.
		this.nullData = enyo.bind(this, this.nullData);
		this.errorHandler = enyo.bind(this, this.errorHandler);
		var checkVersion = enyo.bind(this, this.checkVersion);
		var initDB = enyo.bind(this, this.initDB);

		try {
			this.db = enyo.openDatabase();
            this.transactionManager = new TransactionManager(this.db, this.transactionSuccess, this.transactionFailed);

			this.writeTransaction(function(transaction) {
				transaction.executeSql("SELECT MAX(version) AS version FROM system",
									   [], checkVersion, initDB);
			});
		} catch(e) {
			this.error("DB> exception", e);
		}
	},

	/** @private
	 *
	 * Open a read/write transaction.
	 *
	 * @param	fnc			{function}		function to be called with opened transaction
	 */
	writeTransaction: function(fnc) {
        this.openTransactions++;
        this.transactionManager.writeTransaction(fnc);
	},

    /** @private
     *
     * Open a read-only transaction.
     *
     * @param	fnc			{function}		function to be called with opened transaction
     */
    readTransaction: function(fnc) {
        this.openTransactions++;
        this.transactionManager.readTransaction(fnc);
    },

	/** @private
	 *
	 * Event handler for failed transactions.
	 *
	 * @param	error		{Object}		error object
	 */
	transactionFailed: function(error) {
		this.error("DB> Transaction failed; error code:", error.code, "; message:", error.message);
		this.openTransactions--;
	},

	/** @private
	 *
	 * Event handler for successful transactions.
	 */
	transactionSuccess: function() {
		this.openTransactions--;
	},

	/** @private
	 *
	 * Called when opening the database succeeds.
	 */
	dbReady: function() {
		this.log("DB> Database schema ready");

		if(enyo.application.prefs.updateOnStart || enyo.application.feeds.updateWhenReady) {
			enyo.application.feeds.updateWhenReady = false;
            enyo.Signals.send("onUpdateAll");
		}

		this.isReady = true;
        enyo.Signals.send("onDbReady");
	},

	/** @private
	 *
	 * Create the database schema.
	 *
	 * @param	transaction	{Object}		transaction object
	 */
	initDB: function(transaction) {
		try {
			this.log("DB> initializing database");

			// Create the categories table.
			transaction.executeSql('CREATE TABLE categories (' +
								   '  id INTEGER PRIMARY KEY,' +
								   '  catOrder INTEGER NOT NULL,' +
								   '  title TEXT)',
								   [], this.nullData, this.errorHandler);

			// Create the feed table.
			transaction.executeSql('CREATE TABLE feeds (' +
								   '  id INTEGER PRIMARY KEY,' +
								   '  title TEXT DEFAULT "RSS Feed",' +
								   '  url TEXT NOT NULL,' +
								   '  feedType INTEGER NOT NULL,' +
								   '  feedOrder INTEGER NOT NULL,' +
								   '  enabled BOOL NOT NULL,' +
								   '  showPicture BOOL NOT NULL,' +
								   '  showMedia BOOL NOT NULL,' +
								   '  showListSummary BOOL NOT NULL,' +
								   '  showListCaption BOOL NOT NULL,' +
								   '  showDetailSummary BOOL NOT NULL,' +
								   '  showDetailCaption BOOL NOT NULL,' +
								   '  sortMode INTEGER NOT NULL,' +
								   '  allowHTML BOOL NOT NULL,' +
								   '  fullStory BOOL NOT NULL,' +
								   '  username TEXT,' +
								   '  password TEXT,' +
								   '  category INT NOT NULL DEFAULT 0)',
								   [], this.nullData, this.errorHandler);

			// Create the story table.
			transaction.executeSql('CREATE TABLE stories (' +
								   '  id INTEGER PRIMARY KEY,' +
								   '  fid INT NOT NULL CONSTRAINT fk_stories_fid' +
								   '    REFERENCES feeds(id)' +
								   '    ON DELETE CASCADE ON UPDATE CASCADE,' +
								   '  uuid TEXT,' +
								   '  title TEXT,' +
								   '  summary TEXT,' +
								   '  picture TEXT,' +
								   '  audio TEXT,' +
								   '  video TEXT,' +
								   '  isRead BOOL NOT NULL DEFAULT 0,' +
								   '  isNew BOOL NOT NULL DEFAULT 1,' +
								   '  isStarred BOOL NOT NULL DEFAULT 0,' +
								   '  pubdate INT NOT NULL,' +
								   '  flag BOOL NOT NULL DEFAULT 0,' +
								   '  deleted BOOL NOT NULL DEFAULT 0)',
								   [], this.nullData, this.errorHandler);
			transaction.executeSql('CREATE UNIQUE INDEX idx_stories_fid_uuid' +
								   '  ON stories (fid, uuid)',
								   [], this.nullData, this.errorHandler);

			// The storyurls table takes up the urls.
			transaction.executeSql('CREATE TABLE storyurls (' +
								   '  id INTEGER PRIMARY KEY,' +
								   '  sid INT NOT NULL CONSTRAINT fk_storyurls_sid' +
								   '    REFERENCES stories(id)' +
								   '    ON DELETE CASCADE ON UPDATE CASCADE,' +
								   '  title TEXT,' +
								   '  href TEXT)',
								   [], this.nullData, this.errorHandler);

			// Create triggers.
			transaction.executeSql("CREATE TRIGGER categories_after_insert AFTER INSERT ON categories" +
								   "  BEGIN" +
								   "    UPDATE categories" +
								   "      SET catOrder = (SELECT MAX(catOrder) + 1 FROM categories)" +
								   "      WHERE id = NEW.id" +
								   "        AND catOrder = -1;" +
								   "  END", [], this.nullData, this.errorHandler);
			transaction.executeSql("CREATE TRIGGER cat_after_delete AFTER DELETE ON categories" +
								   "  BEGIN" +
								   "    UPDATE categories SET catOrder = catOrder - 1 WHERE catOrder > old.catOrder;" +
								   "    UPDATE feeds SET category = 0 WHERE category = old.id;" +
								   "  END", [], this.nullData, this.errorHandler);
			transaction.executeSql("CREATE TRIGGER feeds_after_insert AFTER INSERT ON feeds" +
								   "  BEGIN" +
								   "    UPDATE feeds" +
								   "      SET feedOrder = (SELECT MAX(feedOrder) + 1 FROM feeds)" +
								   "      WHERE id = NEW.id" +
								   "        AND feedOrder = -1;" +
								   "  END", [], this.nullData, this.errorHandler);
			transaction.executeSql("CREATE TRIGGER feeds_after_delete AFTER DELETE ON feeds" +
								   "  BEGIN" +
								   "    UPDATE feeds SET feedOrder = feedOrder - 1 WHERE feedOrder > old.feedOrder;" +
								   "    DELETE FROM stories WHERE fid = old.id;" +
								   "  END", [], this.nullData, this.errorHandler);
			transaction.executeSql("CREATE TRIGGER stories_after_delete AFTER DELETE ON stories" +
								   "  BEGIN" +
								   "    DELETE FROM storyurls WHERE sid = old.id;" +
								   "  END", [], this.nullData, this.errorHandler);
			transaction.executeSql("CREATE TRIGGER stories_after_insert AFTER INSERT ON stories" +
								   "  BEGIN" +
								   "    DELETE FROM stories" +
								   "      WHERE NOT fid IN (SELECT id FROM feeds);" +
								   "  END", [], this.nullData, this.errorHandler);

			// Create the system table. It currently contains nothing but the version.
			transaction.executeSql('CREATE TABLE system (version INTEGER)',
								   [], this.nullData, this.errorHandler);
			transaction.executeSql('INSERT INTO system (version) VALUES(14)',
								   [], this.nullData, this.errorHandler);

			// Insert default categories.
			transaction.executeSql('INSERT INTO categories (id, title, catOrder) VALUES(0, "Uncategorized", 1)',
								   [], this.nullData, this.errorHandler);
			transaction.executeSql('INSERT INTO categories (id, title, catOrder) VALUES(1, "Aggregations", 0)',
								   [], this.nullData, this.errorHandler);

			// Insert aggregated feeds with default settings.
			transaction.executeSql('INSERT INTO feeds (title, url, feedType, feedOrder, enabled, showPicture,' +
								   '                   showMedia, showListSummary, showListCaption,'+
								   '                   showDetailSummary, showDetailCaption, sortMode, allowHTML,' +
								   '                   fullStory, username, password, category)' +
								   '  VALUES(?, "starred", ?, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, "", "", 1)',
								   ['Starred Items', feedTypes.ftStarred],
								   this.nullData, this.errorHandler);
			transaction.executeSql('INSERT INTO feeds (title, url, feedType, feedOrder, enabled, showPicture,' +
								   '                   showMedia, showListSummary, showListCaption,'+
								   '                   showDetailSummary, showDetailCaption, sortMode, allowHTML,' +
								   '                   fullStory, username, password, category)' +
								   '  VALUES(?, "allItems", ?, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, "", "", 1)',
								   ['All Items', feedTypes.ftAllItems],
								   this.nullData, this.errorHandler);
			this.dbReady();
		} catch(e) {
			this.error("DB EXCEPTION>", e);
		}
	},

	/** @private
	 *
	 * Check the database version and upgrade if necessary.
	 *
	 * @param	transaction		{Object}	transaction object
	 * @param	result			{Object}	database result object
	 */
	checkVersion: function(transaction, result) {
		var version = result.rows.item(0).version;
		var destVer = version;
		var sqls = [];

		this.log("DB> Database already exists, version is:", version);

		for(var i = 0; i < this.updateSqls.length; i++) {
			if(this.updateSqls[i].version > destVer) {
				sqls = sqls.concat(this.updateSqls[i].sqls);
				destVer = this.updateSqls[i].version;
			}
		}

		if(destVer > version) {
			this.log("DB> Updating to schema version", destVer);
			var onSuccess = this.nullData;
			var onFail = this.errorHandler;

			for(i = 0; i < sqls.length; i++) {
				this.log("DB>", sqls[i]);
				transaction.executeSql(sqls[i], [], onSuccess, onFail);
			}
			transaction.executeSql(commonSQL.csSetVersion, [destVer],
								   onSuccess, onFail);
		}

		this.dbReady();
	},

	/** @private
	 *
	 * Default data handler. Does nothing.
	 *
	 * @param	transaction	{Object}		transaction object
	 * @param	result		{Object}		database result object
	 */
	nullData: function(transaction, result) {
	},

	/** @private
	 *
	 * Default error handler.
	 *
	 * @param	transaction	{Object}		transaction object
	 * @param	error		{Object}		error object
	 */
	errorHandler: function(transaction, error) {
		this.error("DB query failed>", error.message);
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

		this.writeTransaction(function(transaction) {
			transaction.executeSql("DELETE FROM categories WHERE id = ?",
				[category.id], onSuccess, onFail);
		});
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

		var count = 0;
		var successWrapper = function() {
			if(++count > 3) {
				enyo.log("DB> category order successfully changed from", oldOrder, "to", newOrder);
				onSuccess();
			}
		};

		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE categories SET catOrder = -1 WHERE catOrder = ?",
								   [oldOrder], successWrapper, onFail);
			transaction.executeSql("UPDATE categories SET catOrder = catOrder - 1 WHERE catOrder > ?",
								   [oldOrder], successWrapper, onFail);
			transaction.executeSql("UPDATE categories SET catOrder = catOrder + 1 WHERE catOrder >= ?",
								   [newOrder], successWrapper, onFail);
			transaction.executeSql("UPDATE categories SET catOrder = ? WHERE catOrder = -1",
								   [newOrder], successWrapper, onFail);
		});
	},

	/**
	 * Add a feed or edit a feed's properties.
	 *
	 * @param	feed		{Object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	addOrEditFeed: function(feed, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var id = feed.id || null;

		var doUpdate = function(transaction) {
			enyo.log("DB> Updating feed, id is", id);
			transaction.executeSql('UPDATE feeds SET title = ?, url = ?, feedType = ?, feedOrder = ?, ' +
								   '    enabled = ?, showPicture = ?, showMedia = ?, showListSummary = ?,' +
								   '    showListCaption = ?, showDetailSummary = ?, showDetailCaption = ?,' +
								   '    sortMode = ?, allowHTML = ?, username = ?, password = ?, fullStory = ?,' +
								   '    category = ?' +
								   '  WHERE id = ?',
								   [feed.title, feed.url, feed.feedType, feed.feedOrder,
									feed.enabled ? 1 : 0,
									feed.showPicture ? 1 : 0, feed.showMedia ? 1 : 0,
									feed.showListSummary ? 1 : 0, feed.showListCaption ? 1 : 0,
									feed.showDetailSummary ? 1 : 0, feed.showDetailCaption ? 1 : 0,
									feed.sortMode, feed.allowHTML ? 1 : 0, feed.username,
									feed.password, feed.fullStory ? 1 : 0,
									feed.category ? feed.category : 0, id],
								   function(transaction, result) {
										onSuccess(feed);
								   },
								   onFail);
		};

		var getID = function(transaction, result) {
			var f = new Feed(feed);
			transaction.executeSql("SELECT last_insert_rowid() AS id", [],
				function(transaction, result) {
					if(result.rows.length > 0) {
						f.id = result.rows.item(0).id;
						onSuccess(f);
					}
				}, onFail);
		};

		var doInsert = function(transaction) {
			enyo.log("DB> inserting new feed");
			transaction.executeSql('INSERT INTO feeds (title, url, feedType, feedOrder,' +
								   '    enabled, showPicture, showMedia, showListSummary,' +
								   '    showListCaption, showDetailSummary, showDetailCaption,' +
								   '    sortMode, allowHTML, username, password, fullStory, category)' +
								   '  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
								   [feed.title, feed.url, feed.feedType, -1,
									feed.enabled ? 1 : 0,
									feed.showPicture ? 1 : 0, feed.showMedia ? 1 : 0,
									feed.showListSummary ? 1 : 0, feed.showListCaption ? 1 : 0,
									feed.showDetailSummary ? 1 : 0, feed.showDetailCaption ? 1 : 0,
									feed.sortMode, feed.allowHTML ? 1 : 0, feed.username,
									feed.password, feed.fullStory ? 1 : 0, feed.category ? feed.category : 0],
									getID, onFail);
		};

		this.writeTransaction(function(transaction) {
			if(id !== null) {
				doUpdate(transaction);
			} else {
				doInsert(transaction);
			}
		});
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
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE feeds SET feedType = ? WHERE id = ?",
								   [type, feed.id], onSuccess, onFail);
		});
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
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE feeds SET sortMode = ? WHERE id = ?",
								   [feed.sortMode, feed.id], onSuccess, onFail);
		});
	},

	/**
	 * Disable a feed.
	 *
	 * @param 	feed		{object}		feed object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	disableFeed: function(feed, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE feeds SET feedType = ?, enabled = 0 WHERE id = ?",
								   [feedTypes.ftUnknown, feed.id], onSuccess, onFail);
		});
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

		this.log("DB> deleting feed", feed.id);

		this.writeTransaction(function(transaction) {
			transaction.executeSql("DELETE FROM feeds WHERE id = ?",
				[feed.id], onSuccess, onFail);
		});
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

		var count = 0;
		var successWrapper = function() {
			if(++count > 3) {
				enyo.log("DB> Feed order successfully changed from", oldOrder, "to", newOrder);
				onSuccess();
			}
		};

		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE feeds SET feedOrder = -1 WHERE feedOrder = ?",
								   [oldOrder], successWrapper, onFail);
			transaction.executeSql("UPDATE feeds SET feedOrder = feedOrder - 1 WHERE feedOrder > ?",
								   [oldOrder], successWrapper, onFail);
			transaction.executeSql("UPDATE feeds SET feedOrder = feedOrder + 1 WHERE feedOrder >= ?",
								   [newOrder], successWrapper, onFail);
			transaction.executeSql("UPDATE feeds SET feedOrder = ? WHERE feedOrder = -1",
								   [newOrder], successWrapper, onFail);
		});
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

		this.readTransaction(function(transaction) {
			transaction.executeSql("SELECT id, feedOrder, url, username, password" +
								   "  FROM feeds" +
								   "  WHERE feedType >= ? AND enabled = 1" +
								   "  ORDER BY feedOrder", [feedTypes.ftUnknown],
				function(transaction, result) {
					var list = [];
					for(var i = 0; i < result.rows.length; i++) {
						list.push(result.rows.item(i));
					}
					onSuccess(list);
				}, onFail);
		});
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
		this.readTransaction(
			function(transaction) {
				transaction.executeSql(commonSQL.csGetFeedData +
									   "  WHERE feeds.title LIKE '%' || ? || '%'" +
									   "  GROUP BY feeds.id" +
									   "  ORDER BY feedOrder",
					[feedTypes.ftStarred, feedTypes.ftAllItems, filter],
					function(transaction, result) {
						var list = [];
						for(var i = 0; i < result.rows.length; i++) {
							list.push(new Feed(result.rows.item(i)));
						}
						onSuccess(list);
					}, onFail);
			});
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
		this.readTransaction(
			function(transaction) {
				transaction.executeSql(commonSQL.csGetFeedData +
									   "  WHERE feeds.id = ?",
					[feedTypes.ftStarred, feedTypes.ftAllItems, id],
					function(transaction, result) {
						if(result.rows.length > 0) {
							onSuccess(new Feed(result.rows.item(0)));
						}
					}, onFail);
			});
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

		this.readTransaction(function(transaction) {
			transaction.executeSql("SELECT COUNT(*) AS newCount FROM stories WHERE (isNew = 1) AND (deleted = 0)", [],
				function(transaction, result) {
					if(result.rows.length > 0) {
						onSuccess(result.rows.item(0).newCount);
					} else {
						onSuccess(0);
					}
				}, onFail);
		});
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

		// This function will assemble the result set.
		var handleResult = function(transaction, result) {
			var list = [];
			for(var i = 0; i < result.rows.length; i++) {
				list.push(new Story(result.rows.item(i)));
			}
			onSuccess(list);
		};

		// Build the basic SELECT statement.
		var selectStmt = "SELECT s.*," +
						 "       f.title AS feedTitle, f.feedType AS feedType " +
						 "  FROM stories AS s" +
						 "  INNER JOIN feeds AS f ON (f.id = s.fid)" +
						 "  WHERE (s.title LIKE '%' || ? || '%')" +
						 "    AND (s.deleted = 0)";
		switch(feed.sortMode & 0xFF) {
			case 1:	selectStmt += " AND s.isRead = 0";	break;
			case 2: selectStmt += " AND s.isNew = 1";	break;
		}

		// Build the ORDER clause.
		var orderClause = " ORDER BY ";
		if((feed.sortMode & 0xFF00) != 0x0100) {
			orderClause += "f.feedOrder, ";
		}
		orderClause += "s.pubdate DESC";

		switch(feed.feedType) {
			case feedTypes.ftAllItems:
				this.readTransaction(function(transaction) {
					transaction.executeSql(selectStmt + orderClause,
										   [filter],
										   handleResult, onFail);
				});
				break;

			case feedTypes.ftStarred:
				this.readTransaction(function(transaction) {
					transaction.executeSql(selectStmt + " AND s.isStarred = 1" + orderClause,
										   [filter], handleResult, onFail);
				});
				break;

			default:
				this.readTransaction(function(transaction) {
					transaction.executeSql(selectStmt + " AND s.fid = ?" + orderClause,
										   [filter, feed.id],
										   handleResult, onFail);
				});
				break;
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

		// This function will assemble the result set.
		var handleResult = function(transaction, result) {
			var list = [];
			for(var i = 0; i < result.rows.length; i++) {
				list.push({
					title:	result.rows.item(i).title,
					url:	result.rows.item(i).href
				});
			}
			onSuccess(list);
		};

		// Build the basic SELECT statement.
		var selectStmt = "SELECT s.title, su.href" +
						 "  FROM stories AS s" +
						 "  INNER JOIN storyurls AS su ON (s.id = su.sid)";

		// Build the ORDER clause.
		var orderClause = " ORDER BY s.pubdate DESC";

		switch(feed.feedType) {
			case feedTypes.ftAllItems:
				this.readTransaction(function(transaction) {
					transaction.executeSql(selectStmt + orderClause,
										   [], handleResult, onFail);
				});
				break;

			case feedTypes.ftStarred:
				this.readTransaction(function(transaction) {
					transaction.executeSql(selectStmt + " WHERE s.isStarred = 1" + orderClause,
										   [], handleResult, onFail);
				});
				break;

			default:
				this.readTransaction(function(transaction) {
					transaction.executeSql(selectStmt + " WHERE s.fid = ?" + orderClause,
										   [feed.id],
										   handleResult, onFail);
				});
				break;
		}
	},

	/**
	 * Retrieve a story.
	 *
	 * @param	story		{Integer}		story id
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	getStory: function(id, onSuccess, onFail) {
		enyo.application.assert(onSuccess, "DB> getStory needs data handler");
		onFail = onFail || this.errorHandler;

		var urls = [];
		var feed = null;
		var story = null;

		var getURLs = function(transaction) {
			transaction.executeSql("SELECT title, href" +
								   "  FROM storyurls" +
								   "  WHERE sid = ?",
								   [id],
				function(transaction, result) {
					if(result.rows.length > 0) {
						for(var i = 0; i < result.rows.length; i++) {
							urls.push({
								title:	result.rows.item(i).title,
								href:	result.rows.item(i).href
							});
						}
					}
					onSuccess(feed, story, urls);
				}, onFail);
		};

		var getFeedData = function(transaction) {
			transaction.executeSql("SELECT *" +
								   "  FROM feeds" +
								   "  WHERE id = (" +
								   "    SELECT fid FROM stories WHERE id = ?)",
								   [id],
				function(transaction, result) {
					if(result.rows.length > 0) {
						feed = new Feed(result.rows.item(0));
						getURLs(transaction);
					} else {
						enyo.error("DB> Unable to retrieve feed for story", id);
					}
				}, onFail);
		};

		this.readTransaction(function(transaction) {
			transaction.executeSql("SELECT * FROM stories WHERE id = ?",
				[id],
				function(transaction, result) {
					if(result.rows.length > 0) {
						story = new Story(result.rows.item(0));
						getFeedData(transaction);
					} else {
						enyo.error("DB> Unable to retrieve story data of story", id);
					}
				}, onFail);
		});
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

		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE stories" +
								   "  SET isNew = 0" +
								   "  WHERE (isRead = 1" +
								   "    OR pubdate < ?)" +
								   "    AND fid = ?",
								   [newthreshold, feed.id],
								    nullData, onFail);
			transaction.executeSql("UPDATE stories" +
								   "  SET flag = 1" +
								   "  WHERE isStarred = 0"+
								   "    AND (isRead = 1" +
								   "    OR pubdate < ?)" +
								   "    AND fid = ?",
								   [keepthreshold, feed.id], onSuccess, onFail);
		});
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

		this.writeTransaction(function(transaction) {
			if(successful) {
				transaction.executeSql("DELETE FROM stories" +
									   "  WHERE flag = 1" +
									   "    AND isStarred = 0" +
									   "    AND fid = ?",
									   [feed.id], onSuccess, onFail);
			} else {
				transaction.executeSql("UPDATE stories" +
									   "  SET flag = 0" +
									   "  WHERE fid = ?",
									   [feed.id], onSuccess, onFail);
			}
		});
	},

	/**
	 * Add or edit a story.
	 *
	 * @param 	feed		{object}		feed object
	 * @param	story		{Object}		story object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	_addOrEditStory: function(transaction, feed, story, onSuccess, onFail) {
		var nullData = this.nullData;
		var error = this.errorHandler;

		var insertURLs = function(transaction, result) {
			var sid = result.insertId;
			transaction.executeSql("DELETE FROM storyurls WHERE sid = ?",
								   [sid], nullData, error);
			for(var i = 0; i < story.url.length; i++) {
				transaction.executeSql("INSERT INTO storyurls (sid, title, href)" +
									   "  VALUES(?, ?, ?)",
									   [sid, story.url[i].title, story.url[i].href],
										nullData, error);
			}
			onSuccess();
		};

        transaction.executeSql("SELECT id" +
                               "  FROM stories" +
                               "  WHERE fid = ?" +
                               "    AND uuid = ?",
                               [feed.id, story.uuid],
            function(transaction, result) {
                if(result.rows.length > 0) {
                    var sid = result.rows.item(0).id;
                    transaction.executeSql("UPDATE stories" +
                                           "  SET title = ?," +
                                           "    summary = ?," +
                                           "    picture = ?," +
                                           "    audio = ?," +
                                           "    video = ?," +
                                           "    pubdate = ?," +
                                           "    flag = 0" +
                                           "  WHERE id = ?",
                                           [story.title, story.summary,
                                            story.picture, story.audio,
                                            story.video,
                                            story.pubdate ? story.pubdate : 0,
                                            sid],
                                           onSuccess, onFail);
                    insertURLs(transaction, { insertId: sid });
                } else {
                    var date = new Date();
                    var isNew = story.pubdate >= (date.getTime() - (24 * 60 * 60 * 1000));
                    transaction.executeSql("INSERT INTO stories" +
                                           "  (fid, uuid, title, summary, picture, audio, video, pubdate, isRead, isNew, isStarred, flag)" +
                                           "  VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 0)",
                                           [feed.id, story.uuid, story.title, story.summary, story.picture,
                                            story.audio, story.video,
                                            story.pubdate ? story.pubdate : 0,
                                            isNew ? 1 : 0],
                                           insertURLs, onFail);
                }
            },
        onFail);
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

        var self = this;
        this.writeTransaction(function(transaction) {
            for(var i = 0; i < stories.length; i++) {
                self._addOrEditStory(transaction, feed, stories[i], onSuccess, onFail);
            }
        });
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
		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE stories SET isStarred = ? WHERE id = ?",
								   [story.isStarred ? 1 : 0, story.id], onSuccess, onFail);
		});
	},

	/**
	 * Reset the starred flag all stories of a feed.
	 *
	 * @param	story		{Object}		story object
	 * @param	onSuccess	{function}		function to be called on success
	 * @param	onFail		{function}		function to be called on failure
	 */
	markAllUnStarred: function(feed, onSuccess, onFail) {
		onSuccess = onSuccess || this.nullData;
		onFail = onFail || this.errorHandler;

		var sql = "UPDATE stories SET isStarred = 0";
		if(feed.feedType >= feedTypes.ftUnknown) {
			sql += " WHERE fid = " + feed.id;
		}

		this.writeTransaction(function(transaction) {
			transaction.executeSql(sql, [], onSuccess, onFail);
		});
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
		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE stories SET isRead = 1, isNew = 0 WHERE id = ?",
								   [story.id], onSuccess, onFail);
		});
	},

	/**
	 * Mark all stories of a feed as being read.
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
	 * This does no "real" delete as the item would come back on the next
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

		this.log("DB> deleting story", story.id);

		this.writeTransaction(function(transaction) {
			transaction.executeSql("UPDATE stories SET deleted = 1 WHERE id = ?",
				[story.id], onSuccess, onFail);
		});
	}
});
