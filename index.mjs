import * as core from '@actions/core'
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as toolCache from '@actions/tool-cache';
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const token = core.getInput('token')
const octokit = new github.getOctokit(token)
const ghURL = new URL("https://github.com")

const repository = core.getInput('repository');
const file = core.getInput('file');
const branch = core.getInput('branch');
const key = core.getInput('key');
const value = core.getInput('value');
const login = github.context.payload.repository.owner.login
const ownerURL = github.context.payload.repository.owner.html_url
try {
  const git = new gitInit(path.resolve('..'))
  git.ready.then(() => {
    // return git.exec(['clone', ownerURL + '/' + repository])
    return git.exec(['init'])
  }).then(() => {
    return git.exec(['config', '--list'])
  }).then(() => {
    return git.exec(['remote', 'add', 'origin', ownerURL + '/' + repository])
  }).then(() => {
    return git.exec(['fetch','origin'])
  })

  //https://github.com
  // downloadRepo({
  //   owner: login,
  //   repo: 'action-test-helmfile',
  //   ref: 'beta',
  //   tarFile: './helmfile-repo.tar.gz',
  //   tarFolder: './helmfile-repo'
  // }).then(repoPath => {

  // })
  // execSync(`git clone https://${token}@github.com/${login}/${repository}.git -b ${branch} ../${repository}`)




  //clone 目標專案
  //切branch
  //更該資料
  //commit push




} catch (error) {
  core.setFailed(error.message);
}

function gitInit(cwd = '.') {
  this.cwd = cwd
  const basicCredential = Buffer.from(
    `x-access-token:${token}`,
    'utf8'
  ).toString('base64')
  this.ready = io.which('git', true).then(p => {
    this.gitPath = p
    return this.exec(['config', '--global', `http.${ghURL.origin}/.extraheader`, `AUTHORIZATION: basic ${basicCredential}`])
  })
  this.exec = (args, cwd) => {
    this.cwd = cwd || this.cwd
    return exec.exec(this.gitPath, args, { cwd: this.cwd })
  }





}

function downloadRepo(opts) {
  return octokit.rest.repos.downloadTarballArchive(opts).then(resp => {
    return fs.promises.writeFile(opts.tarFile, Buffer.from(resp.data));
  }).then(() => {
    return toolCache.extractTar(opts.tarFile, opts.tarFolder)
  }).then(() => {
    return io.rmRF(opts.tarFile)
  }).then(() => {
    return fs.promises.readdir(tarFolder)
  }).then((files) => {
    return path.resolve('.', files[0])
  })
}
