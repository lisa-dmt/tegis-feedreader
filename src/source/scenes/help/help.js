/*
 *		source/help/help.js - Help dialog
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

enyo.kind({
	name:			"HelpDialog",
    kind:			"ModalDialog",
	autoDismiss:	true,
	caption:		$L("FeedReader Help"),

	components:	[{
        name:       "title",
		style:		"font-weight: bold; font-size: 18px; margin-bottom: 0px;"
	}, {
        name:       "author",
		style:		"font-weight: bold; font-size: 15px;"
	}, {
		kind:		"enyo.Scroller",
		horizontal:	"hidden",
		fit:		true,
		components:	[{
			kind:		"onyx.Groupbox",
			components:	[{
				kind:       "onyx.GroupboxHeader",
				content:	$L("Help")
			}, {
				kind:		"FittableColumns",
				style:		"line-height: 32px; padding: 4px 8px 4px 8px",
				ontap:		"openFeedReaderHomepage",
				components:	[{
					kind:		"Image",
					src:		"assets/web-icon.png",
					classes:	"support-icon"
				}, {
					fit:		true,
					content:	$L("FeedReader's Homepage")
				}]
			}]
		}, {
			kind:		"onyx.Groupbox",
			components:	[{
				kind:       "onyx.GroupboxHeader",
				content:	$L("Support")
			}, {
				kind:		"FittableColumns",
				style:		"line-height: 32px; padding: 4px 8px 4px 8px",
				ontap:		"openHomepage",
				components:	[{
					kind:		"Image",
					src:		"assets/web-icon.png",
					classes:	"support-icon"
				}, {
					fit:		true,
					content:	$L("Homepage")
				}]
			}, {
				kind:		"FittableColumns",
				style:		"line-height: 32px; padding: 4px 8px 4px 8px",
				ontap:		"openEMail",
				components:	[{
					kind:		"Image",
					src:		"assets/mail-icon.png",
					classes:	"support-icon"
				}, {
					fit:		true,
					content:	$L("Write an E-Mail")
				}]
			}]
		}, {
			content:	"The following people helped me to make FeedReader what it is now.<br>Thanks for your great support!",
			style:		"font-size: 15px;",
			allowHtml:	true
		}, {
			content:	"- Timo Tegtmeier",
			style:		"margin-left: 10px; margin-bottom: 12px; font-style: italic; font-size: 15px;"
		}, {
			style:		"font-size: 15px;",
			allowHtml:	true,
			content:	"<li>" +
						'	<a href="mailto:roubal@keyserver.cz"><b>Milan Roubal</b></a><br>' +
						"	Tester and author of the czech locale" +
						"</li>" +
						"<li>" +
						'	<a href="mailto:stephan.w.paul@googlemail.com"><b>Stephan PAUL</b></a><br>' +
						"	Author of the french locale" +
						"<li>" +
						'	<a href="mailto:franciscojrivash@gmail.com"><b>Francisco Rivas</b></a><br>' +
						"	Author of the spanish locale" +
						"</li>" +
						"<li>" +
						'	<a href="mailto:voronov@pisem.net"><b>Vladimir Voronov</b></a><br>' +
						"	Author of the russian locale" +
						"</li>" +
						"<li>" +
						"	<b>Yannick LE NY</b><br>" +
						"	Original Author of the french locale" +
						"</li>"
		}]
	}, {
		kind:       enyo.FittableRows,
		classes:	"center-text",
		components:	[{
			kind:		"onyx.Button",
			classes:	"onyx-affirmative",
			content:	$L("OK"),
			ontap:		"okClicked"
		}]
	}, {
        kind:               "enyo.Signals",
        onConstantsReady:   "constantsReady"
    }],

	openFeedReaderHomepage: function(sender, event) {
		enyo.application.openLink("http://www.tegi-stuff.de/doku.php?id=feedreader");
	},

	openHomepage: function(sender, event) {
		enyo.application.openLink("http://www.tegi-stuff.de/");
	},

	openEMail: function(sender, event) {
		enyo.application.openLink("mailto:general@tegi-stuff.de?subject=FeedReader");
	},

	okClicked: function(sender, event) {
		this.hide();
	},

    constantsReady: function() {
        this.$.title.setContent(enyo.application.appName + ' v' + enyo.application.versionString);
        this.$.author.setContent($L("by") + " " + enyo.application.appAuthor);
    }
});
