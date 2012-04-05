/*
 * canvas.swf
 *
 * Copyright (c) 2009, 2012 Tim Cameron Ryan
 * Copyright (c) 2009-2011 CanvasSwf Project
 * Licensed under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * @author Shinya Muramatsu
 */

package io.tcr.canvasswf
{
    import flash.display.Graphics;

    public class Path
    {
        private var commands:Array;
        private var data:Array;

        public function Path()
        {
            initialize();
        }

        public function clone():Path
        {
            var path:Path = new Path();
            path.commands = commands.concat();
            path.data     = data.concat();
            return path;
        }

        public function initialize():void
        {
            commands = [];
            data     = [];
        }

        public function get length():int
        {
            return commands.length;
        }

        public function moveTo(x:Number, y:Number):void
        {
            commands.push(GraphicsPathCommand.MOVE_TO);
            data.push(x, y);
        }

        public function lineTo(x:Number, y:Number):void
        {
            commands.push(GraphicsPathCommand.LINE_TO);
            data.push(x, y);
        }

        public function curveTo(controlX:Number, controlY:Number,
                                 anchorX:Number,  anchorY:Number):void
        {
            commands.push(GraphicsPathCommand.CURVE_TO);
            data.push(controlX, controlY, anchorX, anchorY);
        }

        public function draw(graphics:Graphics):void
        {
            var cpx:Number;
            var cpy:Number;
            var   x:Number;
            var   y:Number;

            var i:int = 0;
            var j:int = 0;
            var n:int = commands.length;

            for (i = 0; i < n; i++)
            {
                var command:int = commands[i];

                switch (command)
                {
                    case GraphicsPathCommand.MOVE_TO:
                    {
                        x = data[j++];
                        y = data[j++];
                        graphics.moveTo(x, y);
                        break;
                    }

                    case GraphicsPathCommand.LINE_TO:
                    {
                        x = data[j++];
                        y = data[j++];
                        graphics.lineTo(x, y);
                        break;
                    }

                    case GraphicsPathCommand.CURVE_TO:
                    {
                        cpx = data[j++];
                        cpy = data[j++];
                        x   = data[j++];
                        y   = data[j++];
                        graphics.curveTo(cpx, cpy, x, y);
                        break;
                    }
                }
            }
        }
    }
}
