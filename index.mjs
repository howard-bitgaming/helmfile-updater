import * as core from '@actions/core'
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as toolCache from '@actions/tool-cache';
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { set } from 'object-selectors';
import yamljs from 'yamljs';

const token = core.getInput('token')
const octokit = new github.getOctokit(token)
const file = core.getInput('file');
const key = core.getInput('key');
const value = core.getInput('value');

try {
  const target = yamljs.load(file)
  core.debug(`object ${JSON.stringify(target)}`)
  core.debug(`set ${key} to ${value}`)
  set(key,target, value)
  const targetYamlStr = yamljs.stringify(target, 2)
  fs.writeFileSync(file,targetYamlStr)
  io.which('git').then(git=>{
    exec.exec(git,['config', 'user.name', 'github-actions']).then(()=>{
      return exec.exec(git,['config', 'user.email', 'github-actions@github.com'])
    }).then(()=>{
      return exec.exec(git,['add', '.'])
    }).then(()=>{
      return exec.exec(git,['commit', '-m',`set ${key} to ${value}`])
    }).then(()=>{
      return exec.exec(git,['push'])
    })
  })
  
} catch (error) {
  core.setFailed(error.message);
}
