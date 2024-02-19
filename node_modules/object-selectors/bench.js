import Benchmark from 'benchmark';
import { get, compile } from './applicators.js';
import easyobjectselector from 'easy-object-selector';
import objectpath from 'object-path';
import * as dotprop from 'dot-prop';
import * as pathval from 'pathval';
import getvalue from 'get-value';

const selector = 'a.b.c.d';
const compiled = compile(selector);
const obj = { a: { b: { c: { d: 2 } } } }

new Benchmark.Suite('object-selectors vs. easy-object-selector')
	.add('object-selectors (string)', function() {
		get(selector, obj)
	})
	.add('object-selectors (pre-compiled)', function() {
		get(compiled, obj)
	})
	.add('object-selectors (pre-compiled, no collation)', function() {
		get(compiled, obj, { collate: false })
	})
	.add('easy-object-selector', function() {
		easyobjectselector.select(obj, selector);
	})
	.add('object-path', function() {
		objectpath.get(obj, selector);
	})
	.add('dot-prop', function() {
		dotprop.getProperty(obj, selector);
	})
	.add('pathval', function() {
		pathval.getPathValue(obj, selector);
	})
	.add('getvalue', function() {
		getvalue(obj, selector);
	})
	.on('cycle', function(event) {
		const links = {
			'easy-object-selector': 'https://github.com/deltavi/easy-object-selector',
			'object-path': 'https://github.com/mariocasciaro/object-path',
			'dot-prop': 'https://github.com/sindresorhus/dot-prop',
			'pathval': 'https://github.com/chaijs/pathval',
			'getvalue': 'https://github.com/jonschlinkert/get-value'
		}
		// Replace competitors with markdown links
		if (event.target.name in links)
			event.target.name = `[${event.target.name}](${links[event.target.name]})`;
		console.log(String(event.target)
			// Replace " x ", if followed immediately by a digit, with " | "
			.replace(/ x (?=\d)/, ' | '));
	})
	.on('complete', function() {
		console.log('Fastest is ' + this.filter('fastest').map('name'));
	})
	.run();
