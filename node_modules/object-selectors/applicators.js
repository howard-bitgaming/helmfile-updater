import { parse } from './selector.js';

export class CollationError extends Error {}

// Helper function that handles the actual function application.
// This expects select to be a function!
function _perform(select, fn, obj, options) {
	let result = [];
	options ??= {};
	// Auto-default collation to ON for unambiguous selectors, unless otherwise specified
	options.collate ??= !select.ambiguous;
	// Translate options.mode string to numerical mode
	const mode = { 'strict': 1, 'lenient': 2 }[options?.mode?.toLowerCase()];


	let resolution = select(obj, options?.references, mode);

	if (options?.unique) {
		console.warn('Using options.unique is deprecated. Use the :unique meta property instead.');
		// If options.unique === true, default to strict equality as the comparator
		const comp = typeof options.unique === 'function' ? options.unique : (a, b) => a === b;
		// Run through the resolutions and for all selections, remove any duplicates, as determined by the comparator function.
		//
		// For this, only check items' selections that come AFTER the current one, e.g. given the following resolutions:
		//       a       b
		//     0 1 2   0   1		a0 a1 a2 b0 b2
		// 							   ^   ^
		// 							   |   |
		//				when (i,j) are here...
		// 							...start (k,l) checking from here
		for (let i = 0; i < resolution.length; i++)
			for (let j = 0; j < resolution[i].selection.length; j++)
				for (let k = i; k < resolution.length; k++) {
					for (let l = k === i ? j + 1 : 0; l < resolution[k].selection.length; l++) {
						const a = resolution[i].target[resolution[i].selection[j]];
						const b = resolution[k].target[resolution[k].selection[l]];
						if (b !== undefined && comp(a, b))
							// Just delete for now, because that is faster than repeated splicing.
							// We will remove all deleted entries at the end.
							delete resolution[k].selection[l];
					}
					resolution[k].selection = resolution[k].selection.filter(sel => sel !== undefined);
				}
	}

	for (let item of resolution)
		for (let property of item.selection) {
			const value = fn(item.target[property], property, item.target);
			// Only assign new value if it is different
			// This is important so that read operations will work even on read-only (e.g. frozen) objects
			// In read-only mode, NEVER attempt to set a new value. This is important so that dynamically generated properties
			// can still be accessed, i.e. getters that create a new object every time.
			if (!options?.readonly && value !== item.target[property])
				item.target[property] = value;
			result.push(value);
		}

	// If collating - either by default or by user choice - check that all results are equal, and if they
	// are, return their value. Otherwise throw an error.
	if (options?.collate)
		switch (result.length) {
		// Speed up the process - if there are not at least two values, there is no need to run the (potentially expensive) assessor function
		case 0: result = undefined; break;
		case 1: result = result[0]; break;
		default: {
			// The function used to calculate a value to use for equality comparison
			const assess = typeof options.collate === 'function' ? options.collate : JSON.stringify;
			// The reference value to compare all subsequent results against
			const ref = assess(result[0]);
			for (let i = 1; i < result.length; i++)
				if (assess(result[i]) !== ref)
					throw new CollationError(`Expected all results to be equal when collating for selector ${select.source} but they were not`);
			result = result[0];
		}
	}

	return result;
}

/**
 * Compiles the given `selector`. The compiled selector can be passed to `perform`, `get`, and `set` instead of the original string.
 * If you intend to re-use a given selector for multiple operations, pre-compiling it gives a performance boost.
 *
 * The returned compiled selector also has methods `perform`, `get`, and `set`, so instead of calling `get(compiledSelector, obj)` you can
 * also do `compiledSelector.get(obj)`.
 *
 * In addition, `compiledSelector.ambiguous` is a boolean flag indicating whether or not the selector is ambiguous, and `compiledSelector.source`
 * gives access to the source string the selector was compiled from.
 * @param  {string} selector The selector to compile.
 * @return {Selector}          The compiled selector.
 */
export function compile(selector) {
	const result = parse(selector);

	// Allow using compiled selector in "object form", i.e. instead of enforcing
	// get(selector, obj) also allow selector.get(obj)
	result.perform = (...args) => perform(result, ...args);
	result.get = (...args) => get(result, ...args);
	result.set = (...args) => set(result, ...args);

	return result;
}

/**
 * This is the fundamental function used to manipulate object properties with selectors.
 * In its most basic form, it takes a selector `selector`, a function `fn` and a target object `obj` and applies `fn` to all properties
 * in `obj` described by `selector`. If the result of the function application is different form the property's current value,
 * it will be updated accordingly.
 *
 * `perform` returns the results of the function application. If the used `selector` is ambiguous, the results are returned as an array.
 * If it is unambiguous, the result is returned as a scalar. `options.collate` can be used to force one behavior or the other:
 * - Setting `options.collate` to `false` will _always_ return an array, even if there is only one result.
 * - Setting `options.collate` to `true` will check that all results are deeply equal, and if they are, return their value as a scalar.
 * If the results are not all deeply equal, an error will be thrown. (Note that the function will still have been applied, though.)
 * - Setting `options.collate` to a function value will check that after applying that function to all results they are all equal. Note that
 * the function is only used for determining collation equality -- the returned results are still the same.
 *
 * _Note: In versions prior 2.0, this function was called `apply`. This has been changed to `perform` to avoid a name conflict with
 * `Function.prototype.apply` in compiled selectors._
 * @param  {string|Selector}   selector The selector describing the properties to perform the function to. This can either be a string, or
 * a {@link compile|pre-compiled selector}.
 * @param  {Function} fn       The function to perform.
 * @param  {Object}   obj      The object on whose properties to perform the function.
 * @param  {Object}   [options]  An optional object with further options for the operation
 * @param  {boolean|function}  [options.collate] Whether to collate the results or not. Defaults to `true` on unambiguous selectors, and to `false` on ambiguous ones.
 * When collating, an error is thrown if the results of applying `fn` to all selected properties are not all strictly equal in terms of their JSON representation.
 * If set to a function, this function is applied to all results, then those results are checked for (strict) equality.
 * Note that this may be quite performance heavy if a lot of properties are selected and/or the comparator is computationally expensive.
 * @param  {boolean|function} [options.unique] Whether to filter out duplicate values before applying `fn`. If set to `true`, strict equality is
 * used to compare values. Alternatively, can be set to a comparator function which will then be used to determine equality. For duplicate values,
 * only the first occurence is kept. Note that `options.unique` differs from `options.collate` in that it filters the selection _before_ the
 * function is applied.
 * Note that this may be quite performance heavy if a lot of properties are selected and/or the comparator is computationally expensive.
 * _Note: This functionality is deprecated. Use the [:unique meta property](#meta-properties) instead._
 * @param  {'normal'|'strict'|'lenient'}	[options.mode='normal'] The selection mode to use. In `normal` mode, it is permissible to select a non-existent property
 * as long as it is the terminal portion of the selector. I.e. it is permissible to select `'a'` on `{}`, but not `'a.b'`. This mode
 * mimics the ordinary rules of selecting object properties in Javascript (where `{}['a'] === undefined`).
 * In `strict` mode, any attempt to select a non-existent property immediately results in an error.
 * In `lenient` mode, non-existent properties are silently dropped.
 * The default mode is `normal`.
 * @param  {Object}  [options.references] The values for any references used in the selector.
 * @return {*}            The results of applying `fn` to all selected properties.
 */
/*
 * Undocumented option:
 * option.readonly	boolean		If true, never attempts to set a new value on the target object, regardless of whether new and old values are equal or not.
 */
export function perform(selector, fn, obj, options) {
	if (typeof selector !== 'function')
		selector = compile(selector);

	return _perform(selector, fn, obj, options);
}

/**
 * Gets the values of the properties described by `selector` from `obj`. No properties are changed.
 * Otherwise, this function follows the same rules as {@link perform}.
 * @param  {string|Selector}   selector The selector describing the properties to get. This can either be a string, or
 * a {@link compile|pre-compiled selector}.
 * @param  {Object}   obj      The object whose properties to get.
 * @param  {Object}   [options]  An optional object with further options for the operation. See {@link perform}.
 * @return {*}            The values of the selected properties.
 * @see perform
 */
export function get(selector, obj, options) {
	return perform(selector, x => x, obj, Object.assign({}, options, { readonly: true }));
}


/**
 * Sets the values of the properties described by `selector` from `obj` to `value`.
 * Otherwise, this function follows the same rules as {@link perform}.
 * @param  {string|Selector}   selector The selector describing the properties to set. This can either be a string, or
 * a {@link compile|pre-compiled selector}.
 * @param  {Object}   obj      The object whose properties to set.
 * @param  {*}		value		The new value for the properties.
 * @param  {Object}   [options]  An optional object with further options for the operation. See {@link perform}.
 * @return {*}            The new values of the selected properties. Unless collating, the length of the result gives an indication of
 * how many properties matched the selector.
 * @see perform
 */
export function set(selector, obj, value, options) {
	return perform(selector, () => value, obj, options);
}