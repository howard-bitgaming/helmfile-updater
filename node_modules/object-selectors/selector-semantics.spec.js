import { parse } from './selector.js';
import sinon from 'sinon';

describe('Selector semantics', function() {
	const MODE_NORMAL = 0;
	const MODE_STRICT = 1;
	const MODE_LENIENT = 2;

	describe('Simple selectors', function() {
		it('should select the root object with an empty selector', function() {
			sinon.stub(console, 'warn'); // Disable deprecation warning from showing
			try {
				const key = '';
				const obj = {};

				const resolution = parse(key)(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.deep.equals({ obj });
				expect(resolution[0]).to.have.property('selection').that.is.an('array').with.members([ 'obj' ]);
			} finally {
				console.warn.restore();
			}
		});

		it('should select a property by name', function() {
			const key = 'a';
			const obj = {};

			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.is.an('array').with.members([ key ]);
		});

		it('should select inherited properties', function() {
			const key = 'a';
			const obj = Object.create({});

			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.is.an('array').with.members([ key ]);
		});
	});

	describe('Accessor selectors', function() {
		it('should change the targets to the selected properties', function() {
			const key = 'a.b';
			const obj = { a: {} };

			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj.a);
		});
	});

	describe('Wildcard selectors', function() {
		it('should select all properties with matching names (asterisk)', function() {
			const key = 'a*';
			const obj = { a1: {}, a2: {}, b: {}, abc: {} };

			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.has.members([ 'a1', 'a2', 'abc' ]);
		});

		it('should select all properties with matching names (question mark)', function() {
			const key = 'a?';
			const obj = { a1: {}, a2: {}, b: {}, abc: {} };

			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.has.members([ 'a1', 'a2' ]);
		});

		it('should select inherited properties', function() {
			const key = 'a?';
			const obj = Object.create({ a1: {}, a2: {} });

			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.has.members([ 'a1', 'a2' ]);
		});

		it('should not select non-enumerable properties', function() {
			const key = 'a?';
			const obj = {};
			Object.defineProperty(obj, 'a1', {
				value: {},
				enumerable: false,
				configurable: true,
				writable: true
			});

			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.is.empty;
		});
	});

	describe('Pseudo properties', function() {
		describe('::root', function() {
			it('should select the input object with', function() {
				const obj = { a: {} };

				[ '::root', 'a.::root' ].forEach(key => {
					const resolution = parse(key)(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.deep.equals({ '::root': obj });
					expect(resolution[0]).to.have.property('selection').that.has.members([ '::root' ]);
				});
			});
		});

		// eslint-disable-next-line mocha/no-setup-in-describe
		[ 'first', 'last' ].forEach((pseudo, index) => {
			describe(`::${pseudo}`, function() {
				it(`should select the ${pseudo} element of an array`, function() {
					const obj = [ 0, 1 ];

					const resolution = parse(`::${pseudo}`)(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					expect(resolution[0]).to.have.property('selection').that.has.members([ String(index) ]);
				});

				it(`should select the ${pseudo} property of an object`, function() {
					const obj = { a: 1, b: 2 };

					const resolution = parse(`::${pseudo}`)(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					expect(resolution[0]).to.have.property('selection').that.has.members([ 'ab'[index] ]);
				});

				it(`should select the ${pseudo} character of a string`, function() {
					const obj = 'ab';

					const resolution = parse(`::${pseudo}`)(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					// Object keys are ordered in the order they are defined:
					expect(resolution[0]).to.have.property('selection').that.has.members([ String(index) ]);
				});

				it('should select nothing on anything else', function() {
					const obj = 1;

					const resolution = parse(`::${pseudo}`)(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					// Object keys are ordered in the order they are defined:
					expect(resolution[0]).to.have.property('selection').that.is.empty;
				});
			});
		});
	});

	describe('Meta properties', function() {
		// eslint-disable-next-line mocha/no-setup-in-describe
		const PRIMITIVES = [ 'string', 123, 123n, true, undefined, Symbol(), null ]

		// eslint-disable-next-line mocha/no-setup-in-describe
		describe(`${new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(PRIMITIVES.map(primitive => primitive === null ? 'null' : typeof primitive).map(metaProperty => `:${metaProperty}`))}`, function() {
			it('should select primitives of the given type', function() {
				PRIMITIVES.forEach(primitive => {
					const obj = { a: primitive }

					const resolution = parse(`*:${primitive === null ? 'null' : typeof primitive}`)(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
				});
			});

			it('should discard all other values', function() {
				PRIMITIVES.forEach(primitive => {
					const others = [ {}, [], ...PRIMITIVES.filter(x => x !== primitive) ];

					others.forEach(other => {
						const obj = { a: other };

						const resolution = parse(`*:${primitive === null ? 'null' : typeof primitive}`)(obj);

						expect(resolution).to.be.an('array').with.lengthOf(1);
						expect(resolution[0]).to.have.property('target').that.equals(obj);
						expect(resolution[0]).to.have.property('selection').that.is.empty;
					});
				});
			});
		});

		describe(':primitive', function() {
			it(`should select values of type ${new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(PRIMITIVES.map(primitive => primitive === null ? 'null' : typeof primitive))}`, function() {
				PRIMITIVES.forEach(primitive => {
					const obj = { a: primitive }

					const resolution = parse('*:primitive')(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
				});
			});

			it('should discard values of type object', function() {
				const obj = { a: {} }

				const resolution = parse('*:primitive')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.is.empty;
			});
		});

		describe(':object', function() {
			it('should select values of type object', function() {
				const obj = { a: {} }

				const resolution = parse('*:object')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
			});

			it('should not select primitives', function() {
				PRIMITIVES.forEach(primitive => {
					const obj = { a: primitive }

					const resolution = parse('*:object')(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					expect(resolution[0]).to.have.property('selection').that.is.empty;
				});
			});

			it('should not select arrays', function() {
				const obj = { a: [] }

				const resolution = parse('*:object')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.is.empty;
			});
		});

		describe(':array', function() {
			it('should select values of type array', function() {
				const obj = { a: [] }

				const resolution = parse('*:array')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
			});

			it('should not select objects or primitives', function() {
				[ {}, ...PRIMITIVES ].forEach(objectOrPrimitive => {
					const obj = { a: objectOrPrimitive }

					const resolution = parse('*:array')(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					expect(resolution[0]).to.have.property('selection').that.is.empty;
				});
			});
		});

		describe(':complex', function() {
			it('should select values of type array', function() {
				const obj = { a: [] }

				const resolution = parse('*:complex')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
			});

			it('should select values of type object', function() {
				const obj = { a: {} }

				const resolution = parse('*:complex')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
			});

			it('should not select primitives', function() {
				PRIMITIVES.forEach(primitive => {
					const obj = { a: primitive }

					const resolution = parse('*:complex')(obj);

					expect(resolution).to.be.an('array').with.lengthOf(1);
					expect(resolution[0]).to.have.property('target').that.equals(obj);
					expect(resolution[0]).to.have.property('selection').that.is.empty;
				});
			});
		});

		describe(':existent', function() {
			it('should select values other than null/undefined', function() {
				const obj = { a: null, b: undefined, c: 1 }

				const resolution = parse('*:existent')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'c' ]);
			});
		});

		describe(':nonexistent', function() {
			it('should select only values null/undefined', function() {
				const obj = { a: null, b: undefined, c: 1 }

				const resolution = parse('*:nonexistent')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a', 'b' ]);
			});
		});

		describe(':unique', function() {
			it('should filter out values that are present more than once', function() {
				const obj = {
					a: 1,
					b: 1
				}

				const resolution = parse('*:unique')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
			});

			it('should not filter out values that are present only once', function() {
				const obj = {
					a: 1,
					b: 2
				}

				const resolution = parse('*:unique')(obj);

				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a', 'b' ]);
			});
		});
	});

	describe('Conditional selectors', function() {
		it('should select with complex selectors in conditions', function() {
			const obj = {
				a1: {
					b: {
						c1: 0
					}
				},
				a2: {
					b: {
						cde: 1
					}
				},
				b: {},
				abc: {
					b: {
						cdef: 2
					}
				}
			};
			// Select all properties starting with the letter a that have a property b with a sub-property
			// starting with c and ending with f that has the value 2
			const key = 'a*[b.c*f == 2]';
			const resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.has.members([ 'abc' ]);
		});

		it('should select only properties with a truthy value for a unary condition', function() {
			const key = 'a[b]';

			let obj = { a: { b: 1 } };

			// Condition satisfied:
			let resolution = parse(key)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);

			// Condition not satisfied:
			obj.a.b = 0;
			resolution = parse(key)(obj);
			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.is.empty;
		});

		// The following tests are auto-generated to test all recognized condition operators.
		// The condition is generated as [b <operator> <value>].
		// A positive test is generated by setting obj.a.b to satisifed, a negative test is
		// generated by setting obj.a.b to violated.
		// If value is not supplied, it is set to the value of satisfied.
		// eslint-disable-next-line mocha/no-setup-in-describe
		[
			{ operator: '==', meaning: 'loosely equal to', satisfied: 1, violated: 2 },
			{ operator: '===', meaning: 'strictly equal to', satisfied: '1', violated: 1 },
			{ operator: '!==', meaning: 'not strictly equal to', satisfied: 1, violated: '1' },
			{ operator: '!=', meaning: 'not loosely equal to', satisfied: 2, violated: 1, value: 1 },
			{ operator: '^=', meaning: 'beginning with', satisfied: 'xyz', violated: 'zyx', value: 'x' },
			{ operator: '$=', meaning: 'ending with', satisfied: 'xyz', violated: 'zyx', value: 'z' },
			{ operator: '~=', meaning: 'matching the regex of', satisfied: 'abba', violated: 'aa', value: 'ab\\+a' },
			{ operator: '<', meaning: 'strictly less than', satisfied: 'a', violated: 'b', value: 'b' },
			{ operator: '<=', meaning: 'less than or equal to', satisfied: 'a', violated: 'c', value: 'b' },
			{ operator: '>', meaning: 'strictly greater than', satisfied: 'c', violated: 'b', value: 'b' },
			{ operator: '>=', meaning: 'greater than or equal', satisfied: 'c', violated: 'a', value: 'b' },
		].forEach(({ operator, meaning, satisfied, violated, value }) =>
			it(`should select only properties with a value ${meaning} the value of the condition with ${operator}`, function() {
				value ??= satisfied;

				const key = `a[b ${operator} ${value}]`;

				let obj = { a: { b: satisfied } };

				// Condition satisfied:
				let resolution = parse(key)(obj);
				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);

				// Condition not satisfied:
				obj.a.b = violated;
				resolution = parse(key)(obj);
				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.is.empty;
			})
		);

		it('should replace the value in a reference value', function() {
			const references = { val: 'abc' };
			const obj = { a: { b: references.val }};

			const resolution = parse('a[b === @val]')(obj, references);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.has.members([ 'a' ]);
		});

		it('should combine multiple conditions with logical and', function() {
			const obj = { a1: { b: 'x', c: 'y' }, a2: { b: 'x', c: 'not y' }};

			const resolution = parse('a*[b===x][c===y]')(obj);

			expect(resolution).to.be.an('array').with.lengthOf(1);
			expect(resolution[0]).to.have.property('target').that.equals(obj);
			expect(resolution[0]).to.have.property('selection').that.has.members([ 'a1' ]);
		});
	});

	describe('Selection modes', function() {
		describe('Normal mode', function() {
			it('should not throw when selecting a non-existing property that is the terminal part of its selector', function() {
				const parser = parse('a');
				expect(parser.bind(null, {}, null, MODE_NORMAL)).to.not.throw();
			});

			it('should throw when selecting a non-existing property that is an intermediate part of the selector', function() {
				expect(parse('a.b.c').bind(null, {}, null, MODE_NORMAL)).to.throw();

				// There is another, slightly more complex case here: when selecting a.b on {}, parse will actually NOT throw,
				// but return a resolution with an undefined target.
				// (Trying to work with that resolution however will invariable throw.)
				const parser = parse('a.b');
				expect(parser.bind(null, {}, null, MODE_NORMAL)).to.not.throw();

				const resolution = parser({}, null, MODE_NORMAL);
				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0].target).to.not.exist;
			});

			it('should not error but resolve to a non-existent target when trying to select unambiguously on null/undefined', function() {
				[ null, undefined ].forEach(tgt => {
					// Helper function that invokes the parser, then executes the selection
					// This ensures that even if the parser itself doesn't throw, the selection step will
					function invoke(parser) {
						return parser().flatMap(({ tgt, selection }) => selection.flatMap(prop => tgt[prop]));
					}

					expect(invoke.bind(null, parse('a').bind(null, tgt, null, MODE_NORMAL))).to.throw();
					expect(invoke.bind(null, parse('*').bind(null, tgt, null, MODE_NORMAL))).to.throw();
				});
			});
		});

		describe('Strict mode', function() {
			it('should throw an error when selecting a non-existing property', function() {
				expect(parse('a').bind(null, {}, null, MODE_STRICT)).to.throw();
			});

			it('should throw an error when no properties match a wildcard selector' , function() {
				expect(parse('a*').bind(null, {}, null, MODE_STRICT)).to.throw();
			});

			it('should throw an error when a condition uses a non-existent property', function() {
				const obj = {
					a1: { b: { c: 1 }},
					a2: { not_b: { c: 1 }}
				}

				expect(parse('a?[b.c == 1]').bind(null, obj, null, MODE_STRICT)).to.throw();
			});

			it('should throw when the target of the resolution in a conditional selection is a literal', function() {
				const obj = {
					a1: { b: { c: 1 }},
					a2: { b: 'literal' }
				}
				expect(parse('a?[b.c == 1 ]').bind(null, obj, null, MODE_STRICT)).to.throw();
			});

			it('should throw an error when trying to select on null/undefined', function() {
				[ null, undefined ].forEach(tgt => {
					expect(parse('a').bind(null, tgt, null, MODE_STRICT), `unambiguous on ${tgt}`).to.throw();
					expect(parse('*').bind(null, tgt, null, MODE_NORMAL), `ambiguous on ${tgt}`).to.throw();
				});
			});
		});

		describe('Lenient mode', function() {
			it('should ignore intermediate non-matches when selecting unambiguously', function() {
				expect(parse('a.b')({}, {}, MODE_LENIENT)).to.be.empty;
			});

			it('should silently discard intermediate non-matches when selecting with wildcards', function() {
				const obj = {
					a1: { b: { c: 1 }},
					a2: { not_b: { c: 2 }}
				}

				const parser = parse('a?.b.c');
				expect(parser.bind(null, obj, null, MODE_LENIENT)).to.not.throw();

				const resolution = parser(obj, null, MODE_LENIENT);
				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj.a1.b);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'c' ]);
			});

			it('should evaluate a condition using non-existent properties to false', function() {
				const obj = {
					a1: { b: { c: 1 }},
					a2: { not_b: { c: 1 }}
				}

				const parser = parse('a?[b.c == 1 ]');
				expect(parser.bind(null, obj, null, MODE_LENIENT)).to.not.throw();

				const resolution = parser(obj, null, MODE_LENIENT);
				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a1' ]);
			});

			it('should silently discard conditional selections where the target of the resolution is a literal', function() {
				const obj = {
					a1: { b: { c: 1 }},
					a2: { b: 'literal' }
				}

				const parser = parse('a?[b.c == 1 ]');
				expect(parser.bind(null, obj, null, MODE_LENIENT)).to.not.throw();

				const resolution = parser(obj, null, MODE_LENIENT);
				expect(resolution).to.be.an('array').with.lengthOf(1);
				expect(resolution[0]).to.have.property('target').that.equals(obj);
				expect(resolution[0]).to.have.property('selection').that.has.members([ 'a1' ]);
			});

			it('should silently discard selections made on null/undefined', function() {
				[ null, undefined ].forEach(tgt => {
					let parser = parse('a');
					const args = [ tgt, null, MODE_LENIENT ];
					expect(parser.bind(null, ...args), `unambiguous on ${tgt}`).to.not.throw();
					expect(parser(...args)).to.be.empty;

					parser = parse('*');
					expect(parser.bind(null, ...args), `ambiguous on ${tgt}`).to.not.throw();
					expect(parser(...args)).to.be.empty;
				});
			});
		});
	});

	describe('Selector Union', function() {
		it('should return the concatenated results of all constituent selectors', function() {
			const selector = `a1, a2`;

			const obj = { a1: {}, a2: {}, b: {}, abc: {} };


			const resolution = parse(selector)(obj);

			expect(resolution).to.be.an('array').with.lengthOf(2);
			resolution.forEach((res, i) => {
				const sel = [ 'a1', 'a2' ][i];
				expect(res).to.have.property('target').that.equals(obj);
				expect(res).to.have.property('selection').that.has.members([ sel ]);
			});
		});
	});
});