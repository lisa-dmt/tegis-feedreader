/*
 *		commonjs/transactionmgr - Database transaction manager
 *
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

function TransactionManager(db, onSuccess, onFail) {
    this.db = db;
    this.onSuccess = onSuccess;
    this.onFail = onFail;
}

TransactionManager.prototype = {
    db:         null,
    error:      null,

    onSuccess:  null,
    onFail:     null,

    readQueue:  [],
    writeQueue: [],

    running:    false,

    readTransaction: function(callback) {
        this.readQueue.push(callback);
        if(!this.running) {
            this.nextTransaction();
        }
    },

    writeTransaction: function(callback) {
        this.writeQueue.push(callback);
        if(!this.running) {
            this.nextTransaction();
        }
    },

    nextTransaction: function() {
        var self = this;

        function successHandler() {
            self.nextTransaction();
            self.onSuccess();
        }

        function errorHandler(error) {
            self.nextTransaction();
            self.onFail(error);
        }

        this.running = true;
        if(this.readQueue.length > 0) {
            var next = this.readQueue.shift();
            this.db.readTransaction(next, errorHandler, successHandler);
        } else if(this.writeQueue.length > 0) {
            var next = this.writeQueue.shift();
            this.db.transaction(next, errorHandler, successHandler);
        } else {
            this.running = false;
        }
    }
};