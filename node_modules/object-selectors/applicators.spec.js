"use strict";

import { perform, get, set, compile, CollationError } from './applicators.js';
import sinon from 'sinon';
import esmock from 'esmock';

describe('perform', function() {
	let obj;

	beforeEach(function() {
		obj = {
			a: { b1: { c: 0 }, b2: { c: 1 }}
		};
	});

	it('should call the function with all matching properties', function() {
		const fn = sinon.spy();

		perform('a.b*.c', fn, structuredClone(obj));

		expect(fn).to.have.been.calledTwice;
		expect(fn).to.have.been.calledWith(obj.a.b1.c);
		expect(fn).to.have.been.calledWith(obj.a.b2.c);
	});

	it('should pass value, property, context to the function', function() {
		const fn = sinon.spy();
		const c = obj.a.b1.c;

		perform('a.b1.c', fn, obj);

		expect(fn).to.have.been.calledWith(c, 'c', sinon.match.same(obj.a.b1));
	});

	it('should set matching properties to the result value', function() {
		const fn = x => x + 1;
		const expected = structuredClone(obj);
		expected.a.b1.c = fn(obj.a.b1.c);
		expected.a.b2.c = fn(obj.a.b2.c);

		perform('a.b*.c', fn, obj);

		expect(obj).to.deep.equal(expected);
	});

	it('should not set properties that have not changed', function() {
		Object.freeze(obj.a.b1);
		Object.freeze(obj.a.b2);
		const fn = x => x;

		expect(perform.bind(null, 'a.b*.c', fn, obj)).to.not.throw();
	});

	it('should be callable with a string or a pre-compiled selector', function() {
		const selector = 'a.b*.c';
		expect(perform.bind(null, selector, x => x, obj)).to.not.throw();
		expect(perform.bind(null, compile(selector), x => x, obj)).to.not.throw();
	});

	describe('collation', function() {
		const fn = x => x + 1;

		it('should return a scalar result on an unambiguous selector when collation is not specified', function() {
			const expected = fn(obj.a.b1.c);

			expect(perform('a.b1.c', fn, obj)).to.equal(expected);
		});

		it('should return an array of all results on an ambiguous selector when collation is not specified', function() {
			const expected = [ obj.a.b1.c, obj.a.b2.c ].map(fn);

			expect(perform('a.b*.c', fn, obj)).to.deep.equal(expected);
		});

		it('should return an array on an unambiguous selector when collation is set to false', function() {
			const expected = [ obj.a.b1.c].map(fn);

			expect(perform('a.b1.c', fn, obj, { collate: false })).to.deep.equal(expected);
		});

		it('should return a scalar on an ambiguous selector when collation is set to true and all values are equal', function() {
			// Redefine so results will be equal
			const fn = () => 0;
			const expected = fn();

			expect(perform('a.b*.c', fn, obj, { collate: true })).to.equal(expected);
		});

		it('should throw when collating and not all results are equal', function() {
			expect(perform.bind(null, 'a.b*.c', fn, obj, { collate: true })).to.throw(CollationError);
		});

		it('should use the assessor function when collate is set to a function', function() {
			const assess = sinon.spy(() => 0);
			const obj = { a: 1, b: 2, c: 3 }

			expect(perform('*', fn, obj, { collate: assess }), 'should have collated to the first selected item').to.equal(fn(1));
			expect(assess).to.have.callCount(Object.values(obj).length);
			Object.values(obj).forEach(val =>
				expect(assess, `should have assessed value ${val} exactly once`).to.have.been.calledWith(val));
		});
	});

	describe('uniqueness', function() {
		it('should only use the first occurence of each value when unique is set to true', function() {
			const x = {};
			const obj = {
				a: x,
				b: x
			}
			const fn = sinon.spy(() => 0);

			perform('*', fn, obj, { unique: true });

			expect(obj).to.deep.equal({ a: 0, b: x });
			expect(fn).to.have.been.calledOnceWith(x, 'a', obj);
		});

		it('should use the comparator function to determine equality when unique is set to a function value', function() {
			const obj = {
				a: 1,
				b: 2
			}
			const comparator = sinon.spy(() => true);

			perform('*', () => 0, obj, { unique: comparator });
			expect(comparator).to.have.been.calledWith(1, 2);
			expect(obj).to.deep.equal({ a: 0, b: 2 });
		});
	});

	describe('Selection modes', function() {
		const fn = x => x + 1;

		it('should throw when selecting non-existent properties in strict mode', function() {
			expect(perform.bind(null, 'a.b.c', fn, {}, { mode: 'strict' })).to.throw();
		});

		it('should ignore non-existent properties in lenient mode', function() {
			const obj = {
				a1: { b: { c: 1 }},
				a2: { not_b: { c: 2 }}
			}
			const spy = sinon.spy(fn);
			perform('a?.b.c', spy, obj, { mode: 'lenient' });
			expect(spy).to.have.been.calledOnce.and.calledWith(1);
		});
	});
});

describe('get', function() {
	let obj;
	beforeEach(function() {
		obj = {
			a: { b1: { c: 0 }, b2: { c: 1 }}
		};
	});

	it('should get all matching properties', function() {
		expect(get('a.b*.c', obj)).to.deep.equal([ obj.a.b1.c, obj.a.b2.c ]);
	});

	it('should always be in read-only mode', function() {
		const obj = {
			// A getter property that will be different every time, i.e.
			// obj.prop !== obj.prop.
			// Without read-only mode, this would trip the change guard, because
			// strict-equality comparison would be false
			get prop() { return {} }
		}

		expect(get.bind(null, 'prop', obj)).to.not.throw();
	});
});

describe('set', function() {
	let obj;
	beforeEach(function() {
		obj = {
			a: { b1: { c: 0 }, b2: { c: 1 }}
		};
	});

	it('should set all matching properties', function() {
		const c = 5;

		expect(set('a.b*.c', obj, c)).to.deep.equal([ c, c ]);
		expect(obj.a.b1.c).to.equal(c);
		expect(obj.a.b2.c).to.equal(c);
	});
});

describe('compile', function() {
	it('should return a selector function', function() {
		const selector = compile('a.b.c');
		expect(selector).to.be.a('function');
	});

	it('should have perform(), get(), and set() methods', function() {
		const selector = compile('a.b.c');

		expect(selector).itself.to.respondTo('perform');
		expect(selector).itself.to.respondTo('get');
		expect(selector).itself.to.respondTo('set');
	});

	it('should have property source that equals the original string', function() {
		const str = 'a.b.c';
		const selector = compile(str);

		expect(selector).to.have.property('source').that.equals(str);
	});

	it('should have property ambiguous indicating whether the selector is ambiguous', function() {
		expect(compile('a.b.c')).to.have.property('ambiguous').that.is.false;
		expect(compile('a.b[x* == x].c')).to.have.property('ambiguous').that.is.false;

		expect(compile('a.b*.c')).to.have.property('ambiguous').that.is.true;
	});

	it('should not re-parse the selector after pre-compiling', async function() {
		let parse = (await import('./selector.js')).parse;
		parse = sinon.stub().callsFake(parse);
		const { get, compile } = await esmock('./applicators.js', {
			'./selector.js': { parse }
		});

		const selector = compile('*');
		expect(parse).to.have.been.calledOnce;

		get(selector, {});
		// Call count should still be 1:
		expect(parse).to.have.been.calledOnce;
	});
});