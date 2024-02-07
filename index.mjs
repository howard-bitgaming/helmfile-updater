 import core from  '@actions/core';
 import github from  '@actions/github';

try {
    
  const repository = core.getInput('repository');
  const file = core.getInput('file');
  const branch = core.getInput('branch');
  const key = core.getInput('key');
  const value = core.getInput('value');
console.log('repository', repository)
console.log('file', file)
console.log('branch', branch)
console.log('key', key)
console.log('value', value)
const payload = JSON.stringify(github.context.payload, undefined, 2)
console.log(`The event payload: ${payload}`);

} catch (error) {
  core.setFailed(error.message);
}
