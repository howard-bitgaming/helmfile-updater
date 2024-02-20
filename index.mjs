import * as core from '@actions/core'
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import fs from 'node:fs'
import yaml from 'yaml';

const token = core.getInput('token')
const file = core.getInput('file');
const key = core.getInput('key');
const value = core.getInput('value');

try {
  const _file = fs.readFileSync(file, 'utf8')
  const target = yaml.parse(_file)
  core.debug(`object ${JSON.stringify(target)}`)
  core.debug(`set ${key} to ${value}`)

  const found = target.releases.find(({ name }) => name === key);
  if (!found) throw new Error('Key Error')
  const tagObject = found.set.find(({ name }) => name === 'image.tag');
  if (!tagObject) throw new Error('cant find image.tag')
  tagObject.value = value

  const targetYamlStr = yaml.stringify(target, 2)
  fs.writeFileSync(file, targetYamlStr)
  io.which('git').then(git => {
    exec.exec(git, ['config', 'user.name', 'github-actions']).then(() => {
      return exec.exec(git, ['config', 'user.email', 'github-actions@github.com'])
    }).then(() => {
      return exec.exec(git, ['add', file])
    }).then(() => {
      return exec.exec(git, ['commit', '-m', `set ${key} to ${value}`])
    }).then(() => {
      const basicCredential = Buffer.from(
        `x-access-token:${token}`,
        'utf8'
      ).toString('base64')
      return exec.exec(git, ['config', '--local', `http.https://github.com/.extraheader`, `AUTHORIZATION: basic ${basicCredential}`])

    }).then(() => {

      return exec.exec(git, ['push'])
    })
  })

} catch (error) {
  core.setFailed(error.message);
}
