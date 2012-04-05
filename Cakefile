fs = require 'fs'
jsp = require("uglify-js").parser
pro = require("uglify-js").uglify
spawn = require("child_process").spawn

task 'build:swf', 'compile swf', (options) ->
	mxmlc = spawn("mxmlc", ["src/flash/CanvasSwf.as", "-output", "bin/canvas.swf"])
	mxmlc.stdout.on 'data', (data) -> process.stdout.write data.toString()
	mxmlc.stderr.on 'data', (data) -> process.stdout.write data.toString()
	mxmlc.on 'exit', (code, signal) -> console.log 'Compilation finished with signal ' + signal

task 'build:js', 'compress JavaScript source', (options) ->
	code = fs.readFileSync('src/javascript/canvas.swf.js').toString()
	ast = jsp.parse(code)
	ast = pro.ast_mangle(ast)
	ast = pro.ast_squeeze(ast)
	out = pro.gen_code(ast)
	fs.writeFileSync 'bin/canvas.swf.js', out
	console.log "src/javascript/canvas.swf.js (#{code.length} bytes) -> bin/canvas.swf.js (#{out.length} bytes)"