/*
 *		source/controls/enhancedaudio.js - Enyo Audio Control
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

var mediaStates = {
	buffering:	-2,
	error:		-1,
	stopped:	0,
	ended:		1,
	aborted:	2,
	paused:		3,
	playing:	4
};

enyo.kind({
	name:		"EnhancedMedia",
	kind:		enyo.Control,

	_connected:				false,
	_mediaState:			mediaStates.stopped,
	_seeking:				false,

	events:	{
		onCanPlay:			"",
		onCanPlayThrough:	"",
		onProgress:			"",
		onStalled:			"",
		onSeeking:			"",
		onSeeked:			"",
		onEnded:			"",
		onAborted:			"",
		onError:			"",
		onStateChanged:		""
	},

	handlers:	{
		oncanplay: 			"_canplay",
		onprogress: 		"_progress",
		oncanplaythough:	"_canplaythrough",
		onseeking:			"_seeking",
		onseeked:			"_seeked",
		onabort:			"_aborted",
		onended:			"_ended",
		onerror:			"_error",
		onstalled:			"_stalled"
	},

	published: {
		src:		"",
		preload:	true
	},

	//
	// Property handling
	//

	srcChanged: function() {
		this._seeking = false;
		this._mediaState = mediaStates.buffering;
		this.doStateChanged();
		this.setAttribute("src", this.src);
		if(this.hasNode()) {
			this.node.load();
		}
	},

	preloadChanged: function() {
		this.setAttribute("autobuffer", this.preload ? "autobuffer" : null);
		this.setAttribute("preload", this.preload ? "auto" : "none");
	},

	//
	// Media control
	//

	play: function() {
		if(this.hasNode()) {
			this.node.play();
			this._mediaState = mediaStates.playing;
			this.doStateChanged();
		}
	},

	pause: function() {
		if(this.hasNode()) {
			this.node.pause();
			this._mediaState = mediaStates.paused;
			this.doStateChanged();
		}
	},

	stop: function(noEvent) {
		if(this.hasNode()) {
			if(this.getPlaying()) {
				this.node.pause();
			}
			this.node.currentTime = 0;
			this._mediaState = mediaStates.stopped;
			if(!noEvent) {
				this.doStateChanged();
			}
		}
	},

	seek: function(timeIndex) {
		if(this.hasNode()) {
			this.node.currentTime = timeIndex;
		}
	},

	getCurrentTime: function() {
		if(this.hasNode()) {
			return this.node.currentTime;
		} else {
			return 0;
		}
	},

	getDuration: function() {
		if(this.hasNode()) {
			return this.node.duration;
		} else {
			return 9999;
		}
	},

	getPlaying: function() {
		return (this._mediaState >= mediaStates.playing);
	},

	getBuffered: function() {
		if(this.hasNode()) {
			return this.node.buffered;
		} else {
			return null;
		}
	},

	//
	// Helper functions
	//

	getReadableState: function() {
		switch(this._mediaState) {
			case mediaStates.buffering:
				return $L("Buffering");
			case mediaStates.error:
				return $L("Media error");
			case mediaStates.stopped:
				return $L("Stopped");
			case mediaStates.ended:
				return $L("Ended");
			case mediaStates.aborted:
				return $L("Stopped");
			default:
				if(this._seeking) {
					return $L("Seeking");
				} else {
					if(this._mediaState == mediaStates.playing) {
						return $L("Playing");
					} else {
						return $L("Paused");
					}
				}
		}
	},

	//
	// DOM event handlers
	//

	_canplay: function(sender) {
		if(this._mediaState == mediaStates.buffering) {
			this._mediaState = mediaStates.stopped;
		}
		this.doCanPlay();
		this.doStateChanged();
		return true;
	},

	_canplaythrough: function(sender) {
		this.doCanPlayThrough();
		this.doStateChanged();
		return true;
	},

	_progress: function(sender) {
		this.doProgress({ time: this.node.currentTime });
		this.doStateChanged();
		return true;
	},

	_stalled: function(sender) {
		this.doStalled();
		return true;
	},

	_seeking: function(sender) {
		this._seeking = true;
		this.doSeeking();
		this.doStateChanged();
		return true;
	},

	_seeked: function(sender) {
		this._seeking = false;
		this.doSeeked();
		this.doStateChanged();
		return true;
	},

	_aborted: function(sender) {
		this._mediaState = mediaStates.aborted;
		this.doAborted();
		this.doStateChanged();
		return true;
	},

	_ended: function(sender) {
		this._mediaState = mediaStates.ended;
		this.doEnded();
		this.doStateChanged();
		return true;
	},

	_error: function(sender) {
		this._mediaState = mediaStates.error;
		this.doError();
		this.doStateChanged();
		return true;
	},

	//
	// Initialization
	//

	rendered: function() {
		this.inherited(arguments);
		enyo.makeBubble(this, "abort");
		enyo.makeBubble(this, "canplay");
		enyo.makeBubble(this, "canplaythrough");
		enyo.makeBubble(this, "durationchange");
		enyo.makeBubble(this, "emptied");
		enyo.makeBubble(this, "ended");
		enyo.makeBubble(this, "error");
		enyo.makeBubble(this, "loadeddata");
		enyo.makeBubble(this, "loadedmetadata");
		enyo.makeBubble(this, "loadstart");
		enyo.makeBubble(this, "pause");
		enyo.makeBubble(this, "play");
		enyo.makeBubble(this, "playing");
		enyo.makeBubble(this, "progress");
		enyo.makeBubble(this, "ratechange");
		enyo.makeBubble(this, "seeked");
		enyo.makeBubble(this, "seeking");
		enyo.makeBubble(this, "stalled");
		enyo.makeBubble(this, "timeupdate");
		enyo.makeBubble(this, "volumechange");
		enyo.makeBubble(this, "waiting");
	},

	create: function() {
		this.inherited(arguments);
		this.srcChanged();
		this.preloadChanged();
	}
});

enyo.kind({
	name:		"EnhancedAudio",
	kind:		"EnhancedMedia",
	tag:		"audio"
});

enyo.kind({
	name:		"EnhancedVideo",
	kind:		"EnhancedMedia",
	tag:		"video"
});