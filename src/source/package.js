enyo.depends(
    // Enyo libs
    "$lib/onyx",

    "$lib/layout/fittable",
	"$lib/layout/list",
	"$lib/layout/panels",

	"$lib/g11n",

    // Commons
    "commonjs/constants.js",
    "commonjs/helper.js",
    "commonjs/story.js",
    "commonjs/feed.js",
	"commonjs/category.js",
    "commonjs/simplehtmlparser.js",
    "commonjs/codepages.js",
    "commonjs/formatting.js",
    "commonjs/prefs.js",
    "commonjs/feeds.js",
    "commonjs/transactionmgr.js",
    "commonjs/simplehtmlparser.js",
    "commonjs/helper.js",

    // Utilities
    "utils/spooler.js",
    "utils/date.js",
    "utils/osspecific.js",

	// Models
	"models/prefs.js",
	"models/database.js",
	"models/indexeddb.js",
	"models/feeds.js",
	"models/readitlater.js",

    // Controls
    "controls/toggleitem.js",
    "controls/selectoritem.js",
    "controls/errordialog.js",
	"controls/helper.js",
    "controls/listviewskeleton.js",
    "controls/dottedseparator.js",
    "controls/silverseparator.js",
    "controls/starbutton.js",
    "controls/enhancedaudio.js",
    "controls/activitybutton.js",
    "controls/htmlcontent.js",
	"controls/modaldialog.js",
    "controls/dialogprompt.js",
    "controls/divider.js",
    "controls/progressslider.js",

    // Scenes
    "mainview/mainview.js",
    "feedlist/feedlist.js",
    "storylist/storylist.js",
    "story/story.js",
    "editfeed/editfeed.js",
    "preferences/preferences.js",
    "license/license.js",
    "help/help.js",
    "importer/importer.js",

    // OS specific stuff
    "utils/os/webOSExt.js",
    "utils/os/palm.js",
    "utils/os/generic.js",

	// CSS
	"App.css",

	// Bootstrap
	"App.js",
	"bootstrap.js"
);
