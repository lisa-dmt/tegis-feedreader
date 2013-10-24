enyo.depends(
    // Enyo libs
    "$lib/onyx",

    "$lib/layout/fittable",
	"$lib/layout/list",
	"$lib/layout/panels",

	"$lib/g11n",

	// OS specific stuff
	"utils/os/generic.js",
	"utils/os/firefox.js",

	// Utility functions
	"utils/constants.js",
	"utils/formatting.js",
	"utils/simplehtmlparser.js",
	"utils/codepages.js",
    "utils/helper.js",

    // Utilities
    "utils/spooler.js",
    "utils/date.js",
    "utils/osspecific.js",

	// Models
	"models/prefs.js",
	"models/category.js",
	"models/feed.js",
	"models/story.js",

	// Business logic
	"logic/feedsprocessor.js",
	"logic/prefs.js",
	"logic/indexeddb.js",
	"logic/feeds.js",
	"logic/readitlater.js",

    // Controls
    "controls/toggleitem.js",
    "controls/selectoritem.js",
    "controls/errordialog.js",
	"controls/helper.js",
    "controls/listviewskeleton.js",
    "controls/starbutton.js",
    "controls/media.js",
    "controls/activitybutton.js",
    "controls/htmlcontent.js",
	"controls/modaldialog.js",
    "controls/dialogprompt.js",
    "controls/divider.js",
	"controls/popupmenu.js",

    // Scenes
    "scenes/feedlist/feedlist.js",
    "scenes/storylist/storylist.js",
    "scenes/story/story.js",
    "scenes/editfeed/editfeed.js",
    "scenes/preferences/preferences.js",
    "scenes/license/license.js",
    "scenes/help/help.js",
    "scenes/importer/importer.js",
	"scenes/mainview/mainview.js",

	// CSS
	"App.css",

	// Bootstrap
	"App.js",
	"bootstrap.js"
);
