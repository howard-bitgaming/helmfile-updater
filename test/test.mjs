import { set ,get} from 'object-selectors';
import yaml from 'yaml';
import fs from 'node:fs'

const file = fs.readFileSync('./test/test.yml', 'utf8')
const key = 'releases.*[name $= frontend].set.*[name === image\\.tag].value'
const  value =  "1.234.1"

const target = yaml.parse(file)

set(key,target,value)
const targetYamlStr = yaml.stringify(target)
fs.writeFileSync('./test/res.yaml',targetYamlStr)
