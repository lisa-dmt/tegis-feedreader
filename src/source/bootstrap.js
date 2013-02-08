window.onload = function () {
	window.enyo.application = {};
	window.enyo.application.launcher = new FeedReaderAppLauncher();
	window.enyo.application.launcher.startup();
};
