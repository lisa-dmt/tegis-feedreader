window.onload = function () {
	window.enyo.application = {};
	window.enyo.application.launcher = new FeedReaderAppLauncher();
	window.enyo.applicationRelaunchHandler = function (params) {
		window.enyo.application.launcher.relaunch(params);
	};
	window.enyo.application.launcher.startup();
};
