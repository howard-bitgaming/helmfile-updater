import * as core from '@actions/core'
import * as github from '@actions/github';
import fs from 'node:fs'
import { execSync } from 'node:child_process'


try {
  const repository = core.getInput('repository');
  execSync(`git clone ${github.context.payload.repository.owner.html_url}/${repository} ../`)

  const files = fs.readdirSync('./')
  console.log('current', files)
  const files2 = fs.readdirSync('../')
  console.log('prev', files2)

  const file = core.getInput('file');
  const branch = core.getInput('branch');
  const key = core.getInput('key');
  const value = core.getInput('value');

  //clone 目標專案
  //切branch
  //更該資料
  //commit push

  console.log('repository', repository)
  console.log('file', file)
  console.log('branch', branch)
  console.log('key', key)
  console.log('value', value)


} catch (error) {
  core.setFailed(error.message);
}
