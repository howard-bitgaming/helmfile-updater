import * as core from '@actions/core'
import * as github from '@actions/github';
import fs from 'node:fs'
import { execSync } from 'node:child_process'


try {
  const repository = core.getInput('repository');
  const file = core.getInput('file');
  const branch = core.getInput('branch');
  const key = core.getInput('key');
  const value = core.getInput('value');
  const token = core.getInput('token')
  const login = github.context.payload.repository.owner.login

  execSync(`git clone  https://${login}:${token}@github.com/${login}/${repository} -b ${branch} ../${repository}`)

  const files2 = fs.readdirSync('../')
  console.log('prev', files2)


  //clone 目標專案
  //切branch
  //更該資料
  //commit push




} catch (error) {
  core.setFailed(error.message);
}
