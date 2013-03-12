window.onload = function () {
	window.enyo.application = {};

	applyOSSpecific();

	window.enyo.application.launcher = new FeedReaderAppLauncher();
	window.enyo.application.launcher.startup();
};
