import * as core from '@actions/core'
import * as github from '@actions/github';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as toolCache from '@actions/tool-cache';
import fs from 'node:fs'
import { execSync } from 'node:child_process'


try {
  const repository = core.getInput('repository');
  const file = core.getInput('file');
  const branch = core.getInput('branch');
  const key = core.getInput('key');
  const value = core.getInput('value');
  const token = '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' || core.getInput('token')
  const login = 'howard-bitgaming' || github.context.payload.repository.owner.login
  const octokit = new github.getOctokit(token)
  octokit.rest.repos.downloadZipballArchive({
    owner: login,
    repo: 'action-test-helmfile',
    ref: 'beta',
  }).then(resp => {
    fs.appendFile('../a.zip', Buffer.from(resp.data), function (err) {
      if (err) {
        console.log('err', err)
      } else {
        toolCache.extractZip('../a','../')
      }
    });
  })
  // execSync(`git clone https://${token}@github.com/${login}/${repository}.git -b ${branch} ../${repository}`)




  //clone 目標專案
  //切branch
  //更該資料
  //commit push




} catch (error) {
  core.setFailed(error.message);
}
