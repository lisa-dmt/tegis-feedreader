/*
 *		commonjs/formatting.js
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

function Formatting() {
}

/**
 * Strip CDATA tags from text.
 *
 * @param {String} text			string containing CDATA tags
 * @return {String}				string without CDATA tags
 */
Formatting.prototype.stripCDATA = function(text) {
	return text.replace(/<\!\[CDATA\[(.*)\]\]/ig, "$1");
};

/**
 * Strip HTML tags from text.
 *
 * @param {String} text			string containing HTML tags
 * @return {String}				string without HTML tags
 */
Formatting.prototype.stripHTML = function(text) {
	return text.replace(/(<([^>]+)>)/ig, "");
};

/**
 * Strip line breaks and tabs from text.
 *
 * @param {String} text			string containing line breaks and/or tabs
 * @return {String}				string without line breaks and tabs
 */
Formatting.prototype.stripBreaks = function(text) {
	text = text.replace(/\n/g, " ");
	text = text.replace(/\r/g, " ");
	text = text.replace(/\t/g, " ");

	text = text.replace(/^\s+/, '');
	text = text.replace(/\s+$/, '');
	text = text.replace(/\s+/g, ' ');

	return text;
};

/** @private
 *
 * Reformat a story's summary.
 *
 * @param 	summary		{string}		string containing the summary to reformat
 * @return 				{string}		reformatted summary
 */
Formatting.prototype.reformatSummary = function(summary) {
	try {
		summary = this.stripBreaks(this.stripCDATA(summary));

		// Remove potentially dangerous tags.
		summary = summary.replace(/<script[^>]*>(.*?)<\/script>/ig, "");
		summary = summary.replace(/(<script([^>]*)\/>)/ig, "");
		summary = summary.replace(/<iframe[^>]*>(.*?)<\/iframe>/ig, "");
		summary = summary.replace(/(<iframe([^>]+)\/>)/ig, "");

		summary = summary.replace(/(\{([^\}]+)\})/ig, "");
		summary = summary.replace(/digg_url .../, "");

		// remove class properties of all elements
		summary = summary.replace(/class="[^"]*"/ig, '');

		// Parse some BBCodes.
		summary = summary.replace(/\[i\](.*)\[\/i\]/ig, '<span class="italic">$1</span>');
		summary = summary.replace(/\[b\](.*)\[\/b\]/ig, '<span class="bold">$1</span>');
		summary = summary.replace(/\[u\](.*)\[\/u\]/ig, '<span class="underline">$1</span>');

		summary = unescape(summary);

		return summary;
	} catch(e) {
		enyo.error("FORMAT EXCEPTION>", e);
	}
	return "";
};
