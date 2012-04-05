canvas.swf
==========

Canvas.swf is a polyfill which adds HTML5 Canvas support
to Internet Explorer 6-8. Canvas.swf is implemented in Flash, 
with wider support and faster execution than polyfills that
use VML or Silverlight.

Usage
-----

Copy `canvas.swf` and `canvas.swf.js` from the lib/ directory to your website, and simply
include the JavaScript file in your `<head>`:

    <!--[if lt IE 9]>
    <script type="text/javascript" src="path/to/canvas.swf.js"></script>
    <![endif]-->

That's it! You are now able to use and script the <canvas> element as though
it were supported natively.

License
-------

Canvas.swf is released under the MIT License.
Based on extensive work by the [FlashCanvas Project](http://flashcanvas.net).