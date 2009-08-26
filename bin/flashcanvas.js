/* 
 * FlashCanvas
 *
 * Copyright (c) 2009 Tim Cameron Ryan
 * Released under the MIT/X License
 *
 */

// Reference:
//   http://www.whatwg.org/specs/web-apps/current-work/#the-canvas-element
//   http://dev.w3.org/html5/spec/the-canvas-element.html

(function () {

/*
 * settings
 */

// determine script url
var SCRIPT_URL = (function() {
    var scripts = document.getElementsByTagName('script');
    var script = scripts[scripts.length - 1];
    return script.getAttribute('src', 2)
}());
var SCRIPT_PATH = SCRIPT_URL.replace(/[^\/]+$/, '');

// swf settings
var SWF_URL = SCRIPT_PATH + 'flashcanvas.swf'; //+ '?r=' + Math.random();
var SWF_VERSION = '9,0,0,0';

/* 
 * JS OOP 
 */

function Structure() { };
Structure.extend = function (p, s) {
	var OP = Object.prototype;
	function augment(obj, props) {
		// iterate all defined properties
		for (var prop in props)
			if (OP.hasOwnProperty.call(props, prop))
				obj[prop] = props[prop];
	
		// IE has dontEnum issues
		var prop, enums = 'constructor|toString|valueOf|toLocaleString|isPrototypeOf|propertyIsEnumerable|hasOwnProperty'.split('|');
		while (prop = enums.pop())
			if (OP.hasOwnProperty.call(props, prop) && !OP.propertyIsEnumerable.call(props, prop))
				obj[prop] = props[prop];
	}
	
	// clean input
	var props = p || {}, statics = s || {};
	// create factory object
	var ancestor = this, Factory = OP.hasOwnProperty.call(props, 'constructor') ?
	    props.constructor : function () { ancestor.apply(this, arguments); };
	
	// copy and extend statics
	augment(Factory, Structure);
	augment(Factory, statics);
	// copy and extend prototype
	var Super = function () { };
	Super.prototype = this.prototype;
	Factory.prototype = new Super();
	augment(Factory.prototype, props);
	Factory.prototype.constructor = Factory;
	
	// return new factory object
	return Factory;
};

/*
 * Context API
 */
 
function Lookup(array) {
	for (var i = 0, len = array.length; i < len; i++)
		this[array[i]] = i;
}

var properties = new Lookup('globalAlpha|globalCompositeOperation|strokeStyle|fillStyle|lineWidth|lineCap|lineJoin|miterLimit|shadowOffsetX|shadowOffsetY|shadowBlur|shadowColor|font|textAlign|textBaseline|save|restore|scale|rotate|translate|transform|setTransform|createLinearGradient|createRadialGradient|clearRect|fillRect|strokeRect|beginPath|closePath|moveTo|lineTo|quadraticCurveTo|bezierCurveTo|arcTo|rect|arc|fill|stroke|clip|isPointInPath|fillText|strokeText|measureText|drawImage|createImageData|getImageData|putImageData'.split('|'));

function isInvalid(x) {
	return (x == Number.NEGATIVE_INFINITY || x == Number.POSITIVE_INFINITY || isNaN(x));
}
 
// canvas context
var CanvasRenderingContext2D = Structure.extend(
{
	// private variables
	_buffer: null,
	// swf back-reference
	_swf: null,
	_guid: null,
	
	constructor: function (canvas, swf) {
		// properties
		this.canvas = canvas;
		// private
		this._swf = swf;
		this._buffer = new BytesBuffer();
		this._stateStack = [];
		
		// frame update interval
		(function (ctx) {
			window.setInterval(function () {
				ctx._postCommands();
			}, 10);
		})(this);
	},
		
	_postCommands: function () {
		// post commands
		var commands = this._buffer.flush();
		if (commands.length > 0)
			return SWFUtils.callRawMethod(this._swf, 'postCommands', ['<string>' + BytesBase64.encode(commands) + '</string>']);
	},
	
	_resize: function (width, height) {
		// resize frame
		SWFUtils.callMethod(this._swf, 'resize', [width, height]);
		// frame is cleared; clear command buffer
		this._buffer.flush();
	},
	
	/*
	 * back-reference to the canvas
	 */
	 
	// readonly attribute HTMLCanvasElement canvas;
	canvas: null,
	
	/*
	 * state
	 */
	 
	_stateStack: null,
	
	// void save();
	save: function () {
		// push states
		this._stateStack.push({
			strokeStyle: this.strokeStyle,
			fillStyle: this.fillStyle,
			globalAlpha: this.globalAlpha,
			lineWidth: this.lineWidth,
			lineCap: this.lineCap,
			lineJoin: this.lineJoin,
			miterLimit: this.miterLimit,
			shadowOffsetX: this.shadowOffsetX,
			shadowOffsetY: this.shadowOffsetY,
			shadowColor: this.shadowColor,
			shadowBlur: this.shadowBlur,
			globalCompositeOperation: this.globalCompositeOperation,
			font: this.font,
			textAlign: this.textAlign,
			textBaseline: this.textBaseline
		});
	
		// write all properties
		this._writeCompositing();
		this._writeShadows();
		this._writeColorStyles();
		this._writeLineStyles();
		this._writeFontStyles();
	
		var b = this._buffer;
		b.writeByte(properties.save);
	},
	
	// void restore();
	restore: function () {
		// pop states
		if (this._stateStack.length > 0)
		{
			var state = this._stateStack.pop();
			this.strokeStyle = state.strokeStyle;
			this.fillStyle = state.fillStyle;
			this.globalAlpha = state.globalAlpha;
			this.lineWidth = state.lineWidth;
			this.lineCap = state.lineCap;
			this.lineJoin = state.lineJoin;
			this.miterLimit = state.miterLimit;
			this.shadowOffsetX = state.shadowOffsetX;
			this.shadowOffsetY = state.shadowOffsetY;
			this.shadowColor = state.shadowColor;
			this.shadowBlur = state.shadowBlur;
			this.globalCompositeOperation = state.globalCompositeOperation;
			this.font = state.font;
			this.textAlign = state.textAlign;
			this.textBaseline = state.textBaseline;
		}
	
		var b = this._buffer;
		b.writeByte(properties.restore);
	},

	/*
         * transformations (default transform is the identity matrix)
	 */

	// void scale(in float x, in float y);
	scale: function (x, y) {
		var b = this._buffer;
		b.writeByte(properties.scale);
		b.writeFloat(x);
		b.writeFloat(y);
	},
	
	// void rotate(in float angle);
	rotate: function (angle) {
		var b = this._buffer;
		b.writeByte(properties.rotate);
		b.writeFloat(angle);
	},
	
	// void translate(in float x, in float y);
	translate: function (x, y) {
		var b = this._buffer;
		b.writeByte(properties.translate);
		b.writeFloat(x);
		b.writeFloat(y);
	},
	
	// void transform(in float m11, in float m12, in float m21, in float m22, in float dx, in float dy);
	transform: function (m11, m12, m21, m22, dx, dy) {
		var b = this._buffer;
		b.writeByte(properties.transform);
		b.writeFloat(m11);
		b.writeFloat(m12);
		b.writeFloat(m21);
		b.writeFloat(m22);
		b.writeFloat(dx);
		b.writeFloat(dy);
	},
	
	// void setTransform(in float m11, in float m12, in float m21, in float m22, in float dx, in float dy);
	setTransform: function (m11, m12, m21, m22, dx, dy) {
		var b = this._buffer;
		b.writeByte(properties.setTransform);
		b.writeFloat(m11);
		b.writeFloat(m12);
		b.writeFloat(m21);
		b.writeFloat(m22);
		b.writeFloat(dx);
		b.writeFloat(dy);
	},
	
	/*
	 * compositing
	 */
	 
	// attribute float globalAlpha; (default 1.0)
	globalAlpha: 1.0,
	// attribute DOMString globalCompositeOperation; (default source-over)
	globalCompositeOperation: 'source-over',
	
	_writeCompositing: function ()
	{
		var b = this._buffer;
		if (this._globalAlpha != this.globalAlpha) {
			this._globalAlpha = this.globalAlpha;
			b.writeByte(properties.globalAlpha);
			b.writeFloat(this.globalAlpha);
		}
		if (this._globalCompositeOperation != this.globalCompositeOperation) {
			this._globalCompositeOperation = this.globalCompositeOperation;
			b.writeByte(properties.globalCompositeOperation);
			b.writeString(this.globalCompositeOperation);
		}
	},
	
	/*
         * shadows
	 */
	 
	// attribute float shadowOffsetX; (default 0)
	shadowOffsetX: 0.0,
	// attribute float shadowOffsetY; (default 0)
	shadowOffsetY: 0.0,
	// attribute float shadowBlur; (default 0)
	shadowBlur: 0.0,
	// attribute DOMString shadowColor; (default transparent black)
	shadowColor: 'rgba(0,0,0,0)',
	
	_writeShadows: function ()
	{
		var b = this._buffer;
		if (this._shadowOffsetX != this.shadowOffsetX) {
			this._shadowOffsetX = this.shadowOffsetX;
			b.writeByte(properties.shadowOffsetX);
			b.writeFloat(this.shadowOffsetX);
		}
		if (this._shadowOffsetY != this.shadowOffsetY) {
			this._shadowOffsetY = this.shadowOffsetY;
			b.writeByte(properties.shadowOffsetY);
			b.writeFloat(this.shadowOffsetY);
		}
		if (this._shadowBlur != this.shadowBlur) {
			this._shadowBlur = this.shadowBlur;
			b.writeByte(properties.shadowBlur);
			b.writeFloat(this.shadowBlur);
		}
		if (this._shadowColor != this.shadowColor) {
			this._shadowColor = this.shadowColor;
			b.writeByte(properties.shadowColor);
			b.writeString(this.shadowColor);
		}
	},
	
	/*
          * colors and styles
	 */
	
	// attribute any strokeStyle; (default black)
	strokeStyle: '#000000', 
	// attribute any fillStyle; (default black)
	fillStyle: '#000000',
	
	// CanvasGradient createLinearGradient(in float x0, in float y0, in float x1, in float y1);
	// CanvasGradient createRadialGradient(in float x0, in float y0, in float r0, in float x1, in float y1, in float r1);
	// CanvasPattern createPattern(in HTMLImageElement image, in DOMString repetition);
	// CanvasPattern createPattern(in HTMLCanvasElement image, in DOMString repetition);
	// CanvasPattern createPattern(in HTMLVideoElement image, in DOMString repetition);
	
	_writeColorStyles: function () {
		var b = this._buffer;
		if (this._strokeStyle != this.strokeStyle) {
			this._strokeStyle = this.strokeStyle;
			b.writeByte(properties.strokeStyle);
			b.writeString(this.strokeStyle);
		}
		if (this._fillStyle != this.fillStyle) {
			this._fillStyle = this.fillStyle;
			b.writeByte(properties.fillStyle);
			b.writeString(this.fillStyle);
		}
	},

	/*
	 * line caps/joins
	 */
	 
	// attribute float lineWidth; (default 1)
	lineWidth: 1.0,
	// attribute DOMString lineCap; "butt", "round", "square" (default "butt")
	lineCap: 'butt', 
	// attribute DOMString lineJoin; "round", "bevel", "miter" (default "miter")
	lineJoin: 'miter',
	// attribute float miterLimit; (default 10)
	miterLimit: 10.0,
	
	_writeLineStyles: function () {
		var b = this._buffer;
		if ((this._lineWidth != this.lineWidth) && !isInvalid(this.lineWidth)) {
			this._lineWidth = this.lineWidth;
			b.writeByte(properties.lineWidth);
			b.writeFloat(this.lineWidth);
		}
		if (this._lineCap != this.lineCap) {
			this._lineCap = this.lineCap;
			b.writeByte(properties.lineCap);
			b.writeString(this.lineCap);
		}
		if (this._lineJoin != this.lineJoin) {
			this._lineJoin = this.lineJoin;
			b.writeByte(properties.lineJoin);
			b.writeString(this.lineJoin);
		}
		if ((this._miterLimit != this.miterLimit) && !isInvalid(this.miterLimit)) {
			this._miterLimit = this.miterLimit;
			b.writeByte(properties.miterLimit);
			b.writeFloat(this.miterLimit);
		}
	},

	/*
	 * rects
	 */
	 
	// void clearRect(in float x, in float y, in float w, in float h);
	clearRect: function (x, y, w, h) {
		if (isInvalid(x) || isInvalid(y) || isInvalid(w) || isInvalid(h)) return;
		
		var b = this._buffer;
		b.writeByte(properties.clearRect);
		b.writeFloat(x);
		b.writeFloat(y);
		b.writeFloat(w);
		b.writeFloat(h);
	},
	
	// void fillRect(in float x, in float y, in float w, in float h);
	fillRect: function (x, y, w, h) {
		if (isInvalid(x) || isInvalid(y) || isInvalid(w) || isInvalid(h)) return;
		
		this._writeCompositing();
		this._writeShadows();
		this._writeColorStyles();
		
		var b = this._buffer;
		b.writeByte(properties.fillRect);
		b.writeFloat(x);
		b.writeFloat(y);
		b.writeFloat(w);
		b.writeFloat(h);
	}, 
	
	// void strokeRect(in float x, in float y, in float w, in float h);
	strokeRect: function (x, y, w, h) {
		if (isInvalid(x) || isInvalid(y) || isInvalid(w) || isInvalid(h)) return;
		
		this._writeCompositing();
		this._writeShadows();
		this._writeColorStyles();
		this._writeLineStyles();
		
		var b = this._buffer;
		b.writeByte(properties.strokeRect);
		b.writeFloat(x);
		b.writeFloat(y);
		b.writeFloat(w);
		b.writeFloat(h);
	}, 

	/*
	 * path API
	 */
	
	// void beginPath();
	beginPath: function () {
		var b = this._buffer;
		b.writeByte(properties.beginPath);
	},
	
	// void closePath();
	closePath: function () {
		var b = this._buffer;
		b.writeByte(properties.closePath);
	},
	
	// void moveTo(in float x, in float y);
	moveTo: function (x, y) {
		if (isInvalid(x) || isInvalid(y))
			return;
	
		var b = this._buffer;
		b.writeByte(properties.moveTo);
		b.writeFloat(x);
		b.writeFloat(y);
	}, 
	
	// void lineTo(in float x, in float y);
	lineTo: function (x, y) {
		if (isInvalid(x) || isInvalid(y)) return;
			
		var b = this._buffer;
		b.writeByte(properties.lineTo);
		b.writeFloat(x);
		b.writeFloat(y);
	}, 
	
	// void quadraticCurveTo(in float cpx, in float cpy, in float x, in float y);
	quadraticCurveTo: function (cpx, cpy, x, y) {
		if (isInvalid(cpx) || isInvalid(cpy) || isInvalid(x) || isInvalid(y))	return;
			
		var b = this._buffer;
		b.writeByte(properties.quadraticCurveTo);
		b.writeFloat(cpx);
		b.writeFloat(cpy);
		b.writeFloat(x);
		b.writeFloat(y);
	}, 
	
	// void bezierCurveTo(in float cp1x, in float cp1y, in float cp2x, in float cp2y, in float x, in float y);
	bezierCurveTo: function (cp1x, cp1y, cp2x, cp2y, x, y) {
		if (isInvalid(cp1x) || isInvalid(cp1y) || isInvalid(cp2x) || isInvalid(cp2y) || isInvalid(x) || isInvalid(y)) return;
	
		var b = this._buffer;
		b.writeByte(properties.bezierCurveTo);
		b.writeFloat(cp1x);
		b.writeFloat(cp1y);
		b.writeFloat(cp2x);
		b.writeFloat(cp2y);
		b.writeFloat(x);
		b.writeFloat(y);
	}, 
	
	// void arcTo(in float x1, in float y1, in float x2, in float y2, in float radius);
	arcTo: function (x1, y1, x2, y2, radius) {
		if (isInvalid(x1) || isInvalid(y1) || isInvalid(x2) || isInvalid(y2) || isInvalid(radius)) return;
			
		var b = this._buffer;
		b.writeByte(properties.arcTo);
		b.writeFloat(x1);
		b.writeFloat(y1);
		b.writeFloat(x2);
		b.writeFloat(y2);
		b.writeFloat(radius);
	}, 
	
	// void rect(in float x, in float y, in float w, in float h);
	rect: function (x, y, w, h) {
		if (isInvalid(x) || isInvalid(y) || isInvalid(w) || isInvalid(h)) return;
	
		var b = this._buffer;
		b.writeByte(properties.rect);
		b.writeFloat(x);
		b.writeFloat(y);
		b.writeFloat(w);
		b.writeFloat(h);
	}, 
	
	// void arc(in float x, in float y, in float radius, in float startAngle, in float endAngle, in boolean anticlockwise);
	arc: function (x, y, radius, startAngle, endAngle, anticlockwise) {
		var b = this._buffer;
		b.writeByte(properties.arc);
		b.writeFloat(x);
		b.writeFloat(y);
		b.writeFloat(radius);
		b.writeFloat(startAngle);
		b.writeFloat(endAngle);
		b.writeBoolean(anticlockwise);
	}, 
	
	// void fill();
	fill: function () {
		this._writeCompositing();
		this._writeShadows();
		this._writeColorStyles();
		
		var b = this._buffer;
		b.writeByte(properties.fill);
	}, 
	
	// void stroke();
	stroke: function () {
		this._writeCompositing();
		this._writeShadows();
		this._writeColorStyles();
		this._writeLineStyles();		

		var b = this._buffer;
		b.writeByte(properties.stroke);
	}, 
	
	// void clip();
	clip: function () {
		var b = this._buffer;
		b.writeByte(properties.clip);
	}, 
	
	// boolean isPointInPath(in float x, in float y);
	isPointInPath: function (x, y) {
//[TODO]
	},

	/*
         * text
	 */

	// attribute DOMString font; (default 10px sans-serif)
	font: '10px sans-serif',
	// attribute DOMString textAlign; "start", "end", "left", "right", "center" (default: "start")
	textAlign: 'start',
	// attribute DOMString textBaseline; "top", "hanging", "middle", "alphabetic", "ideographic", "bottom" (default: "alphabetic")
	textBaseline: 'alphabetic',
	
	_writeFontStyles: function () {
		var b = this._buffer;
		if (this._font != this.font) {
			this._font = this.font;
			b.writeByte(properties.font);
			b.writeString(this.font);
		}
		if (this._textAlign != this.textAlign) {
			this._textAlign = this.textAlign;
			b.writeByte(properties.textAlign);
			b.writeString(this.textAlign);
		}
		if (this._textBaseline != this.textBaseline) {
			this._textBaseline = this.textBaseline;
			b.writeByte(properties.textBaseline);
			b.writeString(this.textBaseline);
		}
	},
	
	// void fillText(in DOMString text, in float x, in float y, [Optional] in float maxWidth);
	fillText: function (text, x, y, maxWidth) {
		this._writeColorStyles();
		this._writeFontStyles();
	
		var b = this._buffer;
		b.writeByte(properties.fillText);
		b.writeString(text);
		b.writeFloat(x);
		b.writeFloat(y);
		b.writeFloat(maxWidth);
	},
	
	// void strokeText(in DOMString text, in float x, in float y, [Optional] in float maxWidth);
	// TextMetrics measureText(in DOMString text);

	/*
         * drawing images
	 */
	 
	// void drawImage(in HTMLImageElement image, in float dx, in float dy, [Optional] in float dw, in float dh);
	// void drawImage(in HTMLImageElement image, in float sx, in float sy, in float sw, in float sh, in float dx, in float dy, in float dw, in float dh);
	// void drawImage(in HTMLCanvasElement image, in float dx, in float dy, [Optional] in float dw, in float dh);
	// void drawImage(in HTMLCanvasElement image, in float sx, in float sy, in float sw, in float sh, in float dx, in float dy, in float dw, in float dh);
	// void drawImage(in HTMLVideoElement image, in float dx, in float dy, [Optional] in float dw, in float dh);
	// void drawImage(in HTMLVideoElement image, in float sx, in float sy, in float sw, in float sh, in float dx, in float dy, in float dw, in float dh);
	drawImage: function () {
//[TODO]
	},

	/*
         * pixel manipulation
	 */

	// ImageData createImageData(in float sw, in float sh);
	// ImageData createImageData(in ImageData imagedata);
	
	// ImageData getImageData(in float sx, in float sy, in float sw, in float sh);
	getImageData: function (sx, sy, sw, sh) {
		var b = this._buffer;
		b.writeByte(properties.getImageData);
		b.writeFloat(sx);
		b.writeFloat(sy);
		b.writeFloat(sw);
		b.writeFloat(sh);
		return this._postCommands();
	}
	
	// void putImageData(in ImageData imagedata, in float dx, in float dy, [Optional] in float dirtyX, in float dirtyY, in float dirtyWidth, in float dirtyHeight);*/
},

// statics
{	
	initCanvasElement: function (canvas)
	{
		// get element explicit size
		var size = {width: 300, height: 150};
		if (canvas.attributes['width'] != undefined)
			size.width = Math.max(Number(canvas.getAttribute('width')) || 0, 0);
		if (canvas.attributes['height'] != undefined)
			size.height = Math.max(Number(canvas.getAttribute('height')) || 0, 0);
		canvas.style.width = size.width + 'px';
		canvas.style.height = size.height + 'px';
		
		// settings
		var id = 'flashcanvas-' + canvas.uniqueID;
		// embed swf
		canvas.innerHTML = SWFUtils.generateHTML(id, SWF_URL, '100%', '100%', SWF_VERSION);
		var swf = canvas.firstChild;
			
		// initialize context (self-reference)
		var ctx = new CanvasRenderingContext2D(canvas, swf);
		ctx._resize(size.width, size.height);
		
		// canvas API
		canvas.getContext = function (type) {
			return type == '2d' ? ctx : null;
		};		
		canvas.toDataUrl = function () {
//[TODO]
		};
		// resize handler
		canvas.attachEvent('onpropertychange', function () {
			var prop = event.propertyName, value = Number(canvas[prop]);
			if ((prop in size) && !isNaN(value) && (value > 0))
			{
				size[prop] = value;
				canvas.style[prop] = size[prop] + 'px';
				ctx._resize(size.width, size.height);
			}
		});
		
		// forward flash events to parent
		swf.attachEvent('onfocus', function () {
			swf.blur();
			canvas.focus();
		});
	}
});

/*
 * Base64 encoder
 */
 
BytesBase64 = {
	encode : function (input)
	{
		var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
		var output = [];
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0, len = input.length;
 
		while (i < len)
		{ 
			chr1 = input[i++];
			chr2 = input[i++];
			chr3 = input[i++];
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output.push(keyStr.charAt(enc1));
			output.push(keyStr.charAt(enc2));
			output.push(keyStr.charAt(enc3));
			output.push(keyStr.charAt(enc4));
		}
 
		return output.join('');
	}
};

/*
 * Bytes buffer
 */

BytesBuffer = Structure.extend(
{
	// internal variables
	b: null,
	len: 0,
	
	constructor: function () {
		this.b = [];
		this.len = 0;
	},
	
	// flush function
	flush: function() {
		var bytes = this.b;
		this.b = [];
		this.len = 0;
		return bytes;
	},
	
	/*
	 * API
	 */
	
	write: function(bytes) {
		for (var i = 0, len = bytes.length; i < len; i++)
			this.b[this.len++] = bytes[i];
	},
	
	writeByte: function (byte) {
		this.b[this.len++] = byte;
	},
	
	writeFloat: function (x) {
		// special cases
		var bytes = this.b;
/*		if (x == Number.NEGATIVE_INFINITY) {
			bytes[this.len++] = 0x00;
			bytes[this.len++] = 0x00;
			bytes[this.len++] = 0x80;
			bytes[this.len++] = 0x7f;
		} else if (x == Number.POSITIVE_INFINITY) {
			bytes[this.len++] = 0x00;
			bytes[this.len++] = 0x00;
			bytes[this.len++] = 0x80;
			bytes[this.len++] = 0xff;
		} else if (isNaN(x)) {
			bytes[this.len++] = 0x01;
			bytes[this.len++] = 0x00;
			bytes[this.len++] = 0x80;
			bytes[this.len++] = 0xff;
		} else
		{*/
			// computed
			var abs = x;
			var a=0, b=0, c=0, d=0;
			
			// sign
			if (x < 0) {
				d = 128;
				abs = Math.abs(x);
			}
			
			// exponent
			var exponent = Math.floor(Math.log(abs) / Math.log(2)), expEncoded = exponent + 127;
			d |= (expEncoded & 254) >> 1;
			c = (expEncoded & 1) << 7;
			
			// mantissa
			var mantissa = (abs / Math.pow(2, exponent)) - 1, k = mantissa;
			
			if ((k -= 1/2) >= 0) 		{ c |= 64; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/4) >= 0) 		{ c |= 32; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/8) >= 0) 		{ c |= 16; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/16) >= 0) 		{ c |= 8; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/32) >= 0) 		{ c |= 4; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/64) >= 0) 		{ c |= 2; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/128) >= 0) 	{ c |= 1; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/256) >= 0) 	{ b |= 128; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/512) >= 0) 	{ b |= 64; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/1024) >= 0)	{ b |= 32; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/2048) >= 0) 	{ b |= 16; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/4096) >= 0) 	{ b |= 8; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/8192) >= 0) 	{ b |= 4; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/16384) >= 0)	{ b |= 2; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/32768) >= 0) 	{ b |= 1; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/65536) >= 0) 	{ a |= 128; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/131072) >= 0) 	{ a |= 64; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/262144) >= 0)	{ a |= 32; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/524288) >= 0) 	{ a |= 16; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/1048576) >= 0) 	{ a |= 8; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/2097152) >= 0) 	{ a |= 4; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/4194304) >= 0)	{ a |= 2; mantissa = k; } else { k = mantissa; }
			if ((k -= 1/8388608) >= 0) 	{ a |= 1; mantissa = k; } else { k = mantissa; }			
				
			// write bytes
			bytes[this.len++] = a;
			bytes[this.len++] = b;
			bytes[this.len++] = c;
			bytes[this.len++] = d;
//		}
	},
	
	writeBoolean: function (a) {
		this.b[this.len++] = a ? 1 : 0;
	},
	
	writeString: function(s) {
		// write 16-bit length
		this.b[this.len++] = (s.length & 255);
		this.b[this.len++] = (s.length >> 8) & 255;	
		// utf8-decode
		for (var i = 0, len = s.length; i < len; i++)
		{
			var c = s.charCodeAt(i);
			if( c <= 0x7F )
				this.b[this.len++] = c;
			else if( c <= 0x7FF ) {
				this.b[this.len++] = 0xC0 | (c >> 6);
				this.b[this.len++] = 0x80 | (c & 63);
			} else if( c <= 0xFFFF ) {
				this.b[this.len++] = 0xE0 | (c >> 12);
				this.b[this.len++] = 0x80 | ((c >> 6) & 63);
				this.b[this.len++] = 0x80 | (c & 63);
			} else {
				this.b[this.len++] = 0xF0 | (c >> 18);
				this.b[this.len++] = 0x80 | ((c >> 12) & 63);
				this.b[this.len++] = 0x80 | ((c >> 6) & 63);
				this.b[this.len++] = 0x80 | (c & 63);
			}
		}
	}
});

/*
 * DOM utilities
 */
 
var DOMUtils = {
	/*
	 * load events
	 */
	
	_loadEvents: [],
	_loadHandler: function () {
		if (document.readyState != 'complete')
			return;
		document.detachEvent('onreadystatechange', DOMUtils._loadHandler);
	
		for (var e = null; e = DOMUtils._loadEvents.shift(); )
			e();
		DOMUtils.addLoadEvent = function (e) { e(); };
	},
	addLoadEvent: function (e) {
		DOMUtils._loadEvents.push(e);
	},
	
	/*
	 * stylesheet
	 */
	
	_styleSheet: null,
	addCSSRules: function (a, b) {
		if (!DOMUtils._styleSheet) {
			DOMUtils._styleSheet = document.createStyleSheet();
			DOMUtils._styleSheet.cssText = '';
		}
		DOMUtils._styleSheet.cssText += a + ' { ' + b + '}';
	}
};

document.attachEvent('onreadystatechange', DOMUtils._loadHandler);

/*
 * SWF utilities
 */

var SWFUtils = {	
	generateHTML: function (id, url, width, height, swfVersion, params, css) {
		if (params) {
			for (var key in params)
				url += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&amp;';
		}
		return '\
<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"\
 codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=' + swfVersion + '"\
 width="' + width + '" height="' + height + '"' + (id ? ' id="' + id + '"' : '') + (css ? ' style="' + css + '"' : '') + '>\
  <param name="allowScriptAccess" value="always">\
  <param name="movie" value="' + url + '">\
  <param name="quality" value="high">\
  <param name="wmode" value="transparent">\
</object>';
	},
	
	// addCallbacks may not be added when first loaded, but CallMethod always works
	callMethod: function (swf, methodName, args) {
		return eval(swf.CallFunction('<invoke name="' + methodName + '" returntype="javascript">'
		    + SWFUtils._argumentsToXML(args, 0) + '</invoke>'));
	},
	callRawMethod: function (swf, methodName, args) {
		return eval(swf.CallFunction('<invoke name="' + methodName + '" returntype="javascript"><arguments>'
		    + args.join('') + '</arguments></invoke>'));
	},
	
	// these might not be available before flash loads
	_arrayToXML: function (obj) {
		var s = "<array>";
		for (var i=0; i<obj.length; i++) {
			s += "<property id=\"" + i + "\">" + SWFUtils._toXML(obj[i]) + "</property>";
		}
		return s+"</array>";
	},
	_argumentsToXML: function (obj,index) {
		var s = "<arguments>";
		for (var i=index; i<obj.length; i++) {
			s += SWFUtils._toXML(obj[i]);
		}
		return s+"</arguments>";
	},
	_objectToXML: function (obj) {
		var s = "<object>";
		for (var prop in obj) {
			s += "<property id=\"" + prop + "\">" + SWFUtils._toXML(obj[prop]) + "</property>";
		}
		return s+"</object>";
	},
	_escapeXML: function (s) {
		return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, "\"").replace(/'/g, "'");
	},
	_toXML: function (value) {
		var type = typeof(value);
		if (type == "string") {
			return "<string>" + SWFUtils._escapeXML(value) + "</string>";
		} else if (type == "undefined") {
			return "<undefined/>";
		} else if (type == "number") {
			return "<number>" + value + "</number>";
		} else if (value == null) {
			return "<null/>";
		} else if (type == "boolean") {
			return value ? "<true/>" : "<false/>";
		} else if (value instanceof Date) {
			return "<date>" + value.getTime() + "</date>";
		} else if (value instanceof Array) {
			return SWFUtils._arrayToXML(value);
		} else if (type == "object") {
			return SWFUtils._objectToXML(value);
		} else {
			return "<null/>"; //???
		}
	}
};

/*
 * initialization
 */

// IE HTML5 shiv
document.createElement('canvas');

// setup default css
DOMUtils.addCSSRules('canvas', 'display: inline-block; overflow: hidden; width: 300px; height: 150px;');

// createElement hook
var cE = document.createElement;
document.createElement = function (name) {
	var element = cE(name);
	if (name.toLowerCase() == 'canvas')
		CanvasRenderingContext2D.initCanvasElement(element);
	return element;
};

// initialize canvas elements in markup
DOMUtils.addLoadEvent(function () {
	var els = document.getElementsByTagName("canvas");
	for (var i = 0; i < els.length; i++) {
		if (!els[i].getContext)
			CanvasRenderingContext2D.initCanvasElement(els[i]);
	}
});


// cache SWF data so that object is interactive upon writing
var req = new ActiveXObject("Microsoft.XMLHTTP");
req.open('GET', SWF_URL, false);   
req.send(null);
	
/*
 * public API
 */
	
window.CanvasRenderingContext2D = CanvasRenderingContext2D;

})();