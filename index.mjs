import * as core from '@actions/core'
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as toolCache from '@actions/tool-cache';
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const token = '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' || core.getInput('token')
const octokit = new github.getOctokit(token)

const repository = core.getInput('repository');
const file = core.getInput('file');
const branch = core.getInput('branch');
const key = core.getInput('key');
const value = core.getInput('value');
const login = github.context.payload.repository.owner.login
const ownerURL = github.context.payload.owner.html_url
try {
  const git = new gitInit()
  git.exec(['git', 'clone', ownerURL + '/' + repository])
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

function gitInit() {
  const basicCredential = Buffer.from(
    `x-access-token:${token}`,
    'utf8'
  ).toString('base64')
  this.gitPath = io.which('git')
  this.exec = (args, cwd) => {
    this.cwd = cwd
    return this.ready().then(() => exec.exec(gitPath, args, { cwd }))
  }
  this.ready = this.exec(['config', '--global', '--add', 'http.https://github.com/.extraheader', `AUTHORIZATION: basic ${basicCredential}`])
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
